const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const sourceRoot = path.resolve(__dirname, '../../src');

function javascriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return javascriptFiles(target);
    return entry.isFile() && entry.name.endsWith('.js') ? [target] : [];
  });
}

function relative(file) {
  return path.relative(sourceRoot, file).replaceAll('\\', '/');
}

function findImports(files, forbidden) {
  const violations = [];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    for (const pattern of forbidden) {
      if (pattern.test(source)) violations.push(`${relative(file)} matches ${pattern}`);
    }
  }
  return violations;
}

test('HTTP controllers depend on use cases, never persistence', () => {
  const files = javascriptFiles(path.join(sourceRoot, 'controller'));
  assert.deepEqual(findImports(files, [
    /require\(['"][^'"]*(?:dao|model|infrastructure)\//,
    /require\(['"]mongoose['"]\)/,
  ]), []);
});

test('application services are independent from HTTP and Mongoose', () => {
  const files = javascriptFiles(path.join(sourceRoot, 'service'));
  assert.deepEqual(findImports(files, [
    /require\(['"][^'"]*(?:controller|filter|model|routes|infrastructure)\//,
    /require\(['"](?:express|mongoose)['"]\)/,
    /\b(?:req|res)\.(?:body|params|query|user|status|json|redirect|setHeader)\b/,
  ]), []);
});

test('controllers and services do not execute Mongoose document/query methods', () => {
  const files = [
    ...javascriptFiles(path.join(sourceRoot, 'controller')),
    ...javascriptFiles(path.join(sourceRoot, 'service')),
  ];
  assert.deepEqual(findImports(files, [/(?<!Repository)\.save\s*\(/, /\.lean\s*\(/, /\.populate\s*\(/, /\.session\s*\(/]), []);
});

test('domain policy modules are framework and infrastructure independent', () => {
  const files = javascriptFiles(path.join(sourceRoot, 'domain'));
  assert.deepEqual(findImports(files, [
    /require\(['"](?:express|mongoose|jsonwebtoken|multer|nodemailer)['"]\)/,
    /require\(['"][^'"]*(?:application|composition|controller|dao|dto|filter|infrastructure|model|routes|service|utils)\//,
  ]), []);
});

test('persistence adapters do not depend on HTTP delivery code', () => {
  const files = javascriptFiles(path.join(sourceRoot, 'infrastructure', 'persistence', 'mongoose', 'repositories'));
  assert.deepEqual(findImports(files, [
    /require\(['"][^'"]*(?:application|composition|controller|dto|filter|routes|service)\//,
    /require\(['"]express['"]\)/,
  ]), []);
});

test('application repository ports have no infrastructure dependency', () => {
  const files = javascriptFiles(path.join(sourceRoot, 'application', 'ports'));
  assert.deepEqual(findImports(files, [
    /require\(['"][^'"]*(?:composition|controller|filter|infrastructure|model|routes|service|utils)\//,
    /require\(['"](?:express|mongoose)['"]\)/,
  ]), []);
});

test('only the composition root wires use cases to infrastructure adapters', () => {
  const files = javascriptFiles(sourceRoot).filter(file => !relative(file).startsWith('composition/'));
  assert.deepEqual(findImports(files, [
    /require\(['"][^'"]*infrastructure\/persistence\/mongoose\/repositories\//,
  ]), []);
});

test('legacy DAO modules are fully removed', () => {
  assert.equal(fs.existsSync(path.join(sourceRoot, 'dao')), false);
  const files = javascriptFiles(sourceRoot);
  assert.deepEqual(findImports(files, [/require\(['"][^'"]*\/dao\//]), []);
});

test('repository boundary converts Mongoose documents to application records', async () => {
  const toApplicationRepository = require('../../src/infrastructure/persistence/mongoose/toApplicationRepository');
  const document = { toObject: () => ({ id: 'record-1', title: 'Plain record' }) };
  const repository = toApplicationRepository({
    findOne: async () => document,
    findMany: async () => [document],
  });
  assert.deepEqual(await repository.findOne(), { id: 'record-1', title: 'Plain record' });
  assert.deepEqual(await repository.findMany(), [{ id: 'record-1', title: 'Plain record' }]);
});

test('DTOs are boundary objects without persistence or use-case dependencies', () => {
  const files = javascriptFiles(path.join(sourceRoot, 'dto'));
  assert.deepEqual(findImports(files, [
    /require\(['"][^'"]*(?:controller|dao|filter|infrastructure|model|routes|service)\//,
    /require\(['"](?:express|mongoose)['"]\)/,
  ]), []);
});

test('routes compose middleware and controllers only', () => {
  const files = javascriptFiles(path.join(sourceRoot, 'routes'));
  assert.deepEqual(findImports(files, [
    /require\(['"][^'"]*(?:dao|infrastructure|model|service|dto)\//,
  ]), []);
});

test('persistence models do not depend on application or delivery layers', () => {
  const files = javascriptFiles(path.join(sourceRoot, 'model'));
  assert.deepEqual(findImports(files, [
    /require\(['"][^'"]*(?:application|composition|controller|dao|dto|filter|routes|service|utils)\//,
  ]), []);
});
