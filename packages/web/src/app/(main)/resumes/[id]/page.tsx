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
