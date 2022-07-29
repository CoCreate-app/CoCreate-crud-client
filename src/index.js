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
        
        setSocket: function(socket) {
            this.socket = socket;
   
            if (isBrowser) {
                let crud_socket = window.CoCreateSockets;
        
                if (!crud_socket) {
                    crud_socket = new CoCreateSocket('ws');
                    window.CoCreateSockets = crud_socket;
                }
        
                this.socket = crud_socket;
                this.socket.create(window.config);
            }
        },


        createDocument: async function(info) {
            if(!info) 
                return false;
            let response = await this.sendRequest(info, 'updateDocument')
            return response
        },

        updateDocument: async function(info) {
            if(info['document_id'] && !utilsCrud.checkAttrValue(info['document_id']))
                return null;
            let response = await this.sendRequest(info, 'updateDocument')
            return response
        },

        readDocument: async function(info) {
            if(!info || !utilsCrud.checkAttrValue(info['document_id']))
                return null;
            let response = await this.sendRequest(info, 'readDocument')
            return response
        },


        deleteDocument: async function(info) {
            if(!info || !utilsCrud.checkAttrValue(info['document_id']))
                return null;
            let response = await this.sendRequest(info, 'deleteDocument')
            return response
        },

        readDocuments: async function(info) {
            if(!info && !info.collection) 
                return null;
            let response = await this.sendRequest(info, 'readDocuments')
            return response
        },

        createCollection: async function(info) {
            let response = await this.sendRequest(info, 'createCollection')
            return response
        },

        readCollections: async function(info) {
            let response = await this.sendRequest(info, 'readCollections')
            return response
        },

        updateCollection: async function(info) {
            let response = await this.sendRequest(info, 'updateCollection')
            return response
        },

        deleteCollection: async function(info) {
            let response = await this.sendRequest(info, 'deleteCollection')
            return response
        },

        sendRequest: async function(info, action) {
            let commonData = this.socket.getCommonParams(info);
            let requestData = { ...commonData, ...info };

            try {
                let response = await this.socket.send(action, requestData);
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
                    namespace,
                    room,
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
            let { collection, document_id, name, namespace, room, broadcast, broadcast_sender, isSave } = utilsCrud.getAttr(element);
            let valueType = element.getAttribute('value-type');
            if(valueType == 'object' || valueType == 'json'){
                value = JSON.parse(value)
            }
            if(isSave == "false" || !collection || !name || document_id == 'pending' || name == '_id') return;

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
                        data: {
                            [name]: value
                        },
                    });
                }
            }
            else {
                if(typeof option == 'string' && window.CoCreate.crdt) {
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
    
    CoCreateCRUD.setSocket();
    
    return CoCreateCRUD;
}));
