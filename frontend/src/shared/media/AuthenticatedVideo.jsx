import React, { forwardRef, useEffect, useState } from 'react';
import { authenticatedBlob } from '../api/client.js';

const AuthenticatedVideo = forwardRef(function AuthenticatedVideo({ src, ...props }, ref) {
  const [protectedMedia, setProtectedMedia] = useState({ source: null, url: null });
  const isProtected = typeof src === 'string' && src.startsWith('/uploads/lesson-videos/');

  useEffect(() => {
    if (!isProtected) return undefined;
    let active = true;
    let objectUrl;
    authenticatedBlob(src).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setProtectedMedia({ source: src, url: objectUrl });
    }).catch(() => {});
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isProtected, src]);

  const resolvedSrc = isProtected
    ? (protectedMedia.source === src ? protectedMedia.url : null)
    : src;
  return <video {...props} ref={ref} src={resolvedSrc || undefined} />;
});

export default AuthenticatedVideo;
