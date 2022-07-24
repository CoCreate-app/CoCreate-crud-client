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

	function __mergeObject(target, source) {
		target = target || {};
		for(let key of Object.keys(source)) {
			if(source[key] instanceof Object) {
				Object.assign(source[key], __mergeObject(target[key], source[key]));
			}
		}

		Object.assign(target || {}, source);
		return target;
	}

	function __createObject(data, path) {
		if(!path) return data;

		let keys = path.split('.');
		let newObject = data;

		for(var i = keys.length - 1; i >= 0; i--) {
			newObject = {
				[keys[i]]: newObject
			};
		}
		return newObject;
	}

	function __createArray(key, data) {
		try {
			let item = /([\w\W]+)\[(\d+)\]/gm.exec(key);
			if(item && item.length == 3) {
				let arrayKey = item[1];
				let index = parseInt(item[2]);

				if(!data[arrayKey] || !Array.isArray(data[arrayKey])) {
					data[arrayKey] = [];
				}
				data[arrayKey][index] = data[key];
				delete data[key];
				key = arrayKey;
			}
		}
		catch {
			console.log('create array error');
		}
		return key;
	}

	function getValueByPath(path, data) {
		try {
			if(!path || !data) return null;

			if(data[path]) return data[path];

			let keys = path.split('.');

			let tmp = { ...data };
			for(var i = 0; i < keys.length; i++) {
				if(!tmp) break;
				tmp = tmp[keys[i]];
			}
			return tmp;

		}
		catch {
			return null;
		}
	}

	// ToDo: currently not in use
	function isObject(item) {
		return(!!item) && (item.constructor === Object);
	}


	function isArray(item) {
		return(!!item) && (item.constructor === Array);
	}

	// ToDo: currently not in use
	function decodeObject(data) {
		let keys = Object.keys(data);
		let objectData = {};

		keys.forEach((k) => {
			k = __createArray(k, data);
			if(k.split('.').length > 1) {
				let newData = __createObject(data[k], k);
				delete data[k];

				objectData = __mergeObject(objectData, newData);
			}
			else {
				objectData[k] = data[k];
			}
		});
		return objectData;
	}

	function decodeArray(data) {
		let keys = Object.keys(data);
		let objectData = {};

		keys.forEach((k) => {
			let nk = k
			if (/\[([0-9]*)\]/g.test(k)) {
				nk = nk.replace(/\[/g, '.');
				if (nk.endsWith(']'))
					nk = nk.slice(0, -1)
				nk = nk.replace(/\]/g, '.');
			}
			objectData[nk] = data[k];
		});
		return objectData;
	}

	// ToDo: currently use only by htmltags
	function encodeObject(data) {
		let keys = Object.keys(data);
		let newData = {};
		keys.forEach((k) => {
			let data_value = data[k];
			if(isObject(data[k])) {
				let new_obj = encodeObject(data[k]);

				let newKeys = Object.keys(new_obj);
				newKeys.forEach((newKey) => {
					let value = new_obj[newKey];
					newKey = k + "." + newKey;
					newData[newKey] = value;
				});

			}
			else if(isArray(data_value)) {
				data_value.forEach((v, index) => {
					newData[`${k}[${index}]`] = v;
				});
			}
			else {
				newData[k] = data[k];
			}
		});
		return {...newData, ...data};
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
		let isFlat = el.getAttribute('flat');
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
			isFlat,
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
		decodeArray,
		decodeObject,
		encodeObject,
		getAttr,
		checkAttrValue,
		getValueByPath,
	};

}));
