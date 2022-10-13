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

	function getAttr(el) {
		if(!el) return;

		let attributes = window.CoCreateConfig.attributes;
		if (!attributes) {
			attributes = {
				host: 'host',
				organization_id: 'organization_id',
				apikey: 'apikey',
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
				isCrud: 'isCrud',
				isCrdt: 'isCrdt',
				isRealtime: 'isRealtime',
				isSave: 'isSave',
				isUpdate: 'isUpdate',
				isUpsert: 'isUpsert',
				isRead: 'isRead',
				isListen: 'isListen',
				broadcast: 'broadcast',
				broadcastSender: 'broadcastSender',
				room: 'room'
			}
		}
		let object = {};

		for (let attribute of el.attributes) {
			let attr = attributes[attribute.name]
			if (attr) {
				object[attr] = attribute.value
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

	return {
		getObjectValueByPath,
		getAttr,
		checkAttrValue
	};

}));
