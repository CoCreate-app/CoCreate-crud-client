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
}(typeof self !== 'undefined' ? self : this, function(isBrowser, {ObjectId, getValueFromObject, checkValue, getAttributes, getAttributeNames, setAttributeNames}) {

	if (isBrowser) {
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
			'broadcast-sender': 'broadcastSender',
			'broadcast-browser': 'broadcastBrowser',
			room: 'room',
			pass_id: 'pass_id',
			'pass-refresh': 'passRefresh'
		}
	
		if (!window.CoCreateConfig) 
			window.CoCreateConfig = {attributes}
		else if (!window.CoCreateConfig.attributes)
			window.CoCreateConfig.attributes = attributes
		else
			setAttributeNames(attributes, false)
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
