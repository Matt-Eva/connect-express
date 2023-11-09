const {driver, closeDriver} = require('../seedConfig.js')

const checkChats = async () =>{
    const session = driver.session()
    try {
        const checkUsers = "MATCH (c:Chat) RETURN c AS chat"
        const results = await session.executeRead(async tx =>{
            return await tx.run(checkUsers)
        })
        for (const record of results.records){
            console.log(record.get("chat"))
        }
    } catch(error){
        console.error(error)
    } finally{
        closeDriver()
    }
}

checkChats()