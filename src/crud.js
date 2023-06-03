/* global CoCreate, CustomEvent */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(["@cocreate/socket-client", "@cocreate/indexeddb", "@cocreate/utils", "./utils.crud.js"],
            function (CoCreateSocket, indexeddb, { ObjectId, getAttributes, checkValue }, utilsCrud) {
                return factory(true, CoCreateSocket, indexeddb = indexeddb.default, { ObjectId, getAttributes, checkValue }, utilsCrud);
            }
        )
    }
    else if (typeof module === 'object' && module.exports) {
        const utilsCrud = require("./utils.crud.js");
        const CoCreateSocket = require("@cocreate/socket-client");
        const { ObjectId, getAttributes, checkValue } = require("@cocreate/utils");
        module.exports = factory(false, CoCreateSocket, { ObjectId, getAttributes, checkValue }, utilsCrud);
    }
    else {
        root.returnExports = factory(true, root["@cocreate/socket-client"], root["@cocreate/indexeddb"], root["@cocreate/utils"], root["./utils.crud.js"]);
    }
}(typeof self !== 'undefined' ? self : this, function (isBrowser, CoCreateSocket, indexeddb, { ObjectId, getAttributes, checkValue }, utilsCrud) {

    const CoCreateCRUD = {
        socket: null,
        setSocket: function (socket) {
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
         * @param  data object to store
         * @return { Promise } The data read from the defined db's. Errors are logged and can be found in the data object
         * @throws \CreateDocument failed
         */
        createDocument: async function (data) {
            data = await this.send('createDocument', data)
            return data
        },

        /**
        * Read a document from the server.
        * 
        * @param data - The data to read. Can be any type of object.
        * 
        * @return { Promise } The data read from the defined db's. Errors are logged and can be found in the data object
        */
        readDocument: async function (data) {
            data = await this.send('readDocument', data)
            return data
        },

        updateDocument: async function (data) {
            data = await this.send('updateDocument', data)
            return data
        },

        deleteDocument: async function (data) {
            let response = await this.send('deleteDocument', data)
            return response
        },

        createCollection: async function (data) {
            data = await this.send('createCollection', data)
            return data
        },

        readCollection: async function (data) {
            data = await this.send('readCollection', data)
            return data
        },

        updateCollection: async function (data) {
            data = await this.send('updateCollection', data)
            return data
        },

        deleteCollection: async function (data) {
            data = await this.send('deleteCollection', data)
            return data
        },

        send: function (action, data) {
            return new Promise(async (resolve, reject) => {
                if (!data)
                    resolve(null);

                data['timeStamp'] = new Date().toISOString()

                if (action == 'readDocument')
                    data.broadcast = false
                if (action == 'updateDocument' && data.upsert != false)
                    data.upsert = true
                if (!data.organization_id)
                    data.organization_id = await this.getOrganizationId()

                if (data.database || data.collection) {
                    if (!data.db)
                        data['db'] = ['indexeddb', 'mongodb']
                    if (!data.database)
                        data['database'] = data.organization_id || this.socket.config.organization_id
                    if (!data.user_id)
                        data['user_id'] = this.socket.config.user_id
                }

                if (isBrowser && indexeddb.status && data['db'].includes('indexeddb')) {
                    indexeddb[action](data).then((response) => {
                        if (!action.includes("read")) {
                            if (!data.broadcastBrowser && data.broadcastBrowser != 'false')
                                response['broadcastBrowser'] = 'once'

                            if (action.includes("delete")) {
                                indexeddb.createDocument({
                                    database: 'crudSync',
                                    collection: 'deleted',
                                    document: { _id: ObjectId(), item: response }
                                })
                            }
                        }
                        this.socket.send(action, response).then((response) => {
                            resolve(response);
                        })

                    })
                } else {
                    this.socket.send(action, data).then((response) => {
                        resolve(response);
                    })
                }
            })
        },

        getOrganizationId: function () {
            return new Promise(async (resolve) => {

                let organization_id = this.socket.config.organization_id || localStorage.getItem('organization_id')
                if (organization_id)
                    resolve(organization_id)
                else {
                    let test = setTimeout(() => {
                        organization_id = this.socket.config.organization_id || localStorage.getItem('organization_id')
                        if (organization_id)
                            resolve(organization_id)

                    }, 1000)
                }
            });
        },

        listen: function (action, callback) {
            this.socket.listen(action, callback);
        },

        read: async function (element) {
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
            } = getAttributes(element);
            if (!checkValue(document_id)) return;

            if (isRead == "false") return;
            if (document_id && collection) {
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

        save: async function (element, value) {
            if (!element || value === null) return;
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
                broadcastBrowser,
                isSave
            } = getAttributes(element);
            let valueType = element.getAttribute('value-type');
            if (valueType == 'object' || valueType == 'json') {
                value = JSON.parse(value)
            }

            if (isSave == "false" || !collection || (!name && !deleteName && !updateName) || name == '_id') return;

            if (document_id == 'pending')
                return

            let data;
            if (!document_id) {
                element.setAttribute('document_id', 'pending');
                let form = element.closest('form');
                if (form) {
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
                        broadcastBrowser,
                        document: {
                            [name]: value
                        },
                    });
                }
            } else {
                let nameValue = {};
                if (name)
                    nameValue = { [name]: value }
                if (updateName)
                    updateName = { [updateName]: value }
                if (deleteName)
                    deleteName = { [deleteName]: '' }
                if (typeof value == 'string' && window.CoCreate.crdt && !updateName && !deleteName) {
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
                        broadcastBrowser,
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

        setDocumentId: function (element, collection, document_id) {
            if (!element) return;

            element.setAttribute('document_id', document_id);
            let form = element.closest('form');
            if (form && CoCreate.form) {
                CoCreate.form.setDocumentId(form, {
                    collection,
                    document_id
                });
            }
        },

        // TODO: could be handeled by sharedworker once support is more widespread https://caniuse.com/sharedworkers
        indexedDbListener: function () {
            const self = this
            this.listen('createDatabase', function (data) {
                self.sync('createDatabase', data)
            });

            this.listen('readDatabase', function (data) {
                self.sync('readDatabase', data)
            });

            this.listen('updateDatabase', function (data) {
                self.sync('updateDatabase', data)
            });

            this.listen('deleteCollection', function (data) {
                self.sync('deleteDatabase', data)
            });

            this.listen('createCollection', function (data) {
                self.sync('createCollection', data)
            });

            this.listen('readCollection', function (data) {
                self.sync('readCollection', data)
            });

            this.listen('updateCollection', function (data) {
                self.sync('updateCollection', data)
            });

            this.listen('deleteCollection', function (data) {
                self.sync('deleteCollection', data)
            });

            this.listen('createIndex', function (data) {
                self.sync('createIndex', data)
            });

            this.listen('readIndex', function (data) {
                self.sync('readIndex', data)
            });

            this.listen('updateIndex', function (data) {
                self.sync('updateIndex', data)
            });

            this.listen('deleteIndex', function (data) {
                self.sync('deleteIndex', data)
            });

            this.listen('createDocument', function (data) {
                self.sync('createDocument', data)
            });

            this.listen('readDocument', function (data) {
                self.sync('readDocument', data)
            });

            this.listen('updateDocument', function (data) {
                self.sync('updateDocument', data)
            });

            this.listen('deleteDocument', function (data) {
                self.sync('deleteDocument', data)
            });
        },

        sync: async function (action, data) {
            const self = this

            if (indexeddb.status && data.uid && data.status == 'received') {
                if (action == 'readCollection' || action == 'readDocument') {
                    // TODO: on page refresh clientId is updated may require a browserId to group all clientIds
                    if (this.socket.clientId == data.clientId)
                        self.syncDatabase(action, data)

                } else {
                    if (this.socket.clientId != data.clientId) {
                        indexeddb.readDocument({
                            database: 'crudSync',
                            collection: 'synced',
                            document: { _id: data.uid }
                        }).then((response) => {
                            if (!response.document || !response.document[0]) {
                                indexeddb.createDocument({
                                    database: 'crudSync',
                                    collection: 'synced',
                                    document: { _id: data.uid }
                                })

                                indexeddb[action]({ ...data })
                            }
                        })
                    }
                }
            }
        },

        syncDatabase: async function (action, data) {
            const self = this
            let type = action.match(/[A-Z][a-z]+/g);
            type = type[0].toLowerCase()
            let db
            let Data = { ...data }
            Data.type = type
            Data[type] = []

            let deletedItems = await this.getDeletedItems()

            let items = data[type];
            if (!Array.isArray(items) && items != undefined)
                items = [items]

            let itemsLength = items.length
            for (let i = 0; i < items.length; i++) {
                let isDeleted = this.isDeleted(type, items[i], deletedItems)

                if (isDeleted) {
                    console.log('sync failed item recently deleted')
                } else {
                    if (!db)
                        db = await indexeddb.getDatabase(items[i])
                    else if (db.name != items[i].database) {
                        db.close()
                        db = await indexeddb.getDatabase(items[i])
                    }

                    if (type == 'collection') {
                        itemsLength -= 1
                        let objectStoreNames = Array.from(db.objectStoreNames)
                        if (!objectStoreNames.includes(items[i].name)) {
                            Data.request.push(items[i].name)
                            Data[type].push(items[i])
                        }
                        if (!itemsLength) {
                            db.close()

                            if (Data.collection.length) {
                                indexeddb.createCollection({ ...Data })
                                self.broadcastSynced('sync', Data)
                            }
                        }
                    }

                    if (type == 'document' && items[i].collection && items[i]._id) {
                        let transaction = db.transaction([items[i].collection], "readwrite");
                        let collection = transaction.objectStore(items[i].collection);

                        let request = collection.get(items[i]._id);

                        request.onsuccess = function () {
                            itemsLength -= 1

                            let storedDoc = request.result
                            let storedDocCompare, docCompare
                            let Doc = { ...items[i] }
                            delete items[i].db
                            delete items[i].database
                            delete items[i].collection

                            if (storedDoc) {
                                storedDocCompare = storedDoc.modified || storedDoc.created
                                docCompare = items[i].modified || items[i].created

                                // TODO: on page load documents can be updated resulting in a false compare. needs to sync
                                if (storedDocCompare && docCompare) {
                                    if (Doc.collection == 'crdt-transactions')
                                        console.log('crdt-transactions', Doc)
                                    console.log('isSyncable', storedDocCompare.on, storedDocCompare.on < docCompare.on, docCompare.on)
                                    if (storedDocCompare.on < docCompare.on) {
                                        Data.document.push(Doc)
                                        collection.put(items[i])
                                    } else {

                                    }
                                }
                            } else {
                                Data.document.push(Doc)
                                collection.put(items[i])
                            }

                            if (!itemsLength) {
                                db.close()
                                self.broadcastSynced('sync', Data)
                            }
                        }

                        request.onerror = function () {
                            itemsLength -= 1
                            if (!itemsLength) {
                                db.close()
                            }
                            console.log('sync failed', items[i])
                        }
                    }
                }
            }
        },

        getDeletedItems: async function () {
            // TODO: filter by timestamp and remove old deleteItems lastSocketConnection
            let deletedItems = await indexeddb.readDocument({
                database: 'crudSync',
                collection: 'deleted',
            })

            // let filteredItems = []
            // let deleteItems = []
            // for (let i = 0; i < deletedItems.length; i++) {
            //     let lastSyncDate = new Date()
            //     if (deletedItems[i].timeStamp > lastSyncDate)
            //         filteredItems.push(deletedItems[i])
            //     else
            //         deleteItems.push(deletedItems[i])
            // }

            // indexeddb.deleteDocument({
            //     database: 'crudSync',
            //     collection: 'deleted',
            //     document: deleteItems
            // })

            return deletedItems.document
        },

        isDeleted: function (type, item, deletedItems) {
            for (let i = 0; i < deletedItems.length; i++) {
                let deletedItem = deletedItems[i].item[type]
                for (let i = 0; i < deletedItem.length; i++) {
                    if (type == 'database' && deletedItem[i].name == item.name) {
                        return true
                    } else if (deletedItem[i].database == item.database) {
                        if (type == 'collection' && deletedItem[i].name == item.name) {
                            return true
                        } else if (deletedItem[i].collection == item.collection) {
                            if (type == 'index' && deletedItem[i].name == item.name) {
                                return true
                            }
                            if (type == 'document' && deletedItem[i]._id == item._id) {
                                return true
                            }
                        }
                    }
                }
            }
            return false
        },

        broadcastSynced: function (action, data) {
            const listeners = this.socket.listeners.get(action);
            if (listeners)
                listeners.forEach(listener => {
                    listener(data);
                });
        },

        syncServer: function () {
            const self = this;
            const promise = indexedDB.databases()
            promise.then((databases) => {
                for (let database of databases) {
                    if (!['socketSync', 'crudSync'].includes(database.name)) {
                        let dbRequest = indexedDB.open(database.name);
                        dbRequest.onsuccess = function () {
                            let db = dbRequest.result
                            let objectStoreNames = Array.from(db.objectStoreNames)

                            let collectionLength = objectStoreNames.length
                            for (let collection of objectStoreNames) {
                                let transaction = db.transaction([collection], "readonly");
                                let objectStore = transaction.objectStore(collection);

                                let documentRequest = objectStore.getAll()
                                documentRequest.onsuccess = function () {
                                    collectionLength -= 1
                                    let data = {
                                        database: database.name,
                                        collection,
                                        document: documentRequest.result
                                    }
                                    self.socket.send('syncServer', data)
                                    console.log('sync success', { database: database.name, collection })
                                    if (!collectionLength && db.close) {
                                        db.close()
                                        console.log('sync completed')
                                    }
                                }

                                documentRequest.onerror = function () {
                                    console.log('sync failed', { database: database.name, collection })
                                    if (!collectionLength && db.close) {
                                        db.close()
                                        console.log('sync completed')
                                    }
                                };

                            }
                        }

                        dbRequest.onerror = function () {
                            console.log(openRequest.error, database)
                        };
                    }
                }
            })
        },


        importCollection: function (info) {
            const { file } = info;
            const reader = new FileReader();
            reader.addEventListener('load', (event) => {
                let fileContent = event.target.result;

                try {
                    let parsed = JSON.parse(fileContent);
                    //assuming the json is an array a validation required
                    parsed.forEach(item => {
                        if (item.hasOwnProperty('_id')) {
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
                catch (err) {
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
    if (isBrowser) {
        CoCreateCRUD.indexedDbListener();
    }


    return CoCreateCRUD;
}));
