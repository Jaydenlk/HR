import { MockDetail } from './mock-detail';

export const dynamicParams = true;

export default function MockDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <MockDetail params={params} />;
}
