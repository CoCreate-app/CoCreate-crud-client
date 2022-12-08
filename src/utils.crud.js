(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(["@cocreate/utils"], function(utils) {
            return factory(true, utils);
        })
    }
    else if (typeof module === 'object' && module.exports) {
        const utils = require("@cocreate/utils");
        module.exports = factory(false, utils);
    }
    else {
        root.returnExports = factory(true, root["@cocreate/utils"]);
    }
}(typeof self !== 'undefined' ? self : this, function(isBrowser, {ObjectId, getValueFromObject, checkValue}) {

	let attributes = {
		// attribute | variable
		host: 'host',
		organization_id: 'organization_id',
		apikey: 'apikey',
		db: 'db',
		database: 'database',
		collection: 'collection',
		document_id: 'document_id',
		name: 'name',
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
		pass_id: 'pass_id',
		'pass-refresh': 'passRefresh'
	}

	if (isBrowser) {
		if (!window.CoCreateConfig) 
			window.CoCreateConfig = {attributes}
		else if (!window.CoCreateConfig.attributes)
			window.CoCreateConfig.attributes = attributes
		else
			setAttributeNames(attributes, false)
	}

	function setAttributeNames(attributes, overWrite) {
		let reversedObject = {}
		for (const key of Object.keys(CoCreateConfig.attributes)) {
			reversedObject[CoCreateConfig.attributes[key]] = key
		}

		for (const attribute of Object.keys(attributes)) {
			const variable = attributes[attribute]
			if (!reversedObject[variable] || overWrite != false)
				reversedObject[variable] = attribute
		}

		let revertObject = {}
		for (const key of Object.keys(reversedObject)) {
			revertObject[reversedObject[key]] = key
		}
		CoCreateConfig.attributes = revertObject
	}

	function getAttributeNames(variables) {
		let reversedObject = {}
		for (const key of Object.keys(CoCreateConfig.attributes)) {
			reversedObject[CoCreateConfig.attributes[key]] = key
		}

		let attributes = [];
		for (const variable of variables) {
			let attribute = reversedObject[variable]
			if (attribute)
				attributes.push(attribute)
		}
		return attributes
	}
	
	function getAttributes(el) {
		if (!el) return;

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
	
	return {
		getAttributes,
		getAttributeNames,
		setAttributeNames,
		checkValue,
		ObjectId,
		getValueFromObject
	};

}));
