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

	// ToDo: apply variable for attributes and check config variables and apply defaults
	function getAttr(el) {
		if(!el) return;
		let attributes = window.CoCreateConfig.attributes || {}

		let host = el.getAttribute(attributes.host || 'host');
		let organization_id = el.getAttribute(attributes.organization_id ||  'organization_id');
		let apikey = el.getAttribute(attributes.apikey || 'apikey');
		let database = el.getAttribute(attributes.database || 'database');
		let collection = el.getAttribute(attributes.collection || 'collection');
		let document_id = el.getAttribute(attributes.document_id || 'document_id');
		let name = el.getAttribute(attributes.name || 'name');
		let updateName = el.getAttribute(attributes.updateName || 'updateName');
		let deleteName = el.getAttribute(attributes.deleteName || 'deleteName');
		let isCrud = el.getAttribute(attributes.crud || 'crud');
		let isCrdt = el.getAttribute(attributes.crdt || 'crdt');
		let isRealtime = el.getAttribute(attributes.realtime || 'realtime');
		let isSave = el.getAttribute(attributes.save || 'save');
		let isUpdate = el.getAttribute(attributes.udpdate || 'udpdate');
		let isUpsert = el.getAttribute(attributes.upsert || 'upsert');
		let isRead = el.getAttribute(attributes.read || 'read');
		let isListen = el.getAttribute(attributes.listen || 'listen');
		let room = el.getAttribute(attributes.room || 'room');
		let namespace = el.getAttribute(attributes.namespace || 'namespace');
		let broadcast = el.getAttribute(attributes.broadcast || 'broadcast');
		let broadcastSender = el.getAttribute(attributes['broadcast-sender'] || 'broadcast-sender');

		return {
			host,
			organization_id,
			apikey,
			database,
			collection,
			document_id,
			name,
			updateName,
			deleteName,
			isCrud,
			isCrdt,
			isRealtime,
			isSave,
			isUpdate,
			isUpsert,
			isRead,
			isListen,
			broadcast,
			broadcastSender,
			room,
			namespace,
		};
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
