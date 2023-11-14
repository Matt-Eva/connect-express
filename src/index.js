const { server, driver, io, app } = require("./config.js")

server.listen(process.env.PORT, () =>{
    console.log(`Server running on ${process.env.PORT}`)
})

io.on("connection", async (socket) =>{
    console.log(socket.request.session.id)
    console.log(socket.request.session.user)
})

app.post("/login", async (req, res) =>{
    const body = req.body
    const session = driver.session()
    try {
        const query = 'MATCH (user:User {name: $name}) RETURN user'

        const result = await session.executeRead( async tx => tx.run(query, {name: body.name}))

        const user = result.records[0].get("user").properties

        req.session.authenticated = true
        req.session.userId = user.uId

        console.log("login", req.session.id)

        res.status(200).send(user)
    } catch (e){
        console.error(e)

        res.status(500).send({error: true})
    } finally {
        await session.close()
    }
})

app.get("/my-chats", async (req, res) =>{
    console.log("my chats", req.session.id, req.session.authenticated, req.session.userId)
    if (!req.session.authenticated) return res.status(401).send({error: "unauthorized"})
    const session = driver.session()
    try {
        const userId = req.session.userId
        const query = "MATCH (:User {uId: $userId}) - [:PARTICIPATING] -> (chat:Chat) <- [:PARTICIPATING] - (user:User) RETURN chat, user"
        const result = await session.executeRead(async tx => tx.run(query, {userId: userId}))
        
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