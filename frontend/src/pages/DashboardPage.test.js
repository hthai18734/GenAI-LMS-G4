import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./DashboardPage.jsx', import.meta.url), 'utf8');

test('dashboard renders the current learning streak returned by learning statistics', () => {
  assert.match(source, /import \{ learningStatsService \} from '\.\.\/features\/learning\/api\.js'/);
  assert.match(source, /learningStatsService\.getStatistics\('week'\)/);
  assert.match(source, /currentStreak[\s\S]*?setLearningStreak\(/);
  assert.match(source, /Learning Streak:[\s\S]*?\{learningStreak\} \{learningStreak === 1 \? 'day' : 'days'\}/);
  assert.doesNotMatch(source, /Learning Streak:[\s\S]{0,200}>3 days</);
});
