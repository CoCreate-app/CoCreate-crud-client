/* global CoCreate, CustomEvent */

(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(["@cocreate/socket-client", "./utils.crud.js", "@cocreate/indexeddb"], function(CoCreateSocket, utilsCrud, indexeddb) {
            return {default: factory(true, CoCreateSocket, utilsCrud, indexeddb)};
        });
    }
    else if (typeof module === 'object' && module.exports) {
        const utilsCrud = require("./utils.crud.js");
        const CoCreateSocket = require("@cocreate/socket-client");
        module.exports = factory(false, CoCreateSocket, utilsCrud);
    }
    else {
        root.returnExports = factory(true, root["@cocreate/socket-client"], root["./utils.crud.js"], root["@cocreate/indexeddb"]);
    }
}(typeof self !== 'undefined' ? self : this, function(isBrowser, CoCreateSocket, utilsCrud, indexeddb) {
    
    if(CoCreateSocket && CoCreateSocket.default)
        CoCreateSocket = CoCreateSocket.default
    if(indexeddb && indexeddb.default)
        indexeddb = indexeddb.default

    const CoCreateCRUD = {
        socket: null,
        
        setSocket: function(socket) {
            this.socket = socket || CoCreateSocket;
   
            if (isBrowser) {
                this.socket.create(); // {prefix: 'crud'}
            }
        },

        /**
         * Creates a document in a specified database and collection .
         *
         * @see https://cocreate.app/docs/objects.html#read-crud
         * @param database string or array of database names.
         * @param collection string or array of collection names.
         * @param  data object or array of objects to store
         * @return array API output.
         * @throws \CreateDocument failed
         */
        createDocument: async function(data) {
            data = await this.send('createDocument', data)
            return data
        },
        
        readDocument: async function(data) {
            data = await this.send('readDocument', data)
            return data
        },

        updateDocument: async function(data) {      
            data = await this.send('updateDocument', data)
            return data
        },

        deleteDocument: async function(data) {
            let response = await this.send('deleteDocument', data)
            return response
        },

        createCollection: async function(data) {
            data = await this.send('createCollection', data)
            return data
        },

        readCollection: async function(data) {
            data = await this.send('readCollection', data)
            return data
        },
        
        readCollections: async function(data) {
            data = await this.send('readCollections', data)
            return data
        },

        updateCollection: async function(data) {
            data = await this.send('updateCollection', data)
            return data
        },

        deleteCollection: async function(data) {
            data = await this.send('deleteCollection', data)
            return data
        },

        deletedDocuments: [],
        getDeletedDocuments: async  function() {
            let data = await indexeddb.readDocument({
                database: 'deletedDocuments',
                collection: 'deletedDocuments',
                document: { _id: 'deletedDocuments'}
            }) 
            
            if (data && data.document && data.document[0])
                this.deletedDocuments = data.document[0].deletedDocuments                  
        },

        send: function(action, data) {
            return new Promise((resolve, reject) => {
                if(!data) 
                    resolve(null);
                
                // ToDo: created and modified handeled by db
                data['timeStamp'] = new Date().toISOString()

                if (action == 'updateDocument' && data.upsert != false)
                    data.upsert = true

                if (data.collection) {
                    if (!data.db)
                        data['db'] = ['indexeddb', 'mongodb']
                    if (!data.database)
                        data['database'] = data.organization_id || this.socket.config.organization_id
                    if (!data.organization_id)
                        data['organization_id'] = this.socket.config.organization_id
                }

                if (isBrowser && indexeddb) {
                    indexeddb[action](data).then((response) => {
                        let type = action.match(/[A-Z][a-z]+/g)[0].toLowerCase();

                        if (this.socket.connected && !response || this.socket.connected && this.isObjectEmpty(response[type]) || this.socket.connected && !response[type] || this.socket.connected && response[type].length == 0) {
                            this.socket.send(action, response).then((response) => {
                                resolve(response);
                            })
                        } else {
                            resolve(response);

                            if (action == 'deleteDocument') {
                                this.deletedDocuments.push(...response.document)
                                indexeddb.updateDocument({
                                    database: 'deletedDocuments',
                                    collection: 'deletedDocuments',
                                    document: { _id: 'deletedDocuments', deletedDocuments: this.deletedDocuments }
                                })                    
                            }

                            this.socket.send(action, response);

                            if (!this.socket.connected || window && !window.navigator.onLine) {
                                const listeners = this.socket.listeners.get(action);
                                if (listeners) 
                                    listeners.forEach(listener => {
                                        listener(response);
                                    });
                            }
                        }
                    })
                } else {
                    this.socket.send(action, data).then((response) => {
                        resolve(response);
                    })
                }
            })
        },
        
        listen: function(action, callback) {
            this.socket.listen(action, callback);
        },

        read: async function(element) {
            const {
                host,
                organization_id,
                apkey,
                database,
                collection,
                document_id,
                name,
                namespace,
                room,
                isRead
            } = utilsCrud.getAttributes(element);
            if(!utilsCrud.checkValue(document_id)) return;

            if(isRead == "false") return;
            if(document_id && collection) {
                const responseData = await this.readDocument({
                    host,
                    organization_id,
                    apkey,
                    namespace,
                    room,
                    database,
                    collection,
                    document: {
                        _id: document_id,
                        name
                    }
                });
                return responseData;
            }
            return null;
        },
        
        save: async function(element, value) {
            if(!element || value === null) return;
            let {
                host,
                organization_id,
                apkey,
                database,
                collection,
                document_id,
                name,
                updateName,
                deleteName,
                namespace,
                room,
                broadcast,
                broadcastSender,
                isSave
            } = utilsCrud.getAttributes(element);
            let valueType = element.getAttribute('value-type');
            if (valueType == 'object' || valueType == 'json'){
                value = JSON.parse(value)
            }

            if (isSave == "false" || !collection || (!name && !deleteName && !updateName) || name == '_id') return;
            
            if (document_id == 'pending')
                return

            let data;
            if (!document_id) {
                element.setAttribute('document_id', 'pending');
                let form = element.closest('form');
                if(form) {
                    CoCreate.form.save(form);
                } else {
                    data = await this.createDocument({
                        host,
                        organization_id,
                        apkey,
                        database,
                        collection,
                        broadcast,
                        broadcastSender,
                        document: {
                            [name]: value
                        },
                    });
                }
            } else {
                let nameValue = {};
                if (name)
                    nameValue = {[name]: value}
                if (updateName)
                    updateName = {[updateName]: value}
                if (deleteName)
                    deleteName = {[deleteName]: ''}
                if (typeof value == 'string' && window.CoCreate.crdt && !updateName && !deleteName ) {
                    window.CoCreate.crdt.replaceText({
                        collection,
                        name,
                        document_id,
                        value
                    });
                } else {
                    data = await this.updateDocument({
                        host,
                        organization_id,
                        apkey,        
                        namespace,
                        room,
                        database,
                        collection,
                        upsert: true,
                        broadcast,
                        broadcastSender,
                        document: { _id: document_id, ...nameValue },
                        updateName,
                        deleteName
                    });
                }
            }
            if (data && (!document_id || document_id !== data.document[0]._id)) {
                this.setDocumentId(element, collection, data.document[0]._id);
            }
        },

        setDocumentId: function(element, collection, document_id) {
            if (!element) return;

            element.setAttribute('document_id', document_id);
            let form = element.closest('form');
            if (form) {
                CoCreate.form.setDocumentId(form, {
                    collection,
                    document_id
                });
            }
        },

        // ToDo: could be handeled by sharedworker once support is more widespread https://caniuse.com/sharedworkers
        indexedDbListener: function() {
            const self = this
            this.listen('createDatabase', function(data) {
                self.sync('createDatabase', data)
            });
            
            this.listen('readDatabase', function(data) {
                self.sync('readDatabase', data)
            });
            
            this.listen('updateDatabase', function(data) {
                self.sync('updateDatabase', data)
            });
            
            this.listen('deleteCollection', function(data) {
                self.sync('deleteDatabase', data)
            });

            this.listen('createCollection', function(data) {
                self.sync('createCollection', data)
            });
            
            this.listen('readCollection', function(data) {
                self.sync('readCollection', data)
            });
            
            this.listen('updateCollection', function(data) {
                self.sync('updateCollection', data)
            });
            
            this.listen('deleteCollection', function(data) {
                self.sync('deleteCollection', data)
            });

            this.listen('createIndex', function(data) {
                self.sync('createIndex', data)
            });
            
            this.listen('readIndex', function(data) {
                self.sync('readIndex', data)
            });
            
            this.listen('updateIndex', function(data) {
                self.sync('updateIndex', data)
            });
            
            this.listen('deleteIndex', function(data) {
                self.sync('deleteIndex', data)
            });
            
            this.listen('createDocument', function(data) {
                self.sync('createDocument', data)
            });

            this.listen('readDocument', function(data) {
                self.sync('readDocument', data)
            });
    
            this.listen('updateDocument', function(data) {
                self.sync('updateDocument', data)
            });
            
            this.listen('deleteDocument', function(data) {
                self.sync('deleteDocument', data)
            });
        },

        sync: async function(action, data) {  
            const self = this

            if (data.uid) {
                // console.log('checkSyncedDocuments', data.clientId)
                indexeddb.readDocument({
                    database: 'syncedDocuments',
                    collection: 'syncedDocuments',
                    document: {_id: data.uid}
                }).then((response) =>{
                    if (!response.document || !response.document[0]) {
                        // console.log('add uid', data.uid, data.clientId)
                        indexeddb.createDocument({
                            database: 'syncedDocuments',
                            collection: 'syncedDocuments',
                            document: {_id: data.uid}
                        })
                        
                        // ToDo: if multiple tabs or windows are open on the same browser run once
                        if (action == 'readDocument') {
                            if (this.socket.clientId == data.clientId) {
                                // console.log('syncing', action, data.clientId)   
                                let Data = {...data}
                                delete Data.document

                                let docs = data.document;
                                if (!Array.isArray(docs) && docs != undefined)
                                    docs = [docs]
                            
                                let docsLength = docs.length
                                for (let doc of docs) {
                                    docsLength -= 1
                                    const result = self.deletedDocuments.filter(
                                        deletedDoc => deletedDoc._id == doc._id && deletedDoc.database == doc.database && deletedDoc.collection == doc.collection
                                    );
                                    
                                    if (result && result.length > 0) {
                                        console.log('sync failed doc recently deleted')
                                        // ToDo: delete result from array
                                    } else {
                                        indexeddb.getDatabase(doc).then((db) => {
                                            let transaction = db.transaction([doc.collection], "readwrite");
                                            let collection = transaction.objectStore(doc.collection);
                        
                                            let request = collection.get(doc._id);
                                                
                                            request.onsuccess = function() {
                                                let storedDoc = request.result
                                                let storedDocCompare, docCompare
                                                delete doc.db
                                                delete doc.database
                                                delete doc.collection
                                                Data.document = [doc]
                                                if (storedDoc) {
                                                    storedDocCompare = storedDoc.modified || storedDoc.created
                                                    docCompare = doc.modified || doc.created
                                                    
                                                    if (storedDocCompare && docCompare && (storedDocCompare.on < docCompare.on)) {
                                                        collection.put(doc)
                                                        self.broadcastSyncedDocument('updateDocument', Data)
                                                    }                    
                                                } else {
                                                    collection.put(doc)
                                                    self.broadcastSyncedDocument('createDocument', Data)
                                                }
                                                
                                                if (!docsLength)                     
                                                    db.close()
                                            }
                    
                                            request.onerror = function() {
                                                if (!docsLength) {                        
                                                    db.close()
                                                }
                                                console.log('sync failed', doc)
                                            }
                                        })
                                    }
                                }
                            }
                        } else {
                            // console.log('syncable check', action, data.clientId)
                            if (action !== 'readDocument' && this.socket.clientId !== data.clientId) {
                                // console.log('syncing', action, data.clientId)
                                indexeddb[action]({...data})
                            }          
                        }

                        return 'synced'

                    } 
                    // else {
                         // console.log('already exists', data.uid, data.clientId)
                    // }    
                })
            }
        },

        broadcastSyncedDocument: function(action, data) {
            const listeners = this.socket.listeners.get(action);
            if (listeners) 
                listeners.forEach(listener => {
                    listener(data);
                });
        },

        importCollection: function(info) {
            const { file } = info;
            const reader = new FileReader();
            reader.addEventListener('load', (event) => {
                let fileContent = event.target.result;

                try {
                    let parsed = JSON.parse(fileContent);
                    //assuming the json is an array a validation required
                    parsed.forEach(item => {
                        if(item.hasOwnProperty('_id')) {
                            delete item['_id'];
                        }
                        let collection = info['collection'];
                        this.createDocument({
                            collection,
                            document: item
                        });
                    });
                    document.dispatchEvent(new CustomEvent('imported', {
                        detail: {}
                    }));
                }
                catch(err) {
                    console.error('json failed');
                }
            });
            reader.readAsText(file);
        },
        
        isObjectEmpty(obj) { 
            for (var x in obj) { return false }
            return true;
         },

        ...utilsCrud

    };
    
    CoCreateCRUD.setSocket();
    CoCreateCRUD.getDeletedDocuments();
    CoCreateCRUD.indexedDbListener();

    
    return CoCreateCRUD;
}));

