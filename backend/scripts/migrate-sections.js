// Deliberately does not read .env or fall back to the application database.
const mongoose = require('mongoose');
const { migrateSections, rollbackSections } = require('../src/infrastructure/persistence/mongoose/migrations/sectionLessons');
async function main() {
  const args = process.argv.slice(2);
  const value = flag => args[args.indexOf(flag) + 1];
  const uri = args.includes('--uri') ? value('--uri') : '';
  const database = args.includes('--database') ? value('--database') : '';
  if (process.env.NODE_ENV === 'production' || !/^mongodb:\/\/(?:127\.0\.0\.1|localhost):\d+(?:\/|$)/.test(uri) || !/^[a-zA-Z0-9_-]*(?:test|local|dev)[a-zA-Z0-9_-]*$/.test(database)) {
    throw new Error('Explicit localhost --uri and test/local/dev --database are required; production is forbidden.');
  }
  await mongoose.connect(uri, { dbName: database });
  try {
    const action = args.includes('--rollback') ? rollbackSections : migrateSections;
    console.log(JSON.stringify(await action(mongoose.connection.db, { apply: args.includes('--apply') }), null, 2));
  } finally { await mongoose.disconnect(); }
}
main().catch(() => { console.error('Migration failed. Check explicit local/test arguments and database connectivity. No connection string is logged.'); process.exitCode = 1; });
