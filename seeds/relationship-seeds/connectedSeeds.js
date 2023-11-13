// for seeding the relationship User - [:CONNECTED] -> User
// the only user who will be seeded will be Matt

const connect = async (session, user1, user2) => {
    try {
        const connectQuery = `
            MATCH (u1:User {name: $name1}), (u2:User {name:$name2})
            CREATE (u1) - [c:CONNECTED] -> (u2)
            RETURN c AS connected
        `
        const result = await session.executeWrite(async tx =>{
            return await tx.run(connectQuery, {name1: user1.name, name2: user2.name})
        })
        // for (const record of result.records) {
        //     console.log(record.get("connected"))
        // }
    } catch (e) {
        console.error(e)
    }
}

const seedConnected = async (driver, users) =>{
    const session = driver.session()
    for (let i = 0; i < 3; i ++) {
        await connect(session, users[0], users[i + 1])
    }
    await session.close()
}

module.exports = {
    seedConnected
}