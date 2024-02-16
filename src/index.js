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

/**
 * Commercial Licensing Information:
 * For commercial use of this software without the copyleft provisions of the AGPLv3,
 * you must obtain a commercial license from CoCreate LLC.
 * For details, visit <https://cocreate.app/licenses/> or contact us at sales@cocreate.app.
 */


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
        socket: CoCreateSocket,

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
                if (!data.method) {
                    // TODO: errorhandler(data, 'data.method is required')
                    return resolve(data);
                }

                data.timeStamp = new Date().toISOString();

                if (data.method.endsWith('.read'))
                    data.broadcast = data.broadcastBrowser = false

                if (!data.organization_id)
                    data.organization_id = await this.socket.organization_id()

                if (data.database || data.array || data.type) {
                    if (!data.storage)
                        data['storage'] = ['indexeddb', 'mongodb']
                    // TODO: if (!data.database, config.database) config will work in client and server or localStorage.database
                    if (!data.database)
                        data['database'] = data.organization_id
                }

                if (isBrowser && indexeddb && data['storage'].includes('indexeddb')) {
                    let response = await indexeddb.send(data)

                    let type = data.method.split('.')[0];
                    if (data.status !== 'await' && type && response && response[type] && response[type].length) {
                        resolve(response);
                        response.status = 'resolve'
                        response.resolved = true

                        this.socket.send(response)
                    } else {
                        this.socket.send(response || data).then((response) => {
                            resolve(response);
                        })
                    }
                } else {
                    this.socket.send(data).then((response) => {
                        resolve(response);
                    })
                }
            })
        },

        listen: function (method, callback) {
            // TODO: this.socket.listen('crud.' + method, callback);
            this.socket.listen(method, callback);
        },

        syncListeners: function () {
            const type = ['storage', 'database', 'array', 'index', 'object'];
            const method = ['create', 'read', 'update', 'delete'];

            for (let i = 0; i < type.length; i++) {
                for (let j = 0; j < method.length; j++) {
                    const action = type[i] + '.' + method[j];
                    const self = this
                    this.listen(action, function (data) {
                        self.sync(data)
                    });
                }
            }
        },

        sync: async function (data) {
            if (indexeddb && data.uid && data.status && data.status == 'received') {
                if (data.method.endsWith('.read')) {
                    if (this.socket.has(data.socketId)) {
                        const self = this
                        let type = data.method.split(".")[0]
                        if (!data[type] || !data[type].length)
                            return
                        // let deletedItems = await this.getDeletedItems()
                        let isDeleted = '' // this.isDeleted(type, items[i], deletedItems)

                        if (isDeleted) {
                            console.log('sync failed item recently deleted')
                        } else {
                            for (let i = 0; i < data[type].length; i++) {
                                let key, value
                                if (data[type][i].modified && data[type][i].modified.on) {
                                    key = 'modified.on'
                                    value = data[type][i].modified.on
                                } else if (data[type][i].created && data[type][i].created.on) {
                                    key = 'created.on'
                                    value = data[type][i].created.on
                                } else
                                    continue

                                let response = await indexeddb.send({
                                    clientId: data.clientId,
                                    frameId: data.frameId,
                                    socketId: data.socketId,
                                    method: type + '.update',
                                    array: data.array,
                                    [type]: data[type][i],
                                    $filter: {
                                        query: { [key]: { $lt: value } },
                                    },
                                    upsert: true,
                                    user_id: data.user_id,
                                    organization_id: data.organization_id
                                })

                                if (response && response[type] && response[type].length) {
                                    console.log('crud synced: ', response[type])
                                    self.socket.sendLocalMessage(response)
                                }
                            }
                        }
                    }
                } else if (this.socket.clientId != data.clientId || data.updateDB) {
                    // TODO: if database was updated due to host and environment handling
                    if (data.updateDB)
                        data.database = data.organization_id

                    // TODO: returned from server socket.send authorize
                    if (data.$filter && data.$filter.query && data.$filter.query._id && data.$filter.query._id.$eq === '$user_id')
                        data.$filter.query.$eq = this.socket.user_id

                    indexeddb.send({ ...data })
                }
            }
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
            state_id: 'state_id',
            'state-overwrite': 'stateOverwrite'
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
