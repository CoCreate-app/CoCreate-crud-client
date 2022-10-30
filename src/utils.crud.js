(function(root, factory) {
	if(typeof define === 'function' && define.amd) {
		define([], function() {
			return factory();
		});
	}
	else if(typeof module === 'object' && module.exports) {
		module.exports = factory();
	}
	else {
		// Browser globals (root is window)
		root.returnExports = factory();
	}
}(typeof self !== 'undefined' ? self : this, function() {
	
	let attributes = {
		// attribute | variable
		host: 'host',
		organization_id: 'organization_id',
		organization: 'organization_id',
		apikey: 'apikey',
		db: 'db',
		database: 'database',
		collection: 'collection',
		table: 'collection',
		document: 'document_id',
		document_id: 'document_id',
		row: 'document_id',
		name: 'name',
		key: 'name',
		updateName: 'updateName',
		deleteName: 'deleteName',
		crud: 'isCrud',
		crdt: 'isCrdt',
		realtime: 'isRealtime',
		save: 'isSave',
		update: 'isUpdate',
		upsert: 'isUpsert',
		read: 'isRead',
		listen: 'isListen',
		broadcast: 'broadcast',
		broadcastSender: 'broadcastSender',
		room: 'room',
		pass_id: 'pass_id'
	}

	if (!window.CoCreateConfig) 
		window.CoCreateConfig = {}
	if (!window.CoCreateConfig.attributes) { 
		window.CoCreateConfig.attributes = attributes
	} else {
		window.CoCreateConfig.attributes = {...window.CoCreateConfig.attributes, ...attributes}
	}

	function getAttr(el) {
		if(!el) return;

		let attributes = window.CoCreateConfig.attributes;
		let object = {};

		for (let attribute of el.attributes) {
			let variable = attributes[attribute.name]
			if (variable) {
				object[variable] = attribute.value
			} 
		}

		return object
	}


	// if value empty, null  or document_id="{{data.value}}" return false
	function checkAttrValue(attr) {
		if(!attr) return false;
		if(/{{\s*([\w\W]+)\s*}}/g.test(attr)) {
			return false;
		}

		// ToDo: temporary... Once we update crdt to not use document_id Null will no longer need
		if(attr.toLowerCase() === "null") return false;
		return true;
	}
	

	function getObjectValueByPath(json, path) {
		try {
			if(typeof json == 'undefined' || !path)
				return null;
			// if (path.indexOf('.') == -1 && path.includes('collection'))
			// 	json = this.dataOriginal
			if (/\[([0-9]*)\]/g.test(path)) {
				path = path.replace(/\[/g, '.');
				if (path.endsWith(']'))
					path = path.slice(0, -1)
				path = path.replace(/\]./g, '.');
				path = path.replace(/\]/g, '.');
			}
			let jsonData = json, subpath = path.split('.');
			
			for (let i = 0; i < subpath.length; i++) {
				jsonData = jsonData[subpath[i]];
				if (!jsonData) return null;
			}
			return jsonData;
		}catch(error){
			console.log("Error in getValueFromObject", error);
			return null;
		}
	}

	return {
		getAttr,
		checkAttrValue,
		getObjectValueByPath
	};

}));
