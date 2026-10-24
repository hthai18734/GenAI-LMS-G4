import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return entry.isFile() && /\.(?:js|jsx)$/.test(entry.name) ? [target] : [];
  });
}

function importsFrom(file, forbidden) {
  const source = fs.readFileSync(file, 'utf8');
  return forbidden.filter((pattern) => pattern.test(source));
}

test('shared frontend code does not depend on pages or features', () => {
  const violations = sourceFiles(path.join(sourceRoot, 'shared')).flatMap((file) =>
    importsFrom(file, [/from\s+['"][^'"]*(?:pages|features)\//]).map((pattern) =>
      `${path.relative(sourceRoot, file)} matches ${pattern}`));
  assert.deepEqual(violations, []);
});

test('the app composes authentication from the auth feature', () => {
  const appSource = fs.readFileSync(path.join(sourceRoot, 'App.jsx'), 'utf8');
  assert.match(appSource, /features\/auth\/AuthProvider/);
  assert.doesNotMatch(appSource, /services\/AuthContext/);
});

test('pages and reusable components consume feature public APIs, not data services', () => {
  const files = [
    ...sourceFiles(path.join(sourceRoot, 'pages')),
    ...sourceFiles(path.join(sourceRoot, 'components')),
  ];
  const violations = files.flatMap((file) =>
    importsFrom(file, [/from\s+['"][^'"]*services\//]).map((pattern) =>
      `${path.relative(sourceRoot, file)} matches ${pattern}`));
  assert.deepEqual(violations, []);
});

test('feature infrastructure access is exposed only through feature API modules', () => {
  const featureRoot = path.join(sourceRoot, 'features');
  const violations = sourceFiles(featureRoot)
    .filter((file) => path.basename(file) !== 'api.js')
    .flatMap((file) => importsFrom(file, [/from\s+['"][^'"]*services\//]).map((pattern) =>
      `${path.relative(sourceRoot, file)} matches ${pattern}`));
  assert.deepEqual(violations, []);
});

test('features do not reach into another feature implementation', () => {
  const featureRoot = path.join(sourceRoot, 'features');
  const violations = sourceFiles(featureRoot).flatMap((file) => {
    const ownFeature = path.relative(featureRoot, file).split(path.sep)[0];
    const source = fs.readFileSync(file, 'utf8');
    return [...source.matchAll(/from\s+['"]\.\.\/([a-z][^/'"]*)\//g)]
      .filter((match) => match[1] !== ownFeature)
      .map((match) => `${path.relative(sourceRoot, file)} imports feature ${match[1]}`);
  });
  assert.deepEqual(violations, []);
});
