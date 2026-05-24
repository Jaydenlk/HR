import { DiagnosisDetailClient } from './diagnosis-detail';

export default function DiagnosisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <DiagnosisDetailClient params={params} />;
}
