const { server, driver, io, app } = require("./config.js")
const argon2 = require('argon2')
const { v4 } = require("uuid")
const uuid = v4

server.listen(process.env.PORT, () =>{
    console.log(`Server running on ${process.env.PORT}`)
})

io.on("connection", async (socket) =>{

    if (!socket.request.session.user) return socket.disconnect()

    const chatId = socket.handshake.query.chatId
    const userId = socket.request.session.user.uId

    const session = driver.session()

    try {
        const query = `
            MATCH (:User {uId: $userId}) - [:PARTICIPATING] -> (c:Chat {uId: $chatId}) <- [:SENT_IN_CHAT] - (m:Message) <- [:SENT] - (u:User)
            RETURN u, m
            ORDER BY m.date
        `
        const result = await session.executeRead(async tx => tx.run(query, {userId: userId, chatId: chatId}))

        const messages = []
        for (const record of result.records){
            const message = record.get('m').properties
            const user = record.get('u').properties
            messages.push([user, message])
        }

        socket.join(chatId)
        io.to(chatId).emit("joined", `joined room ${chatId}`)

        socket.emit("load", messages)
    } catch(e) {
        console.error(e)
    } finally {
        await session.close()
    }

    socket.on("message", async (message) =>{
        
        const session = driver.session()

        try{
            const query = `
                MATCH (user:User {uId: $userId}), (c:Chat {uId: $chatId})
                CREATE (user) - [:SENT] -> (message:Message {uId: $uId, text: $text, date: $date, userId: $userId}) - [:SENT_IN_CHAT] ->(c)
                RETURN user, message
            `
            const result = await session.executeWrite(async tx => tx.run(query, {userId: message.userId, uId: uuid(), text: message.text, date: Date.now(), chatId: message.chatId}))
            const record = result.records[0]
            const newMessage = [record.get('user').properties, record.get('message').properties]

            io.to(chatId).emit("new-message", newMessage)
        } catch(e){
            console.error(e)
        } finally {
            await session.close()
        }
    })

    socket.on("disconnecting", () =>{
        // console.log(socket.rooms)
    })

    socket.on("disconnect", (reason) =>{
        // console.log(reason)
        // console.log(socket.rooms.size)
    })
})

app.post("/login", async (req, res) =>{
    const {email, password} = req.body
    const session = driver.session()
    try {
        const query = 'MATCH (user:User {email: $email}) RETURN user'

        const result = await session.executeRead( async tx => tx.run(query, {email: email}))

        const user = result.records[0].get("user").properties

        const authenticated = await argon2.verify(user.password, password)
        
        if(authenticated) {
            req.session.user = {
                name: user.name,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                profileImg: user.profileImg,
                uId: user.uId
            }
            res.status(200).send(req.session.user)
        } else {
            res.status(401).send({error: "unauthorized"})
        }
    } catch (e){
        console.error(e)

        res.status(500).send({error: "internal server error"})
    } finally {
        await session.close()
    }
})

app.delete("/logout", async (req, res) =>{
    console.log("logging out")
    req.session.destroy(err =>{
        console.log("destroying session")
        if (err){
            res.status(500).end()
        } else {
            res.status(204).end()
        }
    })
})

app.get("/me", (req, res) =>{
    if (req.session.user){
        res.status(200).send(req.session.user)
    } else {
        res.status(401).send({error: "unauthorized"})
    }
})

app.post("/new-account", async (req, res) => {
    console.log(req.body)
    const session = driver.session()
    try {
        const password = await argon2.hash(req.body.password)
        const user = await session.executeWrite(async tx =>{
            const existingUser = await tx.run(`
                MATCH (u:User {email: $email}) RETURN u
            `, {email: req.body.email})
            if (existingUser.records.length !== 0){
                return "already exists"
            }

            const newUser = await tx.run(`
            CREATE (u:User {email: $email, password: $password, name: $name, firstName: $firstName, lastName: $lastName, profileImg: $profileImg, uId: $uId})
            RETURN u.email AS email, u.name AS name, u.firstName AS firstName, u.lastName AS lastName, u.profileImg AS profileImg, u.uId AS uId
            `, {
                email: req.body.email,
                password: password,
                name: req.body.name,
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                profileImg: req.body.profileImg,
                uId: uuid()
            })
            const newUserRecord = newUser.records[0]
            return {
                email: newUserRecord.get("email"),
                name: newUserRecord.get("name"),
                firstName: newUserRecord.get("firstName"),
                lastName: newUserRecord.get("lastName"),
                profileImg: newUserRecord.get("profileImg"),
                uId: newUserRecord.get("uId")
            }
        })
        if (user === "already exists"){
            res.status(422).send({error: "email already in use"})
        } else{
            req.session.user = user
            console.log(req.session.user)
            res.status(201).send(user)
        }
    } catch(e){
        console.error(e)
        res.status(500).send({error: "internal server error"})
    }finally {
       await session.close()
    }
})

app.get("/my-chats", async (req, res) =>{
    if (!req.session.user) return res.status(401).send({error: "unauthorized"})

    const session = driver.session()
    try {
        const userId = req.session.user.uId
        const query = "MATCH (:User {uId: $userId}) - [:PARTICIPATING] -> (chat:Chat) <- [:PARTICIPATING] - (user:User) RETURN chat, user"
        const result = await session.executeRead(tx => tx.run(query, {userId: userId}))
        
        const chatHash = {}

        for (const record of result.records){
            const chat = record.get('chat').properties
            const user = record.get('user').properties
            if (!chatHash[chat.uId]) chatHash[chat.uId] = []
            chatHash[chat.uId].push(user)
        }

        res.status(200).send(chatHash)
    } catch (e){
        console.error(e)
        res.status(500).send({error: "internal server error"})
    } finally {
        await session.close()
    }
})

app.post("/new-chat", async(req, res) =>{
    if (!req.session.user) return res.status(401).send({error: "unauthorized"})
    
    console.log(req.body.participants)
    const participants = [...req.body.participants, req.session.user]
    const uIds = participants.map(participant => participant.uId)
    console.log(req.session.user.uId)
    console.log(uIds)
    const session = driver.session()
    try {
        const result = await session.executeWrite(async tx =>{

            const existingChat = await tx.run(`
                MATCH (:User {uId: $userId}) -[:PARTICIPATING] ->(chat:Chat)
                WITH chat, COLLECT {MATCH (p:User) -[:PARTICIPATING] ->(chat:Chat) RETURN (p.uId)} AS participants
                WHERE all(participant IN participants WHERE participant IN $uIds)
                RETURN chat, participants
            `, {uIds: uIds, userId: req.session.user.uId})
            
            if (existingChat.records.length !== 0){
                console.log(existingChat.records[0].get('chat').properties, existingChat.records[0].get('participants'))
                return existingChat.records[0].get('chat').properties
            }

            const newChat = await tx.run(`
                CREATE (c:Chat {uId: $chatId})
                WITH c
                UNWIND $uIds AS participantId
                MATCH (u:User {uId: participantId})
                CREATE (u) - [:PARTICIPATING] -> (c)
                RETURN c AS chat
            `, {uIds: uIds, userId: req.session.user.uId, chatId: uuid()})

            return newChat.records[0].get("chat").properties
        })
        res.status(200).send(result)
    } catch(e) {
        console.error(e)
        res.status(500).send({error: "internal server error"})
    } finally {
        await session.close()
    }
})

app.get("/my-connections", async(req, res) =>{
    if (!req.session.user) return res.status(401).send({error: "unauthorized"})

    const user = req.session.user
    const session = driver.session()

    try {
        const query = `
            MATCH (user:User {uId: $userId}) - [:CONNECTED] - (c:User)
            RETURN c AS connection
        `
        const result = await session.executeRead(tx => tx.run(query, {userId: user.uId}))
        
        const connections = []

        for (const record of result.records){
            connections.push(record.get("connection").properties)
        }

        res.status(200).send(connections)
    } catch(e) {
        console.error(e)
        res.status(500).send({error: "internal server error"})
    } finally {
        await session.close()
    }
})

app.get("/search-connections/:name", async (req, res) =>{
    if (!req.session.user) return res.status(401).send({error: "unauthorized"})
    
    const name = req.params.name
    const userId = req.session.user.uId
    console.log(userId)
    const session = driver.session()

    try {
        const query = `
            MATCH (u:User {uId: $userId}) - [:CONNECTED] - (:User) - [:CONNECTED] -(c:User)
            WHERE c.name STARTS WITH $name
            AND NOT (c) - [:CONNECTED] - (u)
            AND u <> c
            RETURN c.uId AS uId, c.name AS name
            UNION
            MATCH (c:User), (u:User {uId: $userId})
            WHERE c.name STARTS WITH $name
            AND NOT (c) - [:CONNECTED] - (u)
            AND c <> u
            RETURN c.uId AS uId, c.name AS name
        `
        const result = await session.executeRead(tx => tx.run(query, {name: name, userId: userId}))
        
        const searchResults = []
        for(const record of result.records){
            const user = {
                uId: record.get("uId"),
                name: record.get("name")
            }
            searchResults.push(user)
        }

        res.status(200).send(searchResults)
    } catch(e) {
        console.error(e)
        res.status(500).send({error: "internal server error"})
    }
})

app.post("/invite-connection", async (req, res) =>{
    if (!req.session.user) return res.status(401).send({error: "unauthorized"})

    const {connectionId} = req.body
    const userId = req.session.user.uId
    const session = driver.session()
    
    try {
        const query = `
            MATCH (u:User {uId: $userId}), (c:User {uId: $connectionId})
            MERGE (u) - [i:INVITED] -> (c)
            RETURN i
        `
        await session.executeWrite(tx => tx.run(query, {userId: userId, connectionId: connectionId}))

        res.status(201).end()
    } catch(e){
        console.error(e)
        res.status(500).send({error: "internal server error"})
    } finally {
        await session.close()
    }
})

app.post("/accept-invitation", async (req, res) =>{
    if (!req.session.user) return res.status(401).send({error: "unauthorized"})

    const {connectionId} = req.body
    const userId = req.session.user.uId
    const session = driver.session()
    try {
        const query = ` 
            MATCH (s:User {uId: $userId}) - [i:INVITED] - (u:User {uId: $connectionId})
            DELETE i
            MERGE (s) - [c:CONNECTED] -> (u)
            RETURN c AS connected
        `
        const result = await session.executeWrite(tx => tx.run(query, {userId: userId, connectionId: connectionId}))
        
        console.log(result.records[0].get("connected"))

        res.status(201).end()
    } catch (e) {
        console.error(e)
        res.status(500).send({message: "internal server error"})
    } finally {
        await session.close()
    }
})

app.get("/user/:id", async (req, res) =>{
    if (!req.session.user) return res.status(401).send({error: "unauthorized"})

    const selfId = req.session.user.uId
    const userId = req.params.id
    const session = driver.session()
    try {
        const query = `
            MATCH (s:User {uId: $selfId}), (u:User {uId: $userId}) 
            RETURN u.profileImg AS profileImg, u.name AS name, exists((s) - [:CONNECTED] - (u)) AS connected, exists((s) - [:INVITED] -> (u)) AS pending, exists((s) <- [:INVITED] - (u)) AS invited`
        const result = await session.executeRead(tx => tx.run(query, {userId: userId, selfId: selfId}))
        if (result.records.length !== 0){
            const user = {
                profileImg: result.records[0].get("profileImg"),
                name: result.records[0].get("name"),
                connected: result.records[0].get("connected"),
                invited: result.records[0].get("invited"),
                pending: result.records[0].get("pending"),
                uId: userId
             }
            res.status(200).send(user)
        } else{
            throw new Error("user not found")
        }
    } catch (e) {
        console.error(e)
    } finally {
        await session.close()
    }
})