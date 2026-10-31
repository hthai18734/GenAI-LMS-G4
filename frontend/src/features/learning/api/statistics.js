import { api } from '../../../shared/api/client.js';

export const learningStatsService = {
  getStatistics: (range = 'week', options = {}) => api(`/api/me/learning-statistics?range=${range}`, options),
};
