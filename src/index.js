const { server, driver, io, app } = require("./config.js")

server.listen(process.env.PORT, () =>{
    console.log(`Server running on ${process.env.PORT}`)
})

io.on("connection", async (socket) =>{
    console.log(socket.request.session.id)
    console.log(socket.request.session.user)
})

app.post("/login", (req, res) =>{
    req.session.user = true
    console.log(req.session.id)
    res.status(200).send({user: req.session.user})
})

app.get("/me", (req, res) =>{
    console.log(req.session.id)
})