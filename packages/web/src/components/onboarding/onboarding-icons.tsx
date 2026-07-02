// onboarding-icons.tsx — 引导演示用图标(统一走 lucide-react,与线上产品图标体系一致)。
// 演示 surface 按字符串 key 取图标;集中在此处便于复用与替换。

import type { LucideIcon } from 'lucide-react';
import {
  MessageSquare,
  CalendarCheck,
  LayoutGrid,
  BookMarked,
  Mic,
  FileText,
  GraduationCap,
  Target,
  Kanban,
  Send,
  Route,
  Sparkles,
  Search,
  Check,
  TriangleAlert,
  X,
  ArrowRight,
  ArrowLeft,
  Gauge,
  Calendar,
  Zap,
  Type,
  AudioLines,
  Upload,
} from 'lucide-react';

/** 字符串 key → lucide 图标组件。surface 用 ICONS[key] 渲染。 */
export const ICONS: Record<string, LucideIcon> = {
  chat: MessageSquare,
  today: CalendarCheck,
  overview: LayoutGrid,
  monthly: BookMarked,
  debrief: Mic,
  resumes: FileText,
  campus: GraduationCap,
  mock: AudioLines,
  opportunities: Target,
  tracker: Kanban,
  coverLetter: Send,
  route: Route,
  spark: Sparkles,
  search: Search,
  check: Check,
  alert: TriangleAlert,
  x: X,
  arrow: ArrowRight,
  arrowL: ArrowLeft,
  gauge: Gauge,
  calendar: Calendar,
  bolt: Zap,
  type: Type,
  voice: AudioLines,
  upload: Upload,
};

/** 便捷渲染:<Ico name="campus" size={16} /> */
export function Ico({ name, size = 16, ...rest }: { name: string; size?: number } & React.SVGProps<SVGSVGElement>) {
  const Cmp = ICONS[name];
  if (!Cmp) return null;
  return <Cmp size={size} {...rest} />;
}
