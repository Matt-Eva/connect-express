const {driver, closeDriver} = require('./seedConfig.js')
const {createUsers} = require('./node-seeds/userSeeds.js')
const {createMultiples} = require('./testCreateMultiple.js')
const {createChats} = require("./node-seeds/chatSeeds.js")
const {createMessages} = require('./node-seeds/messageSeeds.js')
const {seedConnected} = require('./relationship-seeds/connectedSeeds.js')

console.log(seedConnected)

const clearDatabase = async () =>{
    try{
        const session = driver.session()
        await session.executeWrite(async tx =>{
            await tx.run("MATCH (n) DETACH DELETE n ")
        })
    } catch(e){
        console.error(e)
    }
}



const seed = async () =>{
    await clearDatabase()
    const users = await createUsers(driver)
    await createMultiples(driver, users)
    const chats = await createChats(driver)
    const messages = await createMessages(driver)
    await seedConnected(driver, users)
    await closeDriver()
}

seed()