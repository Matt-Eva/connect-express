const {uuid} = require("../seedConfig.js")
const { faker } = require("@faker-js/faker")

const createMessages = async (driver, users) =>{
    const session = driver.session()

    for (const user of users){
        const results = await session.executeWrite(async tx => {
            const chats = await tx.run(`
                MATCH (user:User {uId: $uId}) - [:PARTICIPATING] -> (chat:Chat) RETURN user, chat
            `, user)

            const messages= []
            for (const record of chats.records) {
                const chat = record.get("chat").properties
                const user = record.get("user").properties
                const text = faker.lorem.word()
                const date = Date.now()

                const result = await tx.run(`
                    MATCH (u:User {uId: $userId}), (c:Chat {uId: $chatId})
                    CREATE (u) - [:SENT] -> (m:Message {text: $text, userId: $userId, uId: $uId, date: $date}) - [:SENT_IN_CHAT] -> (c)  
                    RETURN m
                `, {userId: user.uId, chatId: chat.uId, text: text, uId: uuid(), date: date})

                const message = result.records[0].get('m').properties

                messages.push(message)
            }

            return messages
        })

        console.log(results)
    }
  
    await session.close()
}

module.exports = {
    createMessages
}