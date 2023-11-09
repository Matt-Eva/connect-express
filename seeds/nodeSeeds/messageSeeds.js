const {uuid} = require("../seedConfig.js")
const { faker } = require("@faker-js/faker")

const createMessage = async (session, message) =>{
    try {
    const createMessage = `
        CREATE (m:Message {text: $text, id: $id}) RETURN m AS message
    `
    const results = await session.executeWrite(async tx =>{
        return await tx.run(createMessage, message)
    })
    for (const record of results.records){
        console.log(record.get("message"))
    }
    } catch(e) {
    console.error(e)
    }
}

const createMessages = async (driver) =>{
    const session = driver.session()
    const messages = []
    for (let i = 0; i < 21; i++){
        const message = {
            text: faker.word.verb(),
            id: uuid()
        }
        await createMessage(session, message)
        messages.push(message)
    }
    await session.close()
    return messages;
}

module.exports = {
    createMessages
}