import { api } from '../../../shared/api/client.js';

export const wishlistService = {
  getWishlist: (page = 1, limit = 10) => api(`/api/student/wishlist?page=${page}&limit=${limit}`),
  addToWishlist: courseId => api(`/api/student/wishlist/${courseId}`, { method: 'POST' }),
  removeFromWishlist: courseId => api(`/api/student/wishlist/${courseId}`, { method: 'DELETE' }),
};
