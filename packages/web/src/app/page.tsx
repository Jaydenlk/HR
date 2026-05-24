'use client';

// Root "/" is the Today dashboard inside the (main) shell.
// We redirect to /today which renders the Today page component.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/today');
  }, [router]);

  return null;
}
