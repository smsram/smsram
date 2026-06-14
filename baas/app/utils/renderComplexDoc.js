const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function complexDocToHtml(filePath, fileExtension) {
    const outputDir = path.dirname(filePath);
    let workingPdfPath = filePath;

    // 1. If it's a PowerPoint, convert it to PDF first via LibreOffice
    if (fileExtension === '.pptx' || fileExtension === '.ppt') {
        execSync(`libreoffice --headless --convert-to pdf --outdir "${outputDir}" "${filePath}"`);
        workingPdfPath = filePath.replace(fileExtension, '.pdf');
    }

    // 2. Convert PDF to single-page structured HTML using poppler-utils
    const htmlOutputPath = filePath.replace(fileExtension, '.html');
    execSync(`pdftohtml -s -noframes "${workingPdfPath}" "${htmlOutputPath}"`);

    const cleanHtml = fs.readFileSync(htmlOutputPath, 'utf8');
    
    // Cleanup temporary files
    if (workingPdfPath !== filePath) fs.unlink(workingPdfPath, () => {});
    fs.unlink(htmlOutputPath, () => {});

    return cleanHtml;
}

module.exports = { complexDocToHtml };