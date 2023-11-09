const {uuid} = require("../seedConfig.js")

const createUser = async (user, session) =>{
    try {
      const addUser = "MERGE (u:User {id: $id, name: $name}) RETURN u AS user"
      const results = await session.executeWrite(async tx => {
        return await tx.run(addUser, user)
      }) 
      // for (const record of results.records){
      //   console.log(record.get('user'))
      // }
    } catch(e){
      console.error(e)
    }
}

const createUsers = async (driver) =>{
    const session = driver.session()
    const users = [
      {
      id: uuid(),
      name: "Matt"
      }, 
      {
      id: uuid(),
      name: "CJ"
      }, 
      {
      id: uuid(),
      name: "Wills"
      }, 
      {
      id: uuid(),
      name: "Tom"
      }, 
      {
        id: uuid(),
        name: "Nick"
      }, 
      {
        id: uuid(),
        name: "Jay"
      }, 
      {
        id: uuid(),
        name: "Mustafa"
      }
    ]
    for (const user of users) {
        await createUser(user, session)
    }
    await session.close()
    return users
}



module.exports = {
    createUsers
}