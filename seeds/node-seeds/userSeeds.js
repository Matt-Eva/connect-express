const {uuid} = require("../seedConfig.js")

const createUsersWithConnections = async(session, user1, user2) =>{
  console.log("creating connections")
  console.log(user1, user2)
  try {
    const createConnected = `
      MERGE(u1:User {id: $u1Id, name: $u1Name}) - [c:CONNECTED] -> (u2:USER {id: $u2Id, name: $u2Name})
      RETURN u1, u2, c
    `
    const result = await session.executeWrite(async tx =>{
      return await tx.run(createConnected, {u1Id: user1.id, u1Name: user1.name, u2Id: user2.id, u2Name: user2.name})
    })
    // console.log(result)
    for (const record of result.records){
      console.log([record.get("u1"), record.get("u2"), record.get("c")])
    }
  } catch (e) {
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
    for (let i = 0; i < users.length; i++){
        const user1 = users[i]  
        for(let n = 1; n <= 3; n ++){
          const a = i + n
          const b = a >= users.length ? a - users.length : a
          const user2 = users[b]
          await createUsersWithConnections(session, user1, user2)
        }
    }
    await session.close()
    return users
}

module.exports = {
    createUsers
}