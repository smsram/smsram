const axios = require('axios');
const { uploadFile } = require('@huggingface/hub');

const HF_TOKEN = process.env.HF_TOKEN;
const REPO_NAME = "smsram/smsram-vault"; 

const upload = async (fileBuffer, metadata) => {
    // Generate the path: project/bucket/filename
    const path = `${metadata.project_id}/${metadata.bucket}/${metadata.filename}`;
    
    // FIX: Convert Node.js Buffer to a standard Blob that the SDK accepts
    const fileBlob = new Blob([fileBuffer]);

    // Use the official SDK with the converted Blob
    await uploadFile({
        repo: { type: 'dataset', name: REPO_NAME },
        credentials: { accessToken: HF_TOKEN },
        file: {
            path: path,
            content: fileBlob // Passed seamlessly now
        },
        commitTitle: `Vault Upload: ${metadata.filename}`
    });

    return { path, provider: 'hf' };
};

const getStream = async (path) => {
    const url = `https://huggingface.co/datasets/${REPO_NAME}/resolve/main/${path}`;
    return axios({
        method: 'get',
        url,
        headers: { 'Authorization': `Bearer ${HF_TOKEN}` },
        responseType: 'stream'
    });
};

module.exports = { upload, getStream };