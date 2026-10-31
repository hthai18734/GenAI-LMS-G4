const { spawn } = require('node:child_process');
const path = require('node:path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const integrationTests = [
  'tests/controller/Auth.integration.test.js',
  'tests/controller/AuthQC.integration.test.js',
  'tests/controller/Iteration2.integration.test.js',
  'tests/controller/UserReview.integration.test.js',
];

function runTest(testFile, mongoUri) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--test', path.resolve(testFile)], {
      stdio: 'inherit',
      env: { ...process.env, TEST_MONGODB_URI: mongoUri },
    });
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
}

async function main() {
  const mongo = await MongoMemoryServer.create();
  try {
    const exitCodes = await Promise.all(
      integrationTests.map((testFile) => runTest(testFile, mongo.getUri())),
    );
    if (exitCodes.some((code) => code !== 0)) process.exitCode = 1;
  } finally {
    await mongo.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
