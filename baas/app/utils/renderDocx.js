const mammoth = require('mammoth');

async function docxToHtml(filePath) {
    try {
        const result = await mammoth.convertToHtml({ path: filePath });
        
        // Wrap the raw snippet in a clean document framework
        return `
            <article style="max-width: 800px; margin: 0 auto; padding: 2rem; background: white; color: #333; font-family: system-ui, sans-serif; line-height: 1.6; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 8px;">
                ${result.value}
            </article>
        `;
    } catch (err) {
        throw new Error("Word conversion failed: " + err.message);
    }
}

module.exports = { docxToHtml };