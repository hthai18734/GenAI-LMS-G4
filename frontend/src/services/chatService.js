import { api } from './api';
const base = '/api/chat/conversations';
export const chatService = {
  list: (context, before, signal) =>
    api(`${base}?${new URLSearchParams({ ...(context || {}), ...(before ? { before } : {}) })}`, {
      signal,
    }),
  create: (context, signal) => api(base, { method: 'POST', body: JSON.stringify(context), signal }),
  get: (id, signal) => api(`${base}/${id}`, { signal }),
  send: (id, data, signal) =>
    api(`${base}/${id}/messages`, { method: 'POST', body: JSON.stringify(data), signal }),
  remove: (id, signal) => api(`${base}/${id}`, { method: 'DELETE', signal }),
  upload: (id, file, signal) => {
    const body = new FormData();
    body.append('document', file);
    return api(`${base}/${id}/documents`, { method: 'POST', body, signal });
  },
  removeDocument: (id, documentId, signal) =>
    api(`${base}/${id}/documents/${documentId}`, { method: 'DELETE', signal }),
};
