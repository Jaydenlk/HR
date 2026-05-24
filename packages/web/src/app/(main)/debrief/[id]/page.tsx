import { DebriefDetail } from './debrief-detail';

export const dynamicParams = true;

export default function DebriefDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <DebriefDetail params={params} />;
}
