const { parentPort, workerData } = require('worker_threads');
const yauzl = require('yauzl');

function checkZip(buffer) {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, (error, zip) => {
      if (error) return reject(error);
      let total = 0;
      let entries = 0;
      let documentFound = false;
      const fail = (error) => {
        zip.close();
        reject(error);
      };
      zip.on('error', fail);
      zip.on('entry', (entry) => {
        if (
          ++entries > 1000 ||
          entry.uncompressedSize > 20 * 1024 * 1024 ||
          entry.generalPurposeBitFlag & 1
        )
          return fail(new Error('Archive limit'));
        if (entry.fileName === 'word/document.xml') documentFound = true;
        if (/\/$/.test(entry.fileName)) return zip.readEntry();
        zip.openReadStream(entry, (error, stream) => {
          if (error) return fail(error);
          stream.on('error', fail);
          stream.on('data', (chunk) => {
            total += chunk.length;
            if (total > 20 * 1024 * 1024) {
              stream.destroy();
              fail(new Error('Expanded size limit'));
            }
          });
          stream.on('end', () => zip.readEntry());
        });
      });
      zip.on('end', () => (documentFound ? resolve() : reject(new Error('Not a Word document'))));
      zip.readEntry();
    });
  });
}

(async () => {
  const buffer = Buffer.from(workerData.buffer);
  let text;
  if (workerData.extension === '.docx') {
    await checkZip(buffer);
    text = (await require('mammoth').extractRawText({ buffer })).value;
  } else {
    const WordExtractor = require('word-extractor');
    const document = await new WordExtractor().extract(buffer);
    text = document.getBody();
  }
  if (!text.trim() || text.length > 80000) throw new Error('Text limit');
  parentPort.postMessage({ text: text.trim() });
})().catch(() => parentPort.postMessage({ error: true }));
