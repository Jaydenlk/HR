import { ResumeDetailClient } from './resume-detail-client';

export const dynamicParams = false;
export function generateStaticParams() { return [{ id: '_placeholder_' }]; }

export default function ResumeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ResumeDetailClient params={params} />;
}
