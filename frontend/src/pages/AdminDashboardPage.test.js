import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./AdminDashboardPage.jsx', import.meta.url), 'utf8');

test('admin dashboard KPI cards are keyboard controls and open their matching modules', () => {
  assert.match(source, /<button type="button" className="admin-kpi-card" onClick=\{\(\) => navigate\('\/admin\/users'\)\}>/);
  assert.match(source, /navigate\('\/admin\/teacher-applications'\)/);
  assert.match(source, /navigate\('\/admin\/moderation'\)/);
  assert.match(source, /navigate\('\/admin\/categories'\)/);
  assert.doesNotMatch(source, /<div[^>]*className="admin-kpi-card"[^>]*onClick=/);
});
