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
			if (path.indexOf('.') == -1 && path.includes('collection'))
				json = this.dataOriginal
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

		let collection = el.getAttribute('collection');
		let document_id = el.getAttribute('document_id');
		let name = el.getAttribute('name');
		let isCrud = el.getAttribute('crud');
		let isCrdt = el.getAttribute('crdt');
		let isRealtime = el.getAttribute('realtime');
		let isSave = el.getAttribute('save');
		let isUpdate = el.getAttribute('udpdate');
		let isUpsert = el.getAttribute('upsert');
		let isRead = el.getAttribute('read');
		let isListen = el.getAttribute('listen');
		let room = el.getAttribute('room');
		let namespace = el.getAttribute('namespace');
		let isBroadcast = el.getAttribute('broadcast');
		let isBroadcastSender = el.getAttribute('broadcast-sender');

		return {
			collection,
			document_id,
			name,
			isCrud,
			isCrdt,
			isRealtime,
			isSave,
			isUpdate,
			isUpsert,
			isRead,
			isListen,
			isBroadcast,
			isBroadcastSender,
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

		// ToDo temporary... Once we update crdt to not use document_id Null will no longer need
		if(attr.toLowerCase() === "null") return false;
		return true;
	}

	return {
		getObjectValueByPath,
		getAttr,
		checkAttrValue
	};

}));
