// This file contains functions that seed Chat nodes
const { uuid} = require("../seedConfig.js")
  
const createChat = async (session, chat)  => {
    try {
        const createChat = `MERGE (c:Chat {id: $id}) RETURN c AS chat`
        const results = await session.executeWrite(async tx =>{
            return await tx.run(createChat, chat)
        })
        // for (const record of results.records) {
        //     console.log(record.get("chat"))
        // }
    } catch(e) {
        console.error(e)
    }
}

const createChats = async (driver) =>{
    const chats = []
    const session = driver.session()
    for (let i = 0; i < 7; i++){
        const chat = {id: uuid()}
        await createChat(session, chat)
        chats.push(chat)
    }
    await session.close()
    return chats;
}

module.exports = {
    createChats
}