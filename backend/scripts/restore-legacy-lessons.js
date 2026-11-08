const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const MongoDBUtil = require('../src/utils/database/MongoDBUtil');
const restoreLegacyLessonPublication = require('../src/infrastructure/persistence/mongoose/migrations/restoreLegacyLessonPublication');

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1 || args.length > 2 || (args[1] && args[1] !== '--apply')) {
    throw new Error('Usage: node scripts/restore-legacy-lessons.js <courseId> [--apply]');
  }
  try {
    await MongoDBUtil.connect();
    const result = await restoreLegacyLessonPublication(args[0], { apply: args.includes('--apply') });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await MongoDBUtil.disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
