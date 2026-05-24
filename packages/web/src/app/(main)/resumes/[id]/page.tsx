// Server component wrapper for static export compatibility.
// generateStaticParams() must live in a server component (no 'use client').
// All page content is rendered by ResumeDetailClient.
import { ResumeDetailClient } from './resume-detail-client';

export function generateStaticParams() {
  return [];
}

export default function ResumeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ResumeDetailClient params={params} />;
}
