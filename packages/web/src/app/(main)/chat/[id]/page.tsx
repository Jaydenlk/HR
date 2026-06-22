import { Suspense } from 'react';
import { ChatDetailClient } from './chat-detail';

export default function ChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Suspense 边界:ChatDetailClient 内用 useSearchParams 读取 prefill,需包在 Suspense 内。
  return (
    <Suspense fallback={null}>
      <ChatDetailClient params={params} />
    </Suspense>
  );
}
