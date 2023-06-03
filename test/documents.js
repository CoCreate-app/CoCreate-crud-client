async function testDocuments() {
    let createDocument = await CoCreate.crud.createDocument({
        database: ['testDB', 'testDB1', 'testDB2'],
        collection: ['testCollection', 'testCollection1', 'testCollection2'],  
        document: {
            'books.action.title': 'matr',
            sports: {basketball: {teams: ['bulls']}}
        }
        
    })
    console.log('createDocument', createDocument)
    // let _id = createDocument.document[0]._id

    let readDocument = await CoCreate.crud.readDocument({
        database: ['testDB', 'testDB1', 'testDB2'],
        collection: ['testCollection', 'testCollection1', 'testCollection2'],
        // document: {
        //     _id
        // } 
    })
    console.log('readDocument', readDocument)

    let updateDocument = await CoCreate.crud.updateDocument({
        database: ['testDB', 'testDB1', 'testDB2'],
        collection: ['testCollection', 'testCollection1', 'testCollection2'],  
        document: {
            'books.action.title': 'matry',
            test: 'yep1',
            top: 'qwerty',
            sports: {basketball: {teams: ['lakers']}}
        },
        filter: { 
            query: [
                {name: 'organization_id', value: "5ff747727005da1c272740ab"}
            ]
        },
        // async: true 
    })
    console.log('updateDocument', updateDocument)

    let deleteDocument = await CoCreate.crud.deleteDocument({
        database: ['testDB', 'testDB1', 'testDB2'],
        collection: ['testCollection', 'testCollection1', 'testCollection2'], 
        // document: {
        //     _id
        // },
 
        filter: { 
            query: [
                {name: 'organization_id', value: "5ff747727005da1c272740ab"}
            ]
        }
    })
    console.log('deleteDocument', deleteDocument)

        // let deleteDatabase = await CoCreate.crud.deleteDatabase({
        //     database: ['testDB', 'testDB1', 'testDB2'],
        // })
        // console.log('deleteDatabase', deleteDatabase)
}