'use client';

// Root "/" — show Landing for unauthenticated users, redirect to /today for authenticated.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      router.replace('/today');
    } else {
      router.replace('/landing');
    }
  }, [router]);

  return null;
}
