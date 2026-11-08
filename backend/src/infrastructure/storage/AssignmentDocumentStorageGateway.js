const fs = require('fs');
const path = require('path');
const yauzl = require('yauzl');
const LocalFileStorageGateway = require('./LocalFileStorageGateway');
class AssignmentDocumentStorageGateway extends LocalFileStorageGateway {
  async validDocument(filename, mimeType) {
    const target = this.resolveWithin(filename);
    if (!target || !fs.existsSync(target) || !fs.lstatSync(target).isFile()) return false;
    const fd = fs.openSync(target, 'r'), header = Buffer.alloc(8);
    try { fs.readSync(fd, header, 0, 8, 0); } finally { fs.closeSync(fd); }
    const ext = path.extname(filename);
    if (ext === '.pdf') return mimeType === 'application/pdf' && header.subarray(0, 5).toString() === '%PDF-';
    if (ext === '.doc') return mimeType === 'application/msword' && header.equals(Buffer.from('d0cf11e0a1b11ae1', 'hex'));
    if (ext !== '.docx' || mimeType !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || header.readUInt32LE(0) !== 0x04034b50) return false;
    return new Promise(resolve => {
      yauzl.open(target, { lazyEntries: true }, (error, zip) => {
        if (error) return resolve(false);
        let count = 0, size = 0; const names = new Set();
        zip.on('error', () => { zip.close(); resolve(false); });
        zip.on('entry', entry => {
          count++; size += entry.uncompressedSize;
          if (count > 2000 || size > 64 * 1024 * 1024 || entry.generalPurposeBitFlag & 1) { zip.close(); return resolve(false); }
          names.add(entry.fileName); zip.readEntry();
        });
        zip.on('end', () => resolve(names.has('[Content_Types].xml') && names.has('word/document.xml')));
        zip.readEntry();
      });
    });
  }
  expiredDocumentFilenames(now = Date.now()) {
    if (!fs.existsSync(this.rootDirectory)) return [];
    return fs.readdirSync(this.rootDirectory).filter(filename => {
      const match = /^(\d{13})-[a-f0-9]{24}\.(pdf|doc|docx)$/.exec(filename);
      const target = this.resolveWithin(filename);
      return match && Number(match[1]) < now - 86400000 && target && fs.lstatSync(target).isFile();
    });
  }
}
module.exports = AssignmentDocumentStorageGateway;
