import { api } from '../../../shared/api/client.js';

export const learningGoalService = {
  getGoals: () => api('/api/student/learning-goals'),
  createGoal: data => api('/api/student/learning-goals', { method: 'POST', body: JSON.stringify(data) }),
  updateGoal: (id, data) => api(`/api/student/learning-goals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  cancelGoal: id => api(`/api/student/learning-goals/${id}`, { method: 'DELETE' }),
};
