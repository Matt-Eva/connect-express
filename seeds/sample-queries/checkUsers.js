const {driver, closeDriver} = require('../seedConfig.js')

const checkUsers = async () =>{
    const session = driver.session()
    try {
        const checkUsers = "MATCH (u:User) RETURN u AS user"
        const results = await session.executeRead(async tx =>{
            return await tx.run(checkUsers)
        })
        for (const record of results.records){
            console.log(record.get("user"))
        }
    } catch(error){
        console.error(error)
    } finally{
        closeDriver()
    }
}

checkUsers()