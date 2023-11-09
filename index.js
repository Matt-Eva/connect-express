const { server, driver, io } = require("./config.js")

server.listen(process.env.PORT, () =>{
    console.log(`Server running on ${process.env.PORT}`)
})

io.on("connection", async (socket) =>{
    console.log(socket.request.session)
})