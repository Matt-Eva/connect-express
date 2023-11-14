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
            const result = await session.executeWrite(async tx => {
                const usersResults = await tx.run(
                    'MATCH (:User {uId: $userId}) - [:CONNECTED] - (u:User) RETURN u AS connection', {userId: user.uId}
                )
                // return usersResults
                const connections = []
                for (const record of usersResults.records){
                    const user = record.get("connection").properties
                    connections.push(user)
                }
                return connections
            })
            // console.log(result)
        } catch(e){
            console.error(e)
        }
    }
    await session.close()
}

module.exports = {
    createChats
}