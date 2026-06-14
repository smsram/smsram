const hfStorage = require('../providers/hfStorage');

class StorageFactory {
    static async upload(fileBuffer, metadata, provider = 'hf') {
        if (provider === 'hf') {
            return hfStorage.upload(fileBuffer, metadata);
        }
        // You can add S3/Scaleway here later
        throw new Error("Provider not supported yet");
    }

    static async getStream(path, provider = 'hf') {
        if (provider === 'hf') {
            return hfStorage.getStream(path);
        }
        throw new Error("Provider not supported yet");
    }
}

module.exports = { StorageFactory };