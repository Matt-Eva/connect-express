const dotenv = require("dotenv")
const neo = require("neo4j-driver")
const { v4 } = require("uuid")
const uuid = v4

dotenv.config()

const {NEO_URL, NEO_USER, NEO_PASSWORD} = process.env

const driver = neo.driver(
    NEO_URL, neo.auth.basic(NEO_USER, NEO_PASSWORD)
);

const closeDriver = async () =>{
   await driver.close()
}

module.exports = {
    driver,
    uuid,
    closeDriver
}