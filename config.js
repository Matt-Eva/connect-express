const neo = require("neo4j-driver")
const express = require("express")
const cors = require("cors")
const session = require("express-session")
const http = require("http")
const { Server } = require("socket.io")

const driver = neo.driver(process.env.NEO_URL, neo.auth.basic(process.env.NEO_USER, process.env.NEO_PASSWORD))

const testDriverConnectivitytry = async (driver) => {
    try {
        await driver.verifyConnectivity()
        console.log("connected")
    } catch (error){
        console.error(error)
        process.exit(0)
    }
}

testDriverConnectivitytry(driver)

const app = express()
const server = http.createServer(app)

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false
})

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

module.exports = {
    server,
    driver,
    io
}