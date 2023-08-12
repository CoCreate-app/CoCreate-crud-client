/********************************************************************************
 * Copyright (C) 2023 CoCreate and Contributors.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 ********************************************************************************/

// Commercial Licensing Information:
// For commercial use of this software without the copyleft provisions of the AGPLv3,
// you must obtain a commercial license from CoCreate LLC.
// For details, visit <https://cocreate.app/licenses/> or contact us at sales@cocreate.app.


/* global CoCreate, CustomEvent */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(["@cocreate/socket-client", "@cocreate/indexeddb", "@cocreate/utils"],
            function (CoCreateSocket, indexeddb, { ObjectId, getValueFromObject, getAttributeNames, setAttributeNames }) {
                return factory(true, CoCreateSocket, indexeddb = indexeddb.default, { ObjectId, getValueFromObject, getAttributeNames, setAttributeNames });
            }
        )
    }
    else if (typeof module === 'object' && module.exports) {
        const CoCreateSocket = require("@cocreate/socket-client");
        const { ObjectId, getValueFromObject, getAttributeNames, setAttributeNames } = require("@cocreate/utils");
        module.exports = factory(false, CoCreateSocket, null, { ObjectId, getValueFromObject, getAttributeNames, setAttributeNames });
    }
    else {
        root.returnExports = factory(true, root["@cocreate/socket-client"], root["@cocreate/indexeddb"], root["@cocreate/utils"]);
    }
}(typeof self !== 'undefined' ? self : this, function (isBrowser, CoCreateSocket, indexeddb, { ObjectId, getValueFromObject, getAttributeNames, setAttributeNames }) {

    const CoCreateCRUD = {
        socket: null,
        setSocket: function (socket) {
            this.socket = socket || CoCreateSocket;

            if (isBrowser) {
                this.socket.create(); // {prefix: 'crud'}
            }
        },

        /**
         * Performs a crud action using the define method .
         *
         * @see https://cocreate.app/docs/objects.html#send
         * @param method crud operation.
         * @param storage string or array of strings representing the storage name(s).
         * @param database string or array of strings representing the database name(s).
         * @param array string or array of strings representing the array name(s).
         * @param object object or array of objects
         * @param key key with in an object, supports dotNotation.
         * @return { Promise } The data read from the defined db's. Errors are logged and can be found in the data object
         * @throws \method failed
         */

        send: function (data) {
            return new Promise(async (resolve, reject) => {
                if (!data)
                    return resolve(null);
                if (!data.method)
                    return resolve(data);

                data['timeStamp'] = new Date().toISOString()

                if (data.method.startsWith('read'))
                    data.broadcast = false
                if (data.method.startsWith('update') && data.upsert != false)
                    data.upsert = true
                if (!data.organization_id)
                    data.organization_id = await this.getOrganizationId()

                if (data.database || data.array || data.type) {
                    if (!data.storage)
                        data['storage'] = ['indexeddb', 'mongodb']
                    if (!data.database)
                        data['database'] = data.organization_id || this.socket.config.organization_id
                    if (!data.user_id)
                        data['user_id'] = this.socket.config.user_id
                }

                if (isBrowser && indexeddb && data['storage'].includes('indexeddb')) {
                    let action = data.method.replace(/\.([a-z])/g, (_, match) => match.toUpperCase());

                    indexeddb(data).then((response) => {
                        if (!data.method.startsWith('read')) {
                            if (!data.broadcastBrowser && data.broadcastBrowser != 'false')
                                response['broadcastBrowser'] = 'once'

                            if (data.method.startsWith('delete')) {
                                indexeddb({
                                    method: 'create.object',
                                    database: 'crudSync',
                                    array: 'deleted',
                                    object: { _id: ObjectId(), item: response }
                                })
                            }
                        }

                        this.socket.send(response).then((response) => {
                            resolve(response);
                        })

                    })
                } else {
                    this.socket.send(data).then((response) => {
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

        listen: function (method, callback) {
            // TODO: this.socket.listen('crud.' + method, callback);
            this.socket.listen(method, callback);
        },

        // TODO: could be handeled by sharedworker once support is more widespread https://caniuse.com/sharedworkers
        syncListeners: function () {
            const method = ['create', 'read', 'update', 'delete'];
            const type = ['storage', 'database', 'array', 'index', 'object'];

            for (let i = 0; i < method.length; i++) {
                for (let j = 0; j < type.length; j++) {
                    const action = method[i] + '.' + type[j];
                    const self = this
                    this.listen(action, function (data) {
                        self.sync(data)
                    });
                }
            }
        },

        sync: async function (data) {
            const self = this

            if (indexeddb && data.uid && data.status == 'received') {
                if (data.method == 'read.array' || data.method == 'read.object') {
                    // TODO: on page refresh clientId is updated may require a browserId to group all clientIds
                    if (this.socket.clientId == data.clientId)
                        self.syncDatabase(action, data)

                } else {
                    if (this.socket.clientId != data.clientId) {
                        indexeddb({
                            method: "read.object",
                            database: 'crudSync',
                            array: 'synced',
                            object: { _id: data.uid }
                        }).then((response) => {
                            if (!response.object || !response.object[0]) {
                                indexeddb({
                                    method: "create.object",
                                    database: 'crudSync',
                                    array: 'synced',
                                    object: { _id: data.uid }
                                })

                                indexeddb({ ...data })
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
                        db = await indexeddb(items[i])
                    else if (db.name != items[i].database) {
                        db.close()
                        db = await indexeddb(items[i])
                    }

                    if (type == 'array') {
                        itemsLength -= 1
                        let objectStoreNames = Array.from(db.objectStoreNames)
                        if (!objectStoreNames.includes(items[i].name)) {
                            Data.request.push(items[i].name)
                            Data[type].push(items[i])
                        }
                        if (!itemsLength) {
                            db.close()

                            if (Data.array.length) {
                                indexeddb({ ...Data })
                                self.broadcastSynced('sync', Data)
                            }
                        }
                    }

                    if (type == 'object' && items[i].array && items[i]._id) {
                        let transaction = db.transaction([items[i].array], "readwrite");
                        let array = transaction.objectStore(items[i].array);

                        let request = array.get(items[i]._id);

                        request.onsuccess = function () {
                            itemsLength -= 1

                            let storedDoc = request.result
                            let storedDocCompare, docCompare
                            let Doc = { ...items[i] }
                            delete items[i].storage
                            delete items[i].database
                            delete items[i].array

                            if (storedDoc) {
                                storedDocCompare = storedDoc.modified || storedDoc.created
                                docCompare = items[i].modified || items[i].created

                                // TODO: on page load objects can be updated resulting in a false compare. needs to sync
                                if (storedDocCompare && docCompare) {
                                    if (Doc.array == 'crdt-transactions')
                                        console.log('crdt-transactions', Doc)
                                    console.log('isSyncable', storedDocCompare.on, storedDocCompare.on < docCompare.on, docCompare.on)
                                    if (storedDocCompare.on < docCompare.on) {
                                        Data.object.push(Doc)
                                        array.put(items[i])
                                    } else {

                                    }
                                }
                            } else {
                                Data.object.push(Doc)
                                array.put(items[i])
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
            let deletedItems = await indexeddb({
                method: 'read.object',
                database: 'crudSync',
                array: 'deleted'
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

            // indexeddb({
            //     method: 'delete.objects',
            //     database: 'crudSync',
            //     array: 'deleted',
            //     object: deleteItems
            // })

            return deletedItems.object
        },

        isDeleted: function (type, item, deletedItems) {
            for (let i = 0; i < deletedItems.length; i++) {
                let deletedItem = deletedItems[i].item[type]
                for (let i = 0; i < deletedItem.length; i++) {
                    if (type == 'database' && deletedItem[i].name == item.name) {
                        return true
                    } else if (deletedItem[i].database == item.database) {
                        if (type == 'array' && deletedItem[i].name == item.name) {
                            return true
                        } else if (deletedItem[i].array == item.array) {
                            if (type == 'index' && deletedItem[i].name == item.name) {
                                return true
                            }
                            if (type == 'object' && deletedItem[i]._id == item._id) {
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

                            let arrayLength = objectStoreNames.length
                            for (let array of objectStoreNames) {
                                let transaction = db.transaction([array], "readonly");
                                let objectStore = transaction.objectStore(array);

                                let objectRequest = objectStore.getAll()
                                objectRequest.onsuccess = function () {
                                    arrayLength -= 1
                                    let data = {
                                        method: "syncServer",
                                        database: database.name,
                                        array,
                                        object: objectRequest.result
                                    }
                                    self.socket.send(data)
                                    console.log('sync success', { database: database.name, array })
                                    if (!arrayLength && db.close) {
                                        db.close()
                                        console.log('sync completed')
                                    }
                                }

                                objectRequest.onerror = function () {
                                    console.log('sync failed', { database: database.name, array })
                                    if (!arrayLength && db.close) {
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

        ObjectId,
        getValueFromObject,
        getAttributeNames,
        setAttributeNames

    };

    CoCreateCRUD.setSocket();
    if (isBrowser) {
        CoCreateCRUD.syncListeners();
        let attributes = {
            // attribute | variable
            host: 'host',
            organization_id: 'organization_id',
            apikey: 'apikey',
            storage: 'storage',
            database: 'database',
            array: 'array',
            // array: 'array',
            // table: 'array',
            object: 'object',
            // document: 'object',
            // row: 'object',
            key: 'key',
            // property: 'key',
            // name: 'key',
            updateName: 'updateName',
            index: 'index',
            crud: 'isCrud',
            crdt: 'isCrdt',
            realtime: 'isRealtime',
            save: 'isSave',
            update: 'isUpdate',
            delete: 'isDelete',
            upsert: 'isUpsert',
            read: 'isRead',
            listen: 'isListen',
            broadcast: 'broadcast',
            'broadcast-sender': 'broadcastSender',
            'broadcast-browser': 'broadcastBrowser',
            room: 'room',
            pass_id: 'pass_id',
            'pass-refresh': 'passRefresh'
        }

        if (!window.CoCreateConfig)
            window.CoCreateConfig = { attributes }
        else if (!window.CoCreateConfig.attributes)
            window.CoCreateConfig.attributes = attributes
        else
            setAttributeNames(attributes, false)

    }

    return CoCreateCRUD;
}));
