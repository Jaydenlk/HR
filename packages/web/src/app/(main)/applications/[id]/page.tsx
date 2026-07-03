import { ApplicationDetail } from './application-detail';

export const dynamicParams = true;

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ApplicationDetail params={params} />;
}
