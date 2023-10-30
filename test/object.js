async function testObjects() {
    let createObject = await CoCreate.crud.send({
        method: 'object.create',
        database: ['testDB', 'testDB1', 'testDB2'],
        array: ['testCollection', 'testCollection1', 'testCollection2'],
        object: {
            'books.action.title': 'matr',
            sports: { basketball: { teams: ['bulls'] } }
        }

    })
    console.log('createObject', createObject)
    // let _id = createObject.object[0]._id

    let readObject = await CoCreate.crud.send({
        method: 'object.read',
        database: ['testDB', 'testDB1', 'testDB2'],
        array: ['testCollection', 'testCollection1', 'testCollection2'],
        // object: {
        //     _id
        // } 
    })
    console.log('readObject', readObject)

    let updateObject = await CoCreate.crud.send({
        method: 'object.update',
        database: ['testDB', 'testDB1', 'testDB2'],
        array: ['testCollection', 'testCollection1', 'testCollection2'],
        object: {
            'books.action.title': 'matry',
            test: 'yep1',
            top: 'qwerty',
            sports: { basketball: { teams: ['lakers'] } },
            $filter: {
                query: [
                    { key: 'organization_id', value: "5ff747727005da1c272740ab" }
                ]
            }
        }
    })
    console.log('updateObject', updateObject)

    let deleteObject = await CoCreate.crud.send({
        method: 'object.delete',
        database: ['testDB', 'testDB1', 'testDB2'],
        array: ['testCollection', 'testCollection1', 'testCollection2'],
        object: {
            $filter: {
                query: [
                    { key: 'organization_id', value: "5ff747727005da1c272740ab" }
                ]
            }
        }
    })
    console.log('deleteObject', deleteObject)

    // let deleteDatabase = await CoCreate.crud.deleteDatabase({
    //     database: ['testDB', 'testDB1', 'testDB2'],
    // })
    // console.log('deleteDatabase', deleteDatabase)
}