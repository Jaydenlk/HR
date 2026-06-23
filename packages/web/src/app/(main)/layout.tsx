'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import OnboardingTour from '@/components/onboarding/onboarding-tour';
import CapabilityGuide from '@/components/onboarding/capability-guide';
import { OnboardingNavProvider, useOnboardingNav } from '@/components/onboarding/onboarding-nav-context';
import { ThemeToggle } from '@/components/theme-toggle';
import { Tooltip } from '@/components/ui/tooltip';
import { NAV_HINTS } from '@/components/onboarding/nav-hints';
import { AnnouncementBanner } from '@/components/ui/announcement-banner';
import { AnnouncementModal } from '@/components/ui/announcement-modal';
import { api } from '@/lib/api';
import type { User, Conversation, Interview, Application, MeProfile } from '@/lib/types';
import {
  CalendarDays,
  BookOpen,
  Mic,
  LayoutDashboard,
  FileText,
  Play,
  BarChart2,
  Briefcase,
  MessageSquare,
  Send,
  Map as MapIcon,
  Target,
  GraduationCap,
  Menu,
  X,
  Scale,
  ClipboardList,
  Route,
  Mail,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Shield,
  LogOut,
  Coins,
  HelpCircle,
  Megaphone,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  dot?: boolean;
  /** 新手导览锚点:渲染为 data-tour 属性,供 OnboardingTour 聚光灯定位 */
  tourId?: string;
}

function buildMainNav(interviewCount: number): NavItem[] {
  return [
    { id: 'today', label: '今天', href: '/today', icon: <CalendarDays size={16} />, dot: true, tourId: 'today' },
    { id: 'monthly', label: '月刊·面经', href: '/newspaper', icon: <BookOpen size={16} /> },
    {
      id: 'debrief',
      label: '面试复盘',
      href: '/debrief',
      icon: <Mic size={16} />,
      ...(interviewCount > 0 ? { badge: String(interviewCount) } : {}),
    },
    { id: 'overview', label: '求职总览', href: '/overview', icon: <LayoutDashboard size={16} /> },
  ];
}

interface ToolNav {
  core: NavItem[];
  more: NavItem[];
}

// 工具区做减法:6 个高频核心常驻,其余收进「更多功能」默认折叠——默认只露核心,消除信息瀑布。
function buildToolNav(applicationCount: number): ToolNav {
  const tracker: NavItem = {
    id: 'tracker',
    label: '投递追踪',
    href: '/applications',
    icon: <Briefcase size={16} />,
    ...(applicationCount > 0 ? { badge: String(applicationCount) } : {}),
  };
  return {
    core: [
      { id: 'resumes', label: '简历馆', href: '/resumes', icon: <FileText size={16} />, tourId: 'resumes' },
      { id: 'campus', label: '校招诊断', href: '/diagnoses/campus', icon: <GraduationCap size={16} />, tourId: 'campus' },
      { id: 'opportunities', label: '机会中心', href: '/opportunities', icon: <Target size={16} /> },
      tracker,
      { id: 'cover-letter', label: '求职信', href: '/cover-letter', icon: <Send size={16} /> },
      { id: 'mock', label: '模拟面试', href: '/mock', icon: <Play size={16} /> },
    ],
    more: [
      { id: 'interview-prep', label: '面试备战', href: '/interview-prep', icon: <ClipboardList size={16} /> },
      { id: 'career', label: '职业地图', href: '/career', icon: <MapIcon size={16} /> },
      { id: 'learning-roadmap', label: '学习路线', href: '/learning-roadmap', icon: <Route size={16} /> },
      { id: 'follow-up', label: '跟进消息', href: '/follow-up', icon: <Mail size={16} /> },
      { id: 'salary', label: '薪资雷达', href: '/salary', icon: <BarChart2 size={16} /> },
      { id: 'offer-comparator', label: 'Offer 比对', href: '/offer-comparator', icon: <Scale size={16} /> },
      { id: 'industry-trend', label: '行业趋势', href: '/industry-trend', icon: <TrendingUp size={16} /> },
    ],
  };
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  // 引导期「真侧栏高亮覆盖」provider 包在最外:让 OnboardingTour(本布局子树)能临时把视觉激活项
  // 落到对应导航项,供下方 isActive / 滑动指示器读取。默认 null = 不覆盖,行为与改前逐字一致。
  return (
    <OnboardingNavProvider>
      <ShellLayoutInner>{children}</ShellLayoutInner>
    </OnboardingNavProvider>
  );
}

function ShellLayoutInner({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [interviewCount, setInterviewCount] = useState(0);
  const [applicationCount, setApplicationCount] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [showCapabilityGuide, setShowCapabilityGuide] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  // 引导期视觉激活覆盖:非 null 时,导航高亮按引导给的 href 落位(不导航);null 时走 pathname 原逻辑。
  const { guideActiveHref } = useOnboardingNav();

  function handleLogout() {
    if (typeof window !== 'undefined') localStorage.removeItem('token');
    router.replace('/login');
  }

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  function refreshCreditBalance() {
    api
      .get<MeProfile>('/me')
      .then((data) => setCreditBalance(data.credit_balance))
      .catch(() => {});
  }

  useEffect(() => {
    api
      .get<User>('/auth/me')
      .then((u) => setUser(u))
      .catch(() => {
        window.location.href = '/login';
      });
    api
      .get<Conversation[]>('/conversations')
      .then((data) => setConversations(data.slice(0, 5)))
      .catch(() => {});
    api
      .get<Interview[]>('/interviews')
      .then((data) => setInterviewCount(data.length))
      .catch(() => {});
    api
      .get<Application[]>('/applications')
      .then((data) => setApplicationCount(data.length))
      .catch(() => {});
    refreshCreditBalance();

    // 全局 402 监听:点数不足时弹提示并刷新余额
    function onInsufficientCredit() {
      toast.error('点数不足，请联系管理员充值');
      refreshCreditBalance();
    }
    window.addEventListener('coach:insufficient-credit', onInsufficientCredit);

    // 余额刷新:AI 成功扣点后(如流式聊天完成)广播,侧边栏拉取最新余额。
    function onCreditRefresh() {
      refreshCreditBalance();
    }
    window.addEventListener('coach:credit-refresh', onCreditRefresh);

    // 全局排队提示:任一 AI 请求排队时弹轻提示「前面还有 x 个请求」,完成即消。
    // 用固定 toast id,排位变化就地更新、不堆叠;clear 时 dismiss。
    const QUEUE_TOAST_ID = 'ai-queue';
    function onQueue(e: Event) {
      const position = (e as CustomEvent<{ position: number }>).detail?.position ?? 0;
      if (position > 0) {
        toast.loading(`当前使用人数较多，正在排队，前面还有 ${position} 个请求`, {
          id: QUEUE_TOAST_ID,
        });
      }
    }
    function onQueueClear() {
      toast.dismiss(QUEUE_TOAST_ID);
    }
    window.addEventListener('coach:ai-queue', onQueue);
    window.addEventListener('coach:ai-queue-clear', onQueueClear);

    return () => {
      window.removeEventListener('coach:insufficient-credit', onInsufficientCredit);
      window.removeEventListener('coach:credit-refresh', onCreditRefresh);
      window.removeEventListener('coach:ai-queue', onQueue);
      window.removeEventListener('coach:ai-queue-clear', onQueueClear);
    };
  }, []);

  // Close sidebar on route change (mobile)
  // Track previous pathname to detect navigation and reset sidebar
  const [lastPathname, setLastPathname] = useState(pathname);
  if (isMobile && pathname !== lastPathname) {
    setLastPathname(pathname);
    setSidebarOpen(false);
  }

  const initial = user?.name?.[0]?.toUpperCase() ?? '…';

  function isActive(item: NavItem): boolean {
    // 引导期覆盖:仅高亮引导指定的那一项(精确匹配 href),其余全灭,聚光只落一处。
    // guideActiveHref 为 null 时(常态)完全走原 pathname 逻辑,零回归。
    if (guideActiveHref != null) return item.href === guideActiveHref;
    if (item.href === '/today') return pathname === '/today' || pathname === '/';
    return pathname?.startsWith(item.href) ?? false;
  }

  // 导航数据 hoist 到渲染作用域,供 JSX 与下方滑动指示器测量共享(buildXxxNav 是纯函数,廉价)。
  const mainNav = buildMainNav(interviewCount);
  const toolNav = buildToolNav(applicationCount);

  // 给侧栏导航项包悬停说明。link 本身是交互元素(<Link>=<a>),必须用 triggerRender={<span/>} 穿透,
  // 避免 base-ui 把 Trigger 渲染成 <button> 套在 <a> 外形成非法嵌套。span 设 display:block 不塌陷,
  // 且不带定位/边距——保证内部 Link 的 offsetParent 仍是外层 relative 容器,滑动指示器测量不受影响。
  // 移动端是抽屉、触屏无 hover,不包 Tooltip(避免误触卡住),可发现性靠主页发现区 + 引导承担。
  function withHint(id: string, link: React.ReactNode, key?: string): React.ReactNode {
    const hint = NAV_HINTS[id];
    if (isMobile || !hint) return link;
    return (
      <Tooltip
        key={key}
        content={hint}
        side="right"
        triggerRender={<span style={{ display: 'block' }} />}
      >
        {link}
      </Tooltip>
    );
  }

  // ── 浮动磨砂滑动指示器 ────────────────────────────────────────────────
  // 每组(主导航 / 工具导航)一个共享指示器。容器 position:relative,指示器 position:absolute。
  // useLayoutEffect 量当前激活项的 offsetTop/offsetHeight,写到指示器 transform/height;CSS transition
  // 让磨砂块平滑滑动/伸缩到新选中项。无激活项则隐藏(data-active=false)。
  const mainNavRef = useRef<HTMLDivElement>(null);
  const toolNavRef = useRef<HTMLDivElement>(null);
  const mainIndicatorRef = useRef<HTMLDivElement>(null);
  const toolIndicatorRef = useRef<HTMLDivElement>(null);
  const mainItemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const toolItemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());

  useLayoutEffect(() => {
    function place(
      indicator: HTMLDivElement | null,
      items: Map<string, HTMLAnchorElement>,
      activeId: string | null,
    ) {
      if (!indicator) return;
      const el = activeId ? items.get(activeId) : undefined;
      if (!el) {
        indicator.dataset.active = 'false';
        return;
      }
      indicator.style.transform = `translateY(${el.offsetTop}px)`;
      indicator.style.height = `${el.offsetHeight}px`;
      indicator.dataset.active = 'true';
    }
    function update() {
      const mainActive = mainNav.find((i) => isActive(i))?.id ?? null;
      // 工具组「更多」折叠时,落在 more 里的激活项不可见——此时该组不显示指示器。
      const visibleTools = [...toolNav.core, ...(showMore ? toolNav.more : [])];
      const toolActive = visibleTools.find((i) => isActive(i))?.id ?? null;
      place(mainIndicatorRef.current, mainItemRefs.current, mainActive);
      place(toolIndicatorRef.current, toolItemRefs.current, toolActive);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
    // pathname 变(切页)、showMore 变(折叠/展开重排)、badge 数变(项高度可能微调)、
    // guideActiveHref 变(引导切章)时重算落位——指示器平滑滑到新激活项(核心②③)。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, showMore, interviewCount, applicationCount, guideActiveHref]);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '248px 1fr',
        gridTemplateRows: 'minmax(0, 1fr)',
        height: '100vh',
      }}
    >
      {/* ── 极光背景(全量复刻):挂在布局根、position:fixed inset:0 z-index:0,侧栏与主区之下。
          fixed 让极光不随内容滚动(根因2),折叠以下仍有流动极光;玻璃(.lg/侧栏)透出极光即得液态质感。
          极光自主流动(光斑自带慢 drift,不靠鼠标);.grid 发丝网格 + .grain 极淡噪点 = 微纹理。
          (main) 根 grid 与 html/body 无 transform/filter,fixed 锚定视口正确。 */}
      <div className="atmos" aria-hidden="true">
        <span className="au a1" />
        <span className="au a2" />
        <span className="au a3" />
        <span className="grid" />
        <span className="grain" />
      </div>

      {/* ── Mobile top bar ───────────────────────────────────────────── */}
      {isMobile && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '52px',
            background: 'var(--color-surface-2)',
            borderBottom: '1px solid var(--color-line)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: '12px',
            zIndex: 200,
          }}
        >
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-ink)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="切换侧边栏"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.3px',
            }}
          >
            Coach
          </span>
        </div>
      )}

      {/* ── Backdrop (mobile overlay) ─────────────────────────────────── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 210,
          }}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      {/* 玻璃外壳:背景/描边走主题感知的玻璃 token(暗=Night Atelier 玻璃,亮=精修玻璃)。
          backdrop-filter 模糊让主区极光透过侧栏映出,克制饱和。结构/逻辑分毫不动。 */}
      <aside
        style={{
          background: 'var(--glass-bg)',
          WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
          backdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
          borderRight: '1px solid var(--glass-bd)',
          boxShadow: 'inset -1px 0 0 var(--glass-rim)',
          display: 'flex',
          flexDirection: 'column',
          padding: '18px 14px',
          gap: '2px',
          /* aside 自身不滚:固定高度的纵向 flex 列。顶部账户区 + 底部版本/退出 flexShrink:0 固定,
             仅中间 nav/工具/最近对话区(下方 .sidebar-scroll)overflowY:auto 滚动——矮窗口下底部不被顶掉。 */
          overflowX: 'hidden',
          minHeight: 0,
          /* relative + zIndex 让侧栏画在固定极光之上(桌面静态定位时 zIndex 才生效);
             移动端下方 spread 覆盖为 position:fixed。 */
          position: 'relative',
          zIndex: 2,
          ...(isMobile
            ? {
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: '248px',
                zIndex: 220,
                transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.22s ease',
              }
            : {}),
        }}
      >
        {/* 账户区:左=头像+名字+点数(点击进 /me),右=明暗切换钮(右对齐、纵向偏下,不与名字打架)。
            切换钮是独立 <button>,不能嵌进 <Link>(交互元素嵌套+点击会误触跳转),故与 Link 平铺为兄弟。
            flexShrink:0 让账户区固定在顶部,不被下方可滚动区挤掉。 */}
        <div
          data-guide-real="account"
          style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: '8px',
            padding: '2px 6px 16px',
            marginBottom: '6px',
            borderBottom: '1px solid var(--color-line)',
            flexShrink: 0,
          }}
        >
          <Link
            href="/me"
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
            }}
          >
            {/* Avatar */}
            {user?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar_url}
                alt="头像"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                  border: '1px solid var(--color-line)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--color-brand-soft)',
                  color: 'var(--color-brand-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {initial}
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--color-ink)',
                  letterSpacing: '-0.005em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.name ?? '···'}
              </div>
              {creditBalance !== null && (
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-brand)',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    marginTop: '2px',
                  }}
                >
                  <Coins size={11} />
                  {creditBalance} 点
                </span>
              )}
            </div>
          </Link>
          {/* 明暗切换钮:账户区右侧、纵向偏下(alignSelf:flex-end),避开顶部名字,两主题下均为玻璃圆钮。 */}
          <ThemeToggle style={{ alignSelf: 'flex-end' }} />
        </div>

        {/* ── 可滚动中段 ────────────────────────────────────────────────
            CTA + 主导航 + 工具 + 管理后台 + 最近对话 放进独立滚动区:flex:1 吃掉剩余高度,
            内容超高时只此区滚动(overflowY:auto),顶部账户区与底部版本/退出始终可见、不被撑没。
            overflowX:hidden + minHeight:0 防止 flex 子项最小内容高度撑破容器。 */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            overflowY: 'auto',
            overflowX: 'hidden',
            /* 滚动条让位:负 margin + 等额 padding,使滚动条贴最右、内容不被挤窄。 */
            margin: '0 -14px',
            padding: '0 14px',
          }}
        >

        {/* CTA — "问 Coach" */}
        {/* 主操作钮:用品牌蓝渐变(两套主题都可读,替代原 --color-ink 实色——暗色下 ink 变浅
            会与白字撞色)。Night Atelier 的 .btn-primary 同款渐变 + 蓝光阴影。 */}
        {withHint(
          'chat',
          <Link
            href="/chat"
            data-tour="chat"
            // 引导「问 Coach」章:CTA 不在两组滑动指示器内,故由本类做脉冲吸睛(核心③·Coach 章高亮落 CTA)。
            className={guideActiveHref === '/chat' ? 'coach-cta-guide-active' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
              color: '#fff',
              borderRadius: '12px',
              fontSize: '13.5px',
              fontWeight: 600,
              margin: '8px 0 16px',
              letterSpacing: '-0.005em',
              textDecoration: 'none',
              boxShadow: '0 8px 22px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.35)',
              transition: 'opacity 0.12s, transform 0.12s',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={15} />
              问 Coach
            </span>
          </Link>,
        )}

        {/* Main nav — relative 容器承载浮动磨砂滑动指示器(单块磨砂在组内平滑滑动到激活项) */}
        <div
          ref={mainNavRef}
          style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}
        >
          <div ref={mainIndicatorRef} className="nav-indicator" data-active="false" aria-hidden="true" />
          {mainNav.map((item) => {
            const active = isActive(item);
            const link = (
              <Link
                key={item.id}
                href={item.href}
                data-tour={item.tourId}
                ref={(el) => {
                  if (el) mainItemRefs.current.set(item.id, el);
                  else mainItemRefs.current.delete(item.id);
                }}
                style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '11px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  color: active ? 'var(--color-ink)' : 'var(--color-ink-2)',
                  fontWeight: active ? 600 : 500,
                  background: 'transparent',
                  textDecoration: 'none',
                  letterSpacing: '-0.003em',
                  transition: 'color 0.1s',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '18px',
                    justifyContent: 'center',
                    color: active ? 'var(--color-ink)' : 'var(--color-ink-3)',
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.dot && (
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--color-brand)',
                      flexShrink: 0,
                    }}
                  />
                )}
                {item.badge && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: 'var(--color-ink-3)',
                      background: 'var(--color-surface-3)',
                      padding: '2px 7px',
                      borderRadius: '999px',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
            return withHint(item.id, link, item.id);
          })}
        </div>

        {/* Tools — 做减法:核心常驻 + 更多默认折叠,默认只露核心 */}
        {(() => {
          const { core, more } = toolNav;
          const renderTool = (item: NavItem) => {
            const active = isActive(item);
            const link = (
              <Link
                key={item.id}
                href={item.href}
                data-tour={item.tourId}
                ref={(el) => {
                  if (el) toolItemRefs.current.set(item.id, el);
                  else toolItemRefs.current.delete(item.id);
                }}
                style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '11px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  color: active ? 'var(--color-ink)' : 'var(--color-ink-2)',
                  fontWeight: active ? 600 : 500,
                  background: 'transparent',
                  textDecoration: 'none',
                  letterSpacing: '-0.003em',
                  transition: 'color 0.1s',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '18px',
                    justifyContent: 'center',
                    color: active ? 'var(--color-ink)' : 'var(--color-ink-3)',
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: 'var(--color-ink-3)',
                      background: 'var(--color-surface-3)',
                      padding: '2px 7px',
                      borderRadius: '999px',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
            return withHint(item.id, link, item.id);
          };
          return (
            <>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--color-ink-4)',
                  fontWeight: 600,
                  margin: '14px 10px 4px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                工具
              </div>
              {/* relative 容器承载本组浮动磨砂滑动指示器(更多折叠/展开时 useLayoutEffect 重算落位) */}
              <div
                ref={toolNavRef}
                style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}
              >
                <div ref={toolIndicatorRef} className="nav-indicator" data-active="false" aria-hidden="true" />
                {core.map(renderTool)}
                <button
                  data-guide-real="more"
                  onClick={() => setShowMore((v) => !v)}
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '11px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    color: 'var(--color-ink-3)',
                    fontWeight: 500,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    letterSpacing: '-0.003em',
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '18px',
                      justifyContent: 'center',
                      color: 'var(--color-ink-3)',
                      flexShrink: 0,
                    }}
                  >
                    {showMore ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                  <span style={{ flex: 1 }}>{showMore ? '收起' : '更多功能'}</span>
                  {!showMore && (
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        color: 'var(--color-ink-3)',
                        background: 'var(--color-surface-3)',
                        padding: '2px 7px',
                        borderRadius: '999px',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {more.length}
                    </span>
                  )}
                </button>
                {showMore && more.map(renderTool)}
              </div>
            </>
          );
        })()}

        {/* 管理后台入口:仅 admin 可见(由 /auth/me 的 role 驱动) */}
        {user?.role === 'admin' && (
          <>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--color-ink-4)',
                fontWeight: 600,
                margin: '14px 10px 4px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              运营
            </div>
            <Link
              href="/admin"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
                padding: '8px 12px',
                borderRadius: '10px',
                fontSize: '13.5px',
                color: (pathname === '/admin')
                  ? 'var(--color-ink)'
                  : 'var(--color-ink-2)',
                fontWeight: (pathname === '/admin') ? 600 : 500,
                background: (pathname === '/admin')
                  ? 'var(--color-surface)'
                  : 'transparent',
                boxShadow: (pathname === '/admin')
                  ? '0 1px 2px rgba(0,0,0,0.04)'
                  : 'none',
                textDecoration: 'none',
                letterSpacing: '-0.003em',
                transition: 'background 0.1s, color 0.1s',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '18px',
                  justifyContent: 'center',
                  color: 'var(--color-ink-3)',
                  flexShrink: 0,
                }}
              >
                <Shield size={16} />
              </span>
              <span style={{ flex: 1 }}>管理后台</span>
            </Link>
            <Link
              href="/admin/announcements"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
                padding: '8px 12px',
                borderRadius: '10px',
                fontSize: '13.5px',
                color: (pathname?.startsWith('/admin/announcements') ?? false)
                  ? 'var(--color-ink)'
                  : 'var(--color-ink-2)',
                fontWeight: (pathname?.startsWith('/admin/announcements') ?? false) ? 600 : 500,
                background: (pathname?.startsWith('/admin/announcements') ?? false)
                  ? 'var(--color-surface)'
                  : 'transparent',
                boxShadow: (pathname?.startsWith('/admin/announcements') ?? false)
                  ? '0 1px 2px rgba(0,0,0,0.04)'
                  : 'none',
                textDecoration: 'none',
                letterSpacing: '-0.003em',
                transition: 'background 0.1s, color 0.1s',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '18px',
                  justifyContent: 'center',
                  color: 'var(--color-ink-3)',
                  flexShrink: 0,
                }}
              >
                <Megaphone size={16} />
              </span>
              <span style={{ flex: 1 }}>公告管理</span>
            </Link>
          </>
        )}

        {/* Recent conversations */}
        {conversations.length > 0 && (
          <>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--color-ink-4)',
                fontWeight: 600,
                margin: '14px 10px 4px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              最近对话
            </div>
            {conversations.map((conv) => {
              const active = pathname?.startsWith(`/chat/${conv.id}`) ?? false;
              return (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    padding: '7px 12px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: active ? 'var(--color-ink)' : 'var(--color-ink-2)',
                    fontWeight: active ? 600 : 400,
                    background: active ? 'var(--color-surface)' : 'transparent',
                    textDecoration: 'none',
                    transition: 'background 0.1s, color 0.1s',
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: active ? 'var(--color-ink)' : 'var(--color-ink-3)',
                      flexShrink: 0,
                    }}
                  >
                    <MessageSquare size={14} />
                  </span>
                  <span
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {conv.title ?? '对话'}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--color-ink-4)',
                      flexShrink: 0,
                    }}
                  >
                    {formatRelativeTime(conv.updated_at)}
                  </span>
                </Link>
              );
            })}
          </>
        )}

        </div>
        {/* ── 可滚动中段结束 ──────────────────────────────────────────── */}

        {/* Footer — flexShrink:0 固定在底,版本号与退出登录同行不换行 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            padding: '12px 10px 4px',
            borderTop: '1px solid var(--color-line)',
            marginTop: '8px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--color-ink-3)',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Coach 公测版
            </span>
            <button
              type="button"
              data-guide-real="help"
              onClick={() => setShowCapabilityGuide(true)}
              aria-label="使用帮助"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 9px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                color: 'var(--color-ink-3)',
                fontSize: '12px',
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
                letterSpacing: '-0.003em',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'background 0.12s, color 0.12s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-brand-soft)';
                e.currentTarget.style.color = 'var(--color-brand)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-ink-3)';
              }}
            >
              <HelpCircle size={14} />
              使用帮助
            </button>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="退出登录"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: 'var(--color-ink-3)',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              letterSpacing: '-0.003em',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-danger-soft)';
              e.currentTarget.style.color = 'var(--color-danger)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-ink-3)';
            }}
          >
            <LogOut size={14} />
            退出登录
          </button>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────────────── */}
      {/* 主区透明:固定极光层(布局根 .atmos)从其下方透出。position:relative + zIndex:1 让主区
          画在固定极光之上;玻璃卡(.lg)透出流动极光即得液态玻璃质感。背景不再铺实色 --color-bg,
          以免遮住固定极光(底色由 .atmos 自身的径向渐变提供)。 */}
      <main
        style={{
          position: 'relative',
          zIndex: 1,
          overflowY: 'auto',
          minHeight: 0,
          ...(isMobile ? { paddingTop: '52px' } : {}),
        }}
      >
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100%' }}>
          {/* 站内公告横幅:接 GET /announcements,有 active 公告时显示,已读存 localStorage */}
          <AnnouncementBanner />
          {children}
        </div>
      </main>

      {/* 登录大公告弹窗:接 GET /announcements?placement=modal,登录后/进 App 时弹出 modal 类型公告。
          只在 (main) 布局(已过 /auth/me 守卫=已登录)挂载,已读按 id 存 localStorage(3 天窗口内新公告仍弹)。 */}
      <AnnouncementModal />

      {/* 新手导览:首次使用引导。桌面聚光灯 / 移动端居中卡降级,由组件内部按 isMobile 决定形态(完成标记在 localStorage) */}
      <OnboardingTour />

      {/* 能力速览:底部「使用帮助」入口触发,任何页面可打开;可重看新手引导(派发 coach:restart-tour) */}
      <CapabilityGuide open={showCapabilityGuide} onClose={() => setShowCapabilityGuide(false)} />

      {/* 全站 toast 出口:写操作成功 toast.success / 失败 toast.error。 */}
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
