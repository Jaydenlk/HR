import { ChatDetailClient } from './chat-detail';

export default function ChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <ChatDetailClient params={params} />;
}
