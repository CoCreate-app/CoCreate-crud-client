/* global CoCreate, CustomEvent */
(function(root, factory) {
    if(typeof define === 'function' && define.amd) {
        define(["./utils.crud.js"], function(utilsCrud) {
            return factory(window, utilsCrud);
        });
    }
    else if(typeof module === 'object' && module.exports) {
        let wnd = {
            config: {},
            File: {}
        };
        const utils = require("./utils.crud.js");
        module.exports = factory(wnd, utils);
    }
    else {
        root.returnExports = factory(window, root["./utils.crud.js"]);
    }
}(typeof self !== 'undefined' ? self : this, function(wnd, utilsCrud) {

    const CoCreateCRUD = {
        socket: null,
        setSocket: function(socket) {
            this.socket = socket;
        },

        createDocument: async function(info) {
            if(info === null) {
                return false;
            }
            let commonData = this.socket.getCommonParamsExtend(info);
            let request_data = { ...info,
                ...commonData
            };

            let data = info.data || {};

            if(!data['organization_id']) {
                data['organization_id'] = commonData.organization_id || wnd.config.organization_Id;
            }
            if(info['data']) {
                data = { ...data,
                    ...info['data']
                };
            }

            //. rebuild data
            request_data['data'] = data;

            const room = this.socket.generateSocketClient(info.namespace, info.room);
            let request_id = this.socket.send('createDocument', request_data, room);

            try {
                let response = await this.socket.listenAsync(request_id);
                return response;
            }
            catch(e) {
                console.log(e);
                return null;
            }
        },

        updateDocument: async function(info) {
            if(!info) return false;

            if(info['document_id'] && !utilsCrud.checkAttrValue(info['document_id']))
                return false;

            let commonData = this.socket.getCommonParamsExtend(info);

            let request_data = { ...info,
                ...commonData
            };

            if(typeof info['data'] === 'object') {
                request_data['set'] = info['data'];
            }
            if(Array.isArray(info['delete_fields'])) request_data['unset'] = info['delete_fields'];

            if(!request_data['set'] && !request_data['unset']) return false;

            if(info.broadcast === false) {
                request_data['broadcast'] = false;
            }

            /** socket parameters **/
            if(info['broadcast_sender'] === undefined) {
                request_data['broadcast_sender'] = true;
            }

            const room = this.socket.generateSocketClient(info.namespace, info.room);
            let request_id = this.socket.send('updateDocument', request_data, room);

            try {
                let response = await this.socket.listenAsync(request_id);
                return response;
            }
            catch(e) {
                console.log(e);
                return null;
            }
        },

        /**
         * Usage: var data = await crud.readDocumentNew({collection, document_id})
         */
        readDocument: async function(info) {

            //. 
            if(info === null) {
                return null;
            }

            if(!info || !utilsCrud.checkAttrValue(info['document_id'])) {
                return null;
            }

            let commonData = this.socket.getCommonParamsExtend(info);
            let request_data = { ...info,
                ...commonData
            };
            let room = this.socket.generateSocketClient(info.namespace, info.room);
            if (!room) 
                room = commonData.organization_Id;
            let request_id = this.socket.send('readDocument', request_data,  room);
            try {
                let response = await this.socket.listenAsync(request_id);
                return response;
            }
            catch(e) {
                console.log(e);
                return null;
            }
        },


        deleteDocument: async function(info) {
            if(!info || !utilsCrud.checkAttrValue(info['document_id'])) {
                return null;
            }

            let commonData = this.socket.getCommonParamsExtend(info);
            let request_data = { ...info,
                ...commonData
            };

            const room = this.socket.generateSocketClient(info.namespace, info.room);
            let request_id = this.socket.send('deleteDocument', request_data, room);
            try {
                //. new section
                let response = await this.socket.listenAsync(request_id);
                return response;
            }
            catch(e) {
                console.log(e);
                return null;
            }
        },

        readDocumentList: async function(info) {
            if(!info) return false;
            if(!info.collection) {
                return false;
            }
            let commonData = this.socket.getCommonParamsExtend(info);
            let request_data = { ...info,
                ...commonData
            };

            const room = this.socket.generateSocketClient(info.namespace, info.room);
            if (!room) 
                room = commonData.organization_Id;

            const request_id = this.socket.send('readDocumentList', request_data, room);

            try {
                let response = await this.socket.listenAsync(request_id);
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

        send: function(message, data, room) {
            this.socket.send(message, data, room);
        },
        
        listen: function(message, fun) {
            this.socket.listen(message, fun);
        },

        // ToDo: Depreciate?
        // listenAsync: function(eventname) {
        //     return this.socket.listenAsync(eventname);
        // },

        createSocket: function(host, namespace) {
            if(namespace) {
                this.socket.create({
                    namespace: namespace,
                    room: null,
                    host: host
                });
                this.socket.setGlobalScope(namespace);
            }
            else {
                this.socket.create({
                    namespace: null,
                    room: null,
                    host: host
                });
            }
        },

        read: async function(element, is_flat) {
            const {
                collection,
                document_id,
                name,
                namespace,
                room,
                isRead
            } = utilsCrud.getAttr(element);
            if(!utilsCrud.checkAttrValue(document_id)) return;

            if(is_flat !== false) is_flat = true;

            if(utilsCrud.isJsonString(collection) ||
                utilsCrud.isJsonString(document_id)) {
                return null;
            }

            if(isRead == "false") return;
            if(document_id && collection) {
                const responseData = await this.readDocument({
                    namespace,
                    room,
                    collection,
                    document_id,
                    name,
                    is_flat
                });
                return responseData;
            }
            return null;
        },

        save: async function(element, value, is_flat) {
            if(!element || value === null) return;
            let { collection, document_id, name, namespace, room, broadcast, broadcast_sender, isSave } = utilsCrud.getAttr(element);

            if(isSave == "false" || !collection || !name || document_id == 'pending') return;

            let data;
            if(!document_id) {
                element.setAttribute('document_id', 'pending');
                let form = element.closest('form');
                if(form) {
                    CoCreate.form.save(form);
                }
                else {
                    data = await this.createDocument({
                        collection,
                        broadcast,
                        broadcast_sender,
                        is_flat: is_flat !== false ? true : false,
                        data: {
                            [name]: value
                        },
                    });
                }
            }
            else {
                if(wnd.CoCreate.crdt) {
                    wnd.CoCreate.crdt.replaceText({
                        collection,
                        name,
                        document_id: data ? data.document_id : document_id,
                        value
                    });
                }
                else {
                    data = await this.updateDocument({
                        namespace,
                        room,
                        collection,
                        document_id,
                        upsert: true,
                        broadcast,
                        broadcast_sender,
                        is_flat: is_flat !== false ? true : false,
                        data: {
                            [name]: value
                        },
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

        ...utilsCrud
    };

    return CoCreateCRUD;
}));
