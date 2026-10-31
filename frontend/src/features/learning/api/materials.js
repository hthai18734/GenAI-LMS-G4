import { api, authenticatedBlob } from '../../../shared/api/client.js';

export const materialService = {
  uploadMaterial: (lessonId, file, meta = {}) => {
    const data = new FormData();
    data.append('file', file);
    if (meta.name) data.append('name', meta.name);
    if (meta.description) data.append('description', meta.description);
    return api(`/api/teacher/lessons/${lessonId}/materials`, { method: 'POST', body: data });
  },
  getMaterials: lessonId => api(`/api/lessons/${lessonId}/materials`),
  updateMaterial: (id, data) => api(`/api/teacher/materials/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteMaterial: id => api(`/api/teacher/materials/${id}`, { method: 'DELETE' }),
  getDownloadBlob: (id, options = {}) => authenticatedBlob(`/api/materials/${id}/download${options.view ? '?view=true' : ''}`),
  createDownloadObjectUrl: async (id, options = {}) => URL.createObjectURL(
    await authenticatedBlob(`/api/materials/${id}/download${options.view ? '?view=true' : ''}`),
  ),
};
