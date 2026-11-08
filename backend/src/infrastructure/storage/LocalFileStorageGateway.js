const fs = require('fs');
const path = require('path');

class LocalFileStorageGateway {
  constructor({ rootDirectory } = {}) {
    this.rootDirectory = rootDirectory ? path.resolve(rootDirectory) : null;
  }

  exists(filePath) {
    return Boolean(filePath) && fs.existsSync(filePath);
  }

  removeBestEffort(filePath) {
    try {
      if (this.exists(filePath)) fs.unlinkSync(filePath);
      return true;
    } catch {
      return false;
    }
  }

  extension(filePath) {
    return path.extname(filePath || '');
  }

  resolveWithin(filename) {
    if (!this.rootDirectory) throw new Error('Storage root directory is required.');
    const filePath = path.resolve(this.rootDirectory, filename);
    if (path.dirname(filePath) !== this.rootDirectory) return null;
    return filePath;
  }

  validVideo(filename, mimeType) {
    const filePath = this.resolveWithin(filename);
    if (!filePath) return false;
    const fd = fs.openSync(filePath, 'r');
    try {
      const bytes = Buffer.alloc(16); fs.readSync(fd, bytes, 0, 16, 0);
      if (['video/mp4', 'video/quicktime'].includes(mimeType)) return bytes.toString('ascii', 4, 8) === 'ftyp';
      if (['video/webm', 'video/x-matroska'].includes(mimeType)) return bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
      if (mimeType === 'video/ogg') return bytes.toString('ascii', 0, 4) === 'OggS';
      return mimeType === 'video/x-msvideo' && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'AVI ';
    } finally { fs.closeSync(fd); }
  }

  expiredVideoFilenames(now = Date.now()) {
    if (!this.rootDirectory || !fs.existsSync(this.rootDirectory)) return [];
    return fs.readdirSync(this.rootDirectory).filter(filename => {
      const generated = /^(\d{13})-[a-f0-9]{24}\.(mp4|webm|ogv|mov|avi|mkv)$/.exec(filename);
      if (!generated || Number(generated[1]) > now - 24 * 60 * 60 * 1000) return false;
      const target = this.resolveWithin(filename);
      return Boolean(target) && fs.lstatSync(target).isFile();
    });
  }
}

module.exports = LocalFileStorageGateway;
