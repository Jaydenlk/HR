import { DiagnosisDetailClient } from './diagnosis-detail';

// Static export: generateStaticParams provides a build-time placeholder.
// All real data is fetched client-side at runtime.
export function generateStaticParams() { return [{ id: '_placeholder_' }]; }

export default function DiagnosisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <DiagnosisDetailClient params={params} />;
}
