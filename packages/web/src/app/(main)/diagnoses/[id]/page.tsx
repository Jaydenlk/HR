import { DiagnosisDetailClient } from './diagnosis-detail';

// Static export: return a placeholder; all IDs are fetched client-side.
export const dynamicParams = false;
export function generateStaticParams() { return [{ id: '_placeholder_' }]; }

export default function DiagnosisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <DiagnosisDetailClient params={params} />;
}
