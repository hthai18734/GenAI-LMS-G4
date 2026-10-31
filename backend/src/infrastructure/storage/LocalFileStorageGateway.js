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
}

module.exports = LocalFileStorageGateway;
