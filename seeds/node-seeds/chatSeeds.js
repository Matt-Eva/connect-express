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

const createChats = async (driver, users) =>{
    const session = await driver.session()
    for (const user of users){
        try{
            await session.executeWrite(async tx => {
                const usersResults = await tx.run(
                    'MATCH (:User {uId: $userId}) - [:CONNECTED] - (u:User) RETURN u AS connection', {userId: user.uId}
                )

                const connections = [user]
                for (const record of usersResults.records){
                    const connection = record.get("connection").properties
                    connections.push(connection)
                }

                const existingChat = await tx.run(`
                    MATCH (chat:Chat)
                    WHERE all(connection IN $connections WHERE (:User {uId: connection.uId}) - [:PARTICIPATING] -> (chat))
                    RETURN chat
                `, {connections})

                if (existingChat.records.length !== 0) {
                    const returnArray = [existingChat.records[0].get('chat')]
                    return returnArray
                }
                
                const newChat = await tx.run(`
                    CREATE (c:Chat {uId: $uId})
                    WITH c
                    UNWIND $connections AS connection
                    MATCH (u:User {uId: connection.uId})
                    MERGE (u) - [p:PARTICIPATING] -> (c)
                    RETURN c AS chat, p AS participating, u AS user
                `, {uId: uuid(), connections: connections})

                return newChat
            })

        } catch(e){
            console.error(e)
        }
    }
    await session.close()
}

module.exports = {
    createChats
}