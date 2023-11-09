const {driver, closeDriver} = require('./seedConfig.js')
const {createUsers} = require('./nodeSeeds/userSeeds.js')
const {createChats} = require("./nodeSeeds/chatSeeds.js")
const {createMessages} = require('./nodeSeeds/messageSeeds.js')

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
    const chats = await createChats(driver)
    const messages = await createMessages(driver)
    await closeDriver()
}

seed()