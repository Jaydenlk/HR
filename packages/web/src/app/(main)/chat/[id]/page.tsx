import { ChatDetailClient } from './chat-detail';

// Static export: generateStaticParams provides a build-time placeholder.
// All real data is fetched client-side at runtime.
export function generateStaticParams() { return [{ id: '_placeholder_' }]; }
export const dynamicParams = true;

export default function ChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <ChatDetailClient params={params} />;
}
