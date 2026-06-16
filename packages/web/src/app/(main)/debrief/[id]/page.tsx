import { Suspense } from 'react';
import { DebriefDetail } from './debrief-detail';

export const dynamicParams = true;

export default function DebriefDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // DebriefDetail 用 useSearchParams 读 ?upload=1,需 Suspense 边界(Next.js App Router 约定)。
  return (
    <Suspense fallback={null}>
      <DebriefDetail params={params} />
    </Suspense>
  );
}
