/* global CoCreate, CustomEvent */

(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(["@cocreate/socket-client", "./utils.crud.js", "@cocreate/indexeddb"], function(CoCreateSocket, utilsCrud, indexeddb) {
            return factory(true, CoCreateSocket, utilsCrud, indexeddb);
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


        createDocument: async function(data) {
            if(!data) 
                return false;
            data.data['created'] = {on: new Date().toISOString(), by: 'current user'}
    
            data = await this.sendRequest('createDocument', data)
            return data
        },
        
        readDocument: async function(data) {
            if(!data || !utilsCrud.checkAttrValue(data['document_id']))
                return null;
    
            data = await this.sendRequest('readDocument', data)
            return data
        },

        updateDocument: async function(data) {
            if(data['document_id'] && !utilsCrud.checkAttrValue(data['document_id']))
                return null;
            
            data.data['modified'] = {on: new Date().toISOString(), by: 'current user'}
           
            if (data.upsert != false)
                data.upsert = true
                    
            data = await this.sendRequest('updateDocument', data)
            
            return data
        },

        deleteDocument: async function(data) {
            if(!info || !utilsCrud.checkAttrValue(data['document_id']))
                return null;
            
            let response = await this.sendRequest('deleteDocument', data)
            return response
        },

        readDocuments: async function(data) {
            if(!data && !data.collection) 
                return null;

            let response = await this.sendRequest('readDocuments', data)
            return response
        },

        createCollection: async function(data) {
            let response = await this.sendRequest('createCollection', data)
            return response
        },

        readCollections: async function(data) {
            let response = await this.sendRequest('readCollections', data)
            return response
        },

        updateCollection: async function(data) {
            let response = await this.sendRequest('updateCollection', data)
            return response
        },

        deleteCollection: async function(data) {
            let response = await this.sendRequest('deleteCollection', data)
            return response
        },

        sendRequest: async function(action, data) {
            if (!data.database)
                data['database'] = this.socket.config.organization_id
            if (data.document_id) {
                if (data.data)
                    data.data['_id'] = data.document_id 
                else 
                    data.data = {_id: data.document_id }
            }

            try {
                let response;
                if (isBrowser)
                    response = await indexeddb[action](data)

                if (!response || this.isObjectEmpty(response.data) || !response.data || response.data.length == 0)
                    response = await this.socket.send(action, data);
                else {
                    this.socket.send(action, data);

                    if (!this.socket.connected || window && !window.navigator.onLine) {
                        const listeners = this.socket.listeners.get(action);
                        if (listeners) 
                            listeners.forEach(listener => {
                                listener(response, action);
                            });
                    }
                }
                return response;

            }
            catch(e) {
                console.log(e);
                return null;
            }
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
                            data: item
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

        send: async function(message, data) {
            let response = await this.socket.send(message, data);
            return response;
        },
        
        listen: function(message, fun) {
            this.socket.listen(message, fun);
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
            } = utilsCrud.getAttr(element);
            if(!utilsCrud.checkAttrValue(document_id)) return;

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
                    document_id,
                    name
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
            } = utilsCrud.getAttr(element);
            let valueType = element.getAttribute('value-type');
            if(valueType == 'object' || valueType == 'json'){
                value = JSON.parse(value)
            }
            if(isSave == "false" || !collection || (!name && !deleteName && !updateName ) || document_id == 'pending' || name == '_id') return;

            let data;
            if(!document_id) {
                element.setAttribute('document_id', 'pending');
                let form = element.closest('form');
                if(form) {
                    CoCreate.form.save(form);
                }
                else {
                    data = await this.createDocument({
                        host,
                        organization_id,
                        apkey,
                        database,
                        collection,
                        broadcast,
                        broadcastSender,
                        data: {
                            [name]: value
                        },
                    });
                }
            }
            else {
                let  nameValue = {};
                if (name)
                    nameValue = {[name]: value}
                if (updateName)
                    updateName = {[updateName]: value}
                if (deleteName)
                    deleteName = {[deleteName]: ''}
                if(typeof value == 'string' && window.CoCreate.crdt && !updateName && !deleteName ) {
                    window.CoCreate.crdt.replaceText({
                        collection,
                        name,
                        document_id: data ? data.document_id : document_id,
                        value
                    });
                }
                else {
                    data = await this.updateDocument({
                        host,
                        organization_id,
                        apkey,        
                        namespace,
                        room,
                        database,
                        collection,
                        document_id,
                        upsert: true,
                        broadcast,
                        broadcastSender,
                        data: nameValue,
                        updateName,
                        deleteName
                    });
                }
            }
            if(data && (!document_id || document_id !== data.document_id)) {
                this.setDocumentId(element, collection, data.document_id);
            }
        },


        setDocumentId: function(element, collection, document_id) {
            if (!element) return;
            element.setAttribute('document_id', document_id);
            let form = element.closest('form');
            if(form) {
                CoCreate.form.setDocumentId(form, {
                    collection,
                    document_id
                });
            }
        },

        indexedDbListener: function() {
            const self = this
            this.listen('readDocument', function(data) {
                self.sync('readDocument', data)
            });
    
            this.listen('readDocuments', async function(data) {
                self.sync('readDocuments', data)
            });
            
            this.listen('createDocument', function(data) {
                self.sync('createDocument', data)
            });
            
            this.listen('updateDocument', function(data) {
                self.sync('updateDocument', data)
            });
            
            this.listen('deleteDocument', function(data) {
                self.sync('deleteDocument', data)
            });
    
            this.listen('createCollection', function(data) {
                self.sync('createCollection', data)
            });
            
            this.listen('updateCollection', function(data) {
                self.sync('updateCollection', data)
            });
            
            this.listen('deleteCollection', function(data) {
                self.sync('deleteCollection', data)
            });
        },

        sync: async function(action, data) {   
                let db = await indexeddb.database(data)
                if (['deleteDocument', 'createCollection', 'updateCollection', 'deleteCollection'].includes(action)) {
                    if (this.socket.clientId !== data.clientId)           
                        indexeddb[action](data)
                } else {
                    let transaction = db.transaction([data.collection], "readwrite");
                    let collection = transaction.objectStore(data.collection);
                    
                    if (Array.isArray(data.data)) {
                        for (let item of data.data) {
                            indexeddb.readDocument({data: item}, db, collection).then((doc) => {
                                if (!doc.data || doc.modified && (doc.modified.on < item.modifed.on)) {
                                    collection.put(item)
                                }
        
                            })
                        }
                    } else {
                        indexeddb.readDocument(data, db, collection).then((doc) => {
                            if (!doc.data || doc.data.modified && (doc.data.modified.on < data.data.modified.on)) {
                                collection.put(data)
                            }
        
                        })
                    }
                }

                db.close()
                return 'synced'
        },
        
        isObjectEmpty(obj) { 
            for (var x in obj) { return false }
            return true;
         },

        ...utilsCrud

    };
    
    CoCreateCRUD.setSocket();
    CoCreateCRUD.indexedDbListener();

    
    return CoCreateCRUD;
}));
