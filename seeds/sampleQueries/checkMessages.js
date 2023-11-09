const {driver, closeDriver} = require('../seedConfig.js')

const checkMessages = async () =>{
    const session = driver.session()
    try {
        const checkMessages = "MATCH (m:Message) RETURN m AS message"
        const results = await session.executeRead(async tx =>{
            return await tx.run(checkMessages)
        })
        for (const record of results.records){
            console.log(record.get("message"))
        }
    } catch(error){
        console.error(error)
    } finally{
        closeDriver()
    }
}

checkMessages()