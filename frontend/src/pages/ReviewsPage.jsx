import React from 'react';
import ReviewsPanel from '../components/ReviewsPanel';
import { useAuth } from '../features/auth/useAuth.js';

export default function ReviewsPage() {
  const { user } = useAuth();
  return <ReviewsPanel scope={user.role} />;
}
