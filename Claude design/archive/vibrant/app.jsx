// Compose all screens onto design canvas — vibe (Apple × 小红书) edition.

const APP_W = 1440;
const APP_H = 900;
const LANDING_H = 1640;

function App() {
  return (
    <DesignCanvas>
      <DCSection
        id="public"
        title="① 公开入口 · Landing"
        subtitle="对外的产品介绍，Apple-keynote 节奏，鲜活的卡片堆叠 + 角色插画。"
      >
        <DCArtboard id="landing" label="Landing · 首页" width={APP_W} height={LANDING_H}>
          <window.Landing />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="timely"
        title="② 时效层 · 今天 & 月刊 (A + C 同层)"
        subtitle="每日个人节奏 + 实时面经 / 热点内容流。两个并列的时效信息层。"
      >
        <DCArtboard id="today" label="今天 · 今日 5 步" width={APP_W} height={APP_H}>
          <window.TodayScreen />
        </DCArtboard>
        <DCArtboard id="monthly" label="月刊 · 面经 feed" width={APP_W} height={APP_H}>
          <window.MonthlyFeed />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="interview"
        title="③ 面试复盘 · Interview Lab (核心新功能)"
        subtitle="录音 → 自动转写 → AI 逐题评估 → 知识盲点 → 下一轮预测。用户最常回来用的层。"
      >
        <DCArtboard id="iv-list" label="复盘 · 列表 + 横向洞察" width={APP_W} height={APP_H}>
          <window.InterviewList />
        </DCArtboard>
        <DCArtboard id="iv-detail" label="复盘 · 单场详情 + 预测" width={APP_W} height={APP_H}>
          <window.InterviewDetail />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="overview"
        title="④ 求职总览 · Overview (B 概念 · 全局)"
        subtitle="高一层的视角：funnel / 薪资 / 市场温度 / 能力盘点。每周看一次的视角。"
      >
        <DCArtboard id="overview" label="总览 · 全局 dashboard" width={APP_W} height={APP_H}>
          <window.Overview />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="chat"
        title="⑤ 与 Coach 对话 · AI 入口"
        subtitle="所有工具最终都可通过对话调起。富卡片在 chat 里完成任务。"
      >
        <DCArtboard id="chat" label="对话 · 改简历 进行中" width={APP_W} height={APP_H}>
          <window.ChatScreen />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
