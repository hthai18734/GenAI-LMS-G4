const test = require('node:test');
const assert = require('node:assert/strict');
const UserWriteDTO = require('../../src/dto/admin/UserWriteDTO');
const UserQueryDTO = require('../../src/dto/admin/UserQueryDTO');
const ReviewWriteDTO = require('../../src/dto/review/ReviewWriteDTO');
const ReviewQueryDTO = require('../../src/dto/review/ReviewQueryDTO');

test('user creation normalizes editable fields and uses the existing password policy', () => {
  const dto = new UserWriteDTO({ fullName: ' Nguyen Van A ', email: ' A@Example.edu ', phone: '', password: 'Strong1!' }, true);
  assert.deepEqual(dto.validate(), {});
  assert.deepEqual(dto.toObject(), { fullName: 'Nguyen Van A', email: 'a@example.edu', phone: null, role: 'student' });
  for (const password of ['weak', {}, 'NoDigits!']) assert.ok(new UserWriteDTO({ ...dto.body, password }, true).validate().password);
});

test('user updates reject privilege changes, password hashes, invalid values and empty bodies', () => {
  for (const body of [{}, { role: 'admin' }, { status: 'active' }, { passwordHash: 'hash' }, { fullName: [] }, { email: {} }, { phone: 123 }]) {
    assert.ok(Object.keys(new UserWriteDTO(body).validate()).length);
  }
  assert.deepEqual(new UserWriteDTO({ phone: null }).validate(), {});
});

test('account search normalizes boundary data without producing database queries', () => {
  const dto = new UserQueryDTO({ search: ' a+b[0] ', role: 'student', status: 'active', page: 2, limit: 10 });
  assert.deepEqual(dto.validate(), {});
  const query = dto.toObject();
  assert.equal(query.search, 'a+b[0]');
  assert.equal(query.role, 'student');
  assert.equal(query.status, 'active');
  assert.equal(query.skip, 10);
  for (const input of [{ role: 'owner' }, { status: 'deleted' }, { search: {} }]) assert.ok(Object.keys(new UserQueryDTO(input).validate()).length);
});

test('review writes reject spoofed authors, fractional or string ratings and empty content', () => {
  assert.deepEqual(new ReviewWriteDTO({ rating: 5, content: ' Good course ' }).toObject(), { rating: 5, content: 'Good course' });
  for (const body of [{ rating: '5', content: 'Good' }, { rating: 1.5, content: 'Good' }, { rating: 0, content: 'Good' }, { rating: 6, content: 'Good' }, { rating: 5, content: ' ' }, { rating: 5, content: 'Good', userId: 'spoofed' }, { rating: 5, content: 'Good', status: 'visible' }]) {
    assert.ok(Object.keys(new ReviewWriteDTO(body).validate()).length);
  }
  assert.deepEqual(new ReviewWriteDTO({ content: ' Thank you ' }, true).validate(), {});
  assert.deepEqual(new ReviewWriteDTO({ content: ' Thank you ' }, true).toObject(), { content: 'Thank you' });
});

test('review search validates and normalizes filters without database operators', () => {
  const dto = new ReviewQueryDTO({ search: '.*', status: 'hidden' });
  assert.deepEqual(dto.validate(), {});
  assert.equal(dto.toObject().search, '.*');
  for (const query of [{ courseId: 'bad' }, { status: 'approved' }, { search: [] }]) assert.ok(Object.keys(new ReviewQueryDTO(query).validate()).length);
});
