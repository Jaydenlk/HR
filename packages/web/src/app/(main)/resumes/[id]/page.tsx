// Server Component — required for static export with dynamic routes.
// Exports generateStaticParams so the build does not fail.
// All data fetching and rendering is delegated to the Client Component below.

import { ResumeDetailClient } from './resume-detail-client';

// IDs are only known at runtime (fetched from API client-side).
// Returning an empty array satisfies the static export requirement
// while allowing client-side navigation to any resume ID.
export function generateStaticParams() {
  return [];
}

export default function ResumeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <ResumeDetailClient params={params} />;
}
