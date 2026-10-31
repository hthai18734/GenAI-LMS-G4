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
    /require\(['"][^'"]*composition\//,
    /require\(['"][^'"]*(?:dao|model|infrastructure|service)\//,
    /require\(['"]mongoose['"]\)/,
    /new\s+\w*Service\s*\(/,
    /common\/UseCases/,
  ]), []);
});

test('only infrastructure and composition import persistence models', () => {
  const files = javascriptFiles(sourceRoot).filter((file) => {
    const name = relative(file);
    return !name.startsWith('model/')
      && !name.startsWith('infrastructure/')
      && !name.startsWith('composition/');
  });
  assert.deepEqual(findImports(files, [
    /require\(['"][^'"]*model\//,
  ]), []);
});

test('startup never exposes protected material storage or fixed privileged credentials', () => {
  const indexSource = fs.readFileSync(path.join(sourceRoot, 'index.js'), 'utf8');
  assert.doesNotMatch(indexSource, /app\.use\(['"]\/uploads['"],\s*express\.static/);
  assert.doesNotMatch(indexSource, /express\.static\([^\n]*lesson-videos/);

  const source = javascriptFiles(sourceRoot)
    .map(file => fs.readFileSync(file, 'utf8'))
    .join('\n');
  assert.doesNotMatch(source, /ADMIN_PASSWORD\s*=\s*['"]/);
  assert.doesNotMatch(source, /TEACHER_PASSWORD\s*=\s*['"]/);
  assert.doesNotMatch(source, /req\.query\.token/);
});

test('application services are independent from HTTP and Mongoose', () => {
  const files = javascriptFiles(path.join(sourceRoot, 'service'));
  assert.deepEqual(findImports(files, [
    /require\(['"][^'"]*(?:controller|filter|model|routes|infrastructure)\//,
    /require\(['"](?:express|mongoose|fs|node:fs|path|node:path)['"]\)/,
    /require\(['"][^'"]*utils\/(?:email\/EmailUtil|ai\/GeminiClient|auth\/(?:JWTUtil|OAuthUtil|PasswordUtil)|common\/LoggerUtil|document\/ChatDocumentParser)['"]\)/,
    /\b(?:req|res)\.(?:body|params|query|user|status|json|redirect|setHeader)\b/,
  ]), []);
});

test('application services consume plain inputs rather than transport DTOs', () => {
  const files = javascriptFiles(path.join(sourceRoot, 'service'));
  assert.deepEqual(findImports(files, [
    /require\(['"][^'"]*dto\//,
    /\b(?:dto|queryDto)\.toObject\s*\(/,
  ]), []);
});

test('application services express repository queries without database operators', () => {
  const files = javascriptFiles(path.join(sourceRoot, 'service'));
  assert.deepEqual(findImports(files, [
    /\$(?:and|or|nor|regex|options|where|set|inc|ne|lt|lte|gt|gte|exists)\b/,
  ]), []);
});

test('controllers and services do not execute Mongoose document/query methods', () => {
  const files = [
    ...javascriptFiles(path.join(sourceRoot, 'controller')),
    ...javascriptFiles(path.join(sourceRoot, 'service')),
  ];
  assert.deepEqual(findImports(files, [/(?<!Repository)\.save\s*\(/, /\.lean\s*\(/, /\.populate\s*\(/, /\.session\s*\(/]), []);
  assert.deepEqual(findImports(javascriptFiles(path.join(sourceRoot, 'service')), [/\.toObject\s*\(/]), []);
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
    /require\(['"][^'"]*utils\//,
  ]), []);
});

test('only the composition root wires use cases to infrastructure adapters', () => {
  const files = javascriptFiles(sourceRoot).filter(file => !relative(file).startsWith('composition/'));
  assert.deepEqual(findImports(files, [
    /require\(['"][^'"]*infrastructure\/persistence\/mongoose\/repositories\//,
  ]), []);
});

test('only the composition root constructs application services', () => {
  const files = javascriptFiles(sourceRoot).filter(file => {
    const name = relative(file);
    return !name.startsWith('composition/') && !name.startsWith('service/');
  });
  assert.deepEqual(findImports(files, [
    /new\s+(?!ServiceError\b)\w*Service\s*\(/,
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

test('repository boundary recursively converts documents nested in paginated records', async () => {
  const toApplicationRepository = require('../../src/infrastructure/persistence/mongoose/toApplicationRepository');
  const document = { toObject: () => ({ id: 'record-1', title: 'Nested record' }) };
  const repository = toApplicationRepository({
    findPage: async () => ({ courses: [document], total: 1 }),
  });
  assert.deepEqual(await repository.findPage(), {
    courses: [{ id: 'record-1', title: 'Nested record' }],
    total: 1,
  });
});

test('DTOs are boundary objects without persistence or use-case dependencies', () => {
  const files = javascriptFiles(path.join(sourceRoot, 'dto'));
  assert.deepEqual(findImports(files, [
    /require\(['"][^'"]*(?:controller|dao|filter|infrastructure|model|routes|service)\//,
    /require\(['"](?:express|mongoose)['"]\)/,
  ]), []);
});

test('DTOs accept protocol-neutral values instead of Express request envelopes', () => {
  const files = javascriptFiles(path.join(sourceRoot, 'dto'));
  assert.deepEqual(findImports(files, [
    /constructor\s*\(\s*\{\s*(?:params|body|query|user)\b/,
    /\breq\.(?:body|params|query|user)\b/,
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
