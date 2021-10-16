/* global CoCreate, CustomEvent */

(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(["@cocreate/socket-client", "./utils.crud.js"], function(CoCreateSocket, utilsCrud) {
            return factory(true, CoCreateSocket, utilsCrud);
        });
    }
    else if (typeof module === 'object' && module.exports) {
        const utilsCrud = require("./utils.crud.js");
        const CoCreateSocket = require("@cocreate/socket-client");
        module.exports = factory(false, CoCreateSocket, utilsCrud);
    }
    else {
        root.returnExports = factory(true, root["@cocreate/socket-client"], root["./utils.crud.js"]);
    }
}(typeof self !== 'undefined' ? self : this, function(isBrowser, CoCreateSocket, utilsCrud) {
   
    const CoCreateCRUD = {
        socket: null,
        
        init: function(socket) {
            this.socket = socket;
   
            if (isBrowser) {
                let crud_socket = window.CoCreateSockets
        
                if (!crud_socket) {
                    crud_socket = new CoCreateSocket('ws');
                    window.CoCreateSockets = crud_socket;
                }
        
                    this.socket = crud_socket;
                    this.socket.create(window.config);
            }
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
                data['organization_id'] = commonData.organization_id || window.config.organization_Id;
            }
            if(info['data']) {
                data = { ...data,
                    ...info['data']
                };
            }

            //. rebuild data
            request_data['data'] = data;

            const room = this.socket.generateSocketClient(info.namespace, info.room);
            // let request_id = this.socket.send('createDocument', request_data, room);

            try {
                let response = await this.socket.send('createDocument', request_data, room);
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
            // let request_id = this.socket.send('updateDocument', request_data, room);

            try {
                let response = await this.socket.send('updateDocument', request_data, room);
                return response;
            }
            catch(e) {
                console.log(e);
                return null;
            }
        },

        readDocument: async function(info) {
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
            // let request_id = this.socket.send('readDocument', request_data,  room);
            try {
                let response = await this.socket.send('readDocument', request_data,  room);
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
            // let request_id = this.socket.send('deleteDocument', request_data, room);
            try {
                let response = await this.socket.send('deleteDocument', request_data, room);
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

            // const request_id = this.socket.send('readDocumentList', request_data, room);

            try {
                let response = await this.socket.send('readDocumentList', request_data, room);
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
                if(window.CoCreate.crdt) {
                    window.CoCreate.crdt.replaceText({
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
    
    CoCreateCRUD.init()
    
    return CoCreateCRUD;
}));
