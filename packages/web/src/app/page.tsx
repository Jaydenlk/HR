'use client';

// Root "/" redirects into the (main) shell. The actual home dashboard
// lives at /resumes which is inside the (main) route group and inherits
// the shared sidebar layout — eliminating the previous sidebar duplication.

import { useEffect } from 'react';

export default function RootPage() {
  useEffect(() => {
    window.location.replace('/resumes');
  }, []);

  return null;
}
