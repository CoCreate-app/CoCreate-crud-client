import CoCreateSocket from "@cocreate/socket"
import {getCommonParams, getCommonParamsExtend, generateSocketClient} from "@cocreate/socket-client/src/common-fun.js"
import utilsCrud from "@cocreate/crud/src/utils.crud.js"

let socket = new CoCreateSocket('ws');

// let crud = CRUD(socket)

// var data = {
//   "org_id": "xxx",
//   "customer.name": "Jin",
//   "customer.fristname": "Jin",
//   "customer.lastname": "CF",
//   "customer.address.line1": "line1",
//   "customer.address.line2": "line2",
//   'scope[0]': 'testing',
//   'scope[1]': '---',
//   "customer.orders[0]": 123,
//   "customer.orders[1]": 243,
// }

// var obj = {
//   test: {
//     "name": '123',
//     "address": 'address',
//     "customer": {
//       "name": 'tttt'
//     },
//     "orders": [1,2,3]
//   }
// }
// console.log('----- convert object -----')
// console.log(utilsCrud.decodeObject(data));
// console.log(utilsCrud.encodeObject(obj));

const CoCreateCRUD = {
  socket: null,
  setSocket: function(socket) {
    this.socket = socket;
  },
  /*
   
    CoCreate.crud.readDcoumentList {
      collection: "modules",
      element: "xxxx",
      metadata: "",
      operator: {
        fetch: {
          name: 'xxxx',
          value: 'xxxxx'
        },
        filters: [{
          name: 'field1',
          operator: "contain | range | eq | ne | lt | lte | gt | gte | in | nin",
          value: [v1, v2, ...]
        }, {
          name: "_id",
          opreator: "in",
          value: ["id1"]
        }, {
          ....
        }],
        orders: [{
          name: 'field-x',
          type: 1 | -1
        }],
        search: {
          type: 'or | and',
          value: [value1, value2]
        },
        
        startIndex: 0 (integer),
        count: 0 (integer)
      },
      
      is_collection: true | false,
      //. case fetch document case
      created_ids : [id1, id2, ...],
      
      
      -------- additional response data -----------
      data: [] // array
    }
  */
  
  readDocumentList(info){
    if( !info ) return;
    let request_data = getCommonParams();
    
    if (!info.collection || !info.operator) {
      return;
    }
    
    request_data = {...request_data, ...info};
    
    this.socket.send('readDocumentList', request_data);
  },
  
  
  /*
  CoCreate.crud.createDocument({
    namespace:'',
    room:'',
    broadcast: true/false, (default=ture)
    broadcast_sender: true/false, (default=true) 
    
    collection: "test123",
    data:{
    	name1:“hello”,
    	name2:  “hello1”
    },
    element: “xxxx”,
    metaData: "xxxx"
  }),
  */
  // data param needs organization_id field added to pass security check
  createDocument: function(info) {
    if (info === null) {
      return;
    }
    let commonData = getCommonParamsExtend(info);
    let request_data = {...info, ...commonData};

    let data = info.data || {};
    
    if (!data['organization_id']) {
      data['organization_id'] = config.organization_Id
    }
    if (info['data']) {
      data = {...data, ...info['data']}
    }
    
    //. rebuild data
    request_data['data'] = data;

    /** socket parameters **/
    // if (info['broadcast'] === undefined) {
    //   request_data['broadcast'] = true;
    // }
    // if (info['broadcast_sender'] === undefined) {
    //   request_data['broadcast_sender'] = true;
    // }
    
    const room = generateSocketClient(info.namespace, info.room);
    this.socket.send('createDocument', request_data, room);
  },
  

  

  /*
  CoCreate.crud.updateDocument({
    namespace: '',
    room: '',
    broadcast: true/false,
    broadcast_sender: true/false,
    
    collection: "test123",
    document_id: "document_id",
    data:{
    	name1:“hello”,
    	name2:  “hello1”
    },
    delete_fields:["name3", "name4"],
    element: “xxxx”,
    metaData: "xxxx"
  }),
  */
  updateDocument: function(info) {
    if( !info || !info['document_id'] ) return;
    
    let commonData = getCommonParamsExtend(info);
    
    let request_data = {...info, ...commonData};
    
    if( typeof info['data'] === 'object' ) {
      request_data['set'] = info['data']
    }
    if( Array.isArray(info['delete_fields']) ) request_data['unset'] = info['delete_fields'];
    
    if(!request_data['set'] && !request_data['unset']) return;
    
    if (info.broadcast === false) {
      request_data['broadcast'] = false;
    }
    
    /** socket parameters **/
    if (info['broadcast_sender'] === undefined) {
      request_data['broadcast_sender'] = true;
    }
    
    const room = generateSocketClient(info.namespace, info.room);
    this.socket.send('updateDocument', request_data, room);
  },
  
  
  /*
  CoCreate.crud.readDocument({
    collection: "test123",
    document_id: "document_id",
    element: “xxxx”,
    metaData: "xxxx",
    exclude_fields: [] 
  }),
  */
  readDocument: function(info) {
    if (info === null) {
      return;
    }
    if (!info['document_id'] || !info) {
      return;
    }
    
    let commonData = getCommonParams();
    let request_data = {...info, ...commonData};
    this.socket.send('readDocument', request_data);
  },
  
  
  /*
  CoCreate.crud.deleteDocument({
    namespace: '',
    room: '',
    broadcast: true/false,
    broadcast_sender: true/false,
    
    collection: "module",
    document_id: "",
    element: “xxxx”,
    metadata: "xxxx"
  }),
  */
  deleteDocument: function(info) {
    if (!info['document_id'] || !info) {
      return;
    }
    
    let commonData = getCommonParams();
    let request_data = {...info, ...commonData};
    
    /** socket parameters **/
    // if (info['broadcast'] === undefined) {
    //   request_data['broadcast'] = true;
    // }
    // if (info['broadcast_sender'] === undefined) {
    //   request_data['broadcast_sender'] = true;
    // }
    
    const room = generateSocketClient(info.namespace, info.room);
    this.socket.send('deleteDocument', request_data, room);
  },


 /** export / import db functions **/
 
   /*
  readDocument({
    collection: "test123",
    element: “xxxx”,
    metaData: "xxxx",
  }),
  */
  exportCollection: function(info) {
    if (info === null) {
      return;
    }

    let request_data = getCommonParams();
    request_data['collection'] = info['collection'];
    request_data['export_type'] = info['export_type'];

    request_data['metadata'] = info['metadata']
    this.socket.send('exportDB', request_data);
  },
  
  /*
  readDocument({
    collection: "test123",
    file: file
  }),
  */
  importCollection: function(info) {
    const {file} = info;
    if (info === null || !(file instanceof File)) {
      return;
    }

    const extension = file.name.split(".").pop();
    
    if (!['json','csv'].some((item) => item === extension)) {
      return;
    }
    
    let request_data = getCommonParams()
    request_data['collection'] = info['collection']
    request_data['import_type'] = extension;
    this.socket.send('importDB', request_data)
    this.socket.sendFile(file);
  },
  
  
  //. message listener
  listenMessage: function(message, fun) {
    this.socket.listen(message, fun);
  },
  
  listenerReadDocument: function(fun) {
    this.socket.listen("readDocument", fun);
  },
  listenerCreateDocument: function(fun) {
    this.socket.listen("createDocument", fun);
  },
  listenerDeleteDocument: function(fun) {
    this.socket.listen("deleteDocument", fun);
  },
  listenerUpdateDocument: function(fun) {
    this.socket.listen("updateDocument", fun);
  },
  listenerReadDocumentList: function(fun) {
    this.socket.listen("readDocumentList", fun);
  },
}

export default function CRUD(socket) {
  CoCreateCRUD.setSocket(socket);
  return CoCreateCRUD;
}

