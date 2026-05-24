// Server component wrapper for static export compatibility.
// generateStaticParams() must live in a server component (no 'use client').
// All page content is rendered by DiagnosisDetailClient.
import { DiagnosisDetailClient } from './diagnosis-detail';

// Static export requires generateStaticParams; dynamicParams=false means
// any unmatched runtime path becomes 404 in production, but during dev
// all IDs are accessible via client-side navigation.
export const dynamicParams = false;

export function generateStaticParams() {
  // No IDs are known at build time — all data is fetched client-side.
  // Return a placeholder so the build succeeds; the client handles routing.
  return [{ id: '_' }];
}

export default function DiagnosisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <DiagnosisDetailClient params={params} />;
}
