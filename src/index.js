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
    const body = req.body
    const session = driver.session()
    try {
        const query = 'MATCH (user:User {name: $name}) RETURN user'

        const result = await session.executeRead( async tx => tx.run(query, {name: body.username}))

        const user = result.records[0].get("user").properties

        req.session.authenticated = true
        req.session.user = user

        res.status(200).send(user)
    } catch (e){
        console.error(e)

        res.status(500).send({error: true})
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

app.get("/my-chats", async (req, res) =>{
    if (!req.session.authenticated) return res.status(401).send({error: "unauthorized"})

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
    
    const participants = [...req.body.participants, req.session.user]
    const uIds = participants.map(participant => participant.uId)

    const session = driver.session()
    try {
        const result = await session.executeWrite(async tx =>{

            const existingChat = await tx.run(`
                MATCH (:User {uId: $userId}) -[:PARTICIPATING] ->(chat:Chat)
                WITH chat, COLLECT {MATCH (p:User) -[:PARTICIPATING] ->(chat:Chat) RETURN (p.uId)} AS participants
                WHERE all(participant IN participants WHERE participant IN $uIds)
                RETURN chat
            `, {uIds: uIds, userId: req.session.user.uId})
            
            if (existingChat.records.length !== 0){
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

        console.log(result)
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

app.post("/new-connection", async (req, res) =>{
    const {name, uId} = req.body
    const userId = req.session.user.uId
    const session = driver.session()
    
    try {
        const query = `
            MATCH (u:User {uId: $userId}), (c:User {uId: $connectionId})
            MERGE (u) - [connected:CONNECTED] - (c)
            RETURN connected
        `
        const result = await session.executeWrite(tx => tx.run(query, {userId: userId, connectionId: uId}))
        console.log(result.records[0])

        res.status(201).end()
    } catch(e){
        console.error(e)
        res.status(500).send({error: "internal server error"})
    } finally {
        await session.close()
    }
})