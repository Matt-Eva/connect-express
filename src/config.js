const neo = require("neo4j-driver")
const express = require("express")
const cors = require("cors")
const session = require("express-session")
const http = require("http")
const { Server } = require("socket.io")
let Neo4jStore = require('connect-neo4j')(session)

const driver = neo.driver(process.env.NEO_URL, neo.auth.basic(process.env.NEO_USER, process.env.NEO_PASSWORD))

const testDriverConnectivity = async (driver) => {
    try {
        await driver.verifyConnectivity()
        console.log("connected")
    } catch (error){
        console.error(error)
        process.exit(0)
    }
}

testDriverConnectivity(driver)

const app = express()
const server = http.createServer(app)

const sessionMiddleware = session({
    store: new Neo4jStore({ client: driver }),
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
    cookie: {
        sameSite: 'none',
        secure: true,
    }
})

console.log(process.env.FRONTEND_URL)

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}))

app.use(sessionMiddleware)

app.use(express.json())

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true
    }
})

io.engine.use(sessionMiddleware)

// io.use((socket, next) =>{
//     sessionMiddleware(socket.request, {}, next)
// })

module.exports = {
    app,
    server,
    driver,
    io
}