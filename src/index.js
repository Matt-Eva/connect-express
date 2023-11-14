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

        res.status(200).send(user)
    } catch (e){
        console.error(e)

        res.status(500).send({error: true})
    } finally {
        await session.close()
    }

})