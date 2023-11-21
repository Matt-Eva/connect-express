const {uuid} = require("../seedConfig.js")
const { faker } = require("@faker-js/faker")

const createUsersWithConnections = async(session, user1, user2) =>{
  try {
    const createConnected = `
      MERGE (u1:User {uId: $u1Id, name: $u1Name})
      MERGE (u2:User {uId: $u2Id, name: $u2Name})
      MERGE (u1) - [c:CONNECTED] - (u2)
      RETURN u1, u2, c
    `
    const result = await session.executeWrite(async tx =>{
      return await tx.run(createConnected, {u1Id: user1.uId, u1Name: user1.name, u2Id: user2.uId, u2Name: user2.name})
    })
    // for (const record of result.records){
    //   console.log([record.get("u1"), record.get("u2"), record.get("c")])
    // }
  } catch (e) {
    console.error(e)
  }
}

const createUserArray = () =>{
  const users = [
    {
      uId: uuid(),
      name: "Matt"
    }, 
    {
      uId: uuid(),
      name: "CJ"
    }, 
    {
      uId: uuid(),
      name: "Wills"
    }, 
    {
      uId: uuid(),
      name: "Tom"
    }, 
    {
      uId: uuid(),
      name: "Nick"
    }, 
    {
      uId: uuid(),
      name: "Jay"
    }, 
    {
      uId: uuid(),
      name: "Mustafa"
    }, 
    {
      uId: uuid(),
      name: "Jim"
    }, 
    {
      uId: uuid(),
      name: "Liz"
    },
    {
      uId: uuid(),
      name: "Laura"
    }, 
    {
      uId: uuid(),
      name: "Sam"
    }
  ]
  for(let i = 0; i < 20; i ++){
    const user = {
      uId: uuid(),
      name: faker.person.firstName()
    }
    users.push(user)
  }
  return users
}

const createUsers = async (driver) =>{
    const session = driver.session()
    const users = createUserArray()
    const relTracker = {}
    for (let i = 0; i < users.length; i++){
      if (!relTracker[i]) relTracker[i] = []
      for (let n = 1; n <= 4; n++ ){
        if (relTracker[i].length === 5) break
        const a = i + n
        const b = a >=users.length ? a - users.length : a
        if (!relTracker[b]) relTracker[b] = []
        if (relTracker[b].length === 5) break
        relTracker[i].push(b)
        relTracker[b].push(i)
        const user1 = users[i]
        const user2 = users[b]
        // console.log(i, b)
        await createUsersWithConnections(session, user1, user2)
       }
    }
    await session.close()
    return users
}

module.exports = {
    createUsers
}