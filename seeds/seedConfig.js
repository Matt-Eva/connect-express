import dotenv from "dotenv"
import neo from "neo4j-driver";
import { v4 as uuid } from "uuid";

dotenv.config()

const {NEO_URL, NEO_USER, NEO_PASSWORD} = process.env

console.log(NEO_URL, NEO_USER, NEO_PASSWORD)

const driver = neo.driver(
    NEO_URL, neo.auth.basic(NEO_USER, NEO_PASSWORD)
);

const closeDriver = async () =>{
   await driver.close()
}

export { driver, uuid, closeDriver };