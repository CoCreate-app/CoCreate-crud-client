async function testCollections() {
    let createCollection = await CoCreate.crud.createCollection({
        database: ['testDB', 'testDB1', 'testDB2'],
        collection: ['testCollection', 'testCollection1', 'testCollection2']  
        
    })
    console.log('createCollection', createCollection)

    let readCollection = await CoCreate.crud.readCollection({
        database: ['testDB', 'testDB1', 'testDB2'],
    })
    console.log('readCollection', readCollection)

    let updateCollection = await CoCreate.crud.updateCollection({
        database: ['testDB', 'testDB1', 'testDB2'],
        collection: {testCollection: 'testCollectionA'}
    })
    console.log('updateCollection', updateCollection)


    let deleteCollection = await CoCreate.crud.deleteCollection({
        database: ['testDB', 'testDB1', 'testDB2'],
        collection: ['testCollectionA', 'testCollection1', 'testCollection2']  
    })
    console.log('deleteCollection', deleteCollection)
        
}
