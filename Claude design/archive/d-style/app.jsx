// Compose all screens onto design canvas.

const APP_W = 1440;
const APP_H = 900;
const LANDING_H = 1380;

function App() {
  return (
    <DesignCanvas>
      <DCSection
        id="public"
        title="① 公开入口 · Landing"
        subtitle={`对外的产品介绍 — 把「陪你跑完整个秋招」讲清楚 + 直接给到对话入口。`}
      >
        <DCArtboard id="landing" label="Landing · 首页" width={APP_W} height={LANDING_H}>
          <window.Landing />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="timely"
        title="② 时效层 · 今天 + 月刊 (A 和 C 同级)"
        subtitle={`每日（A·个人）和每天的内容流（C·面经/热点）平行的两个时效信息层。月刊的"刊"只是名字 — 信息是实时的。`}
      >
        <DCArtboard id="today" label="今天 · Daily Plan" width={APP_W} height={APP_H}>
          <window.TodayScreen />
        </DCArtboard>
        <DCArtboard id="monthly-feed" label="月刊 · Feed (面经为主)" width={APP_W} height={APP_H}>
          <window.MonthlyFeed />
        </DCArtboard>
        <DCArtboard id="monthly-article" label="月刊 · 面经详情" width={APP_W} height={APP_H}>
          <window.MonthlyArticle />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="interview"
        title="③ 面试复盘 · Interview Lab (新功能 · 重点)"
        subtitle="录音/记录 → 自动转写 → AI 逐题评估 → 知识盲点定位 → 下一轮预测。这是用户真正会反复回来用的功能。"
      >
        <DCArtboard id="iv-list" label="面试复盘 · 列表 + 横向洞察" width={APP_W} height={APP_H}>
          <window.InterviewList />
        </DCArtboard>
        <DCArtboard id="iv-detail" label="面试复盘 · 单场详细 + 下一轮预测" width={APP_W} height={APP_H}>
          <window.InterviewDetail />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="overview"
        title="④ 求职总览 · Overview (B 概念 · 全局视角)"
        subtitle="高一层的视角：funnel、薪资、市场温度、能力盘点。每周/每月看一次的东西。"
      >
        <DCArtboard id="overview" label="总览 · 全局 dashboard" width={APP_W} height={APP_H}>
          <window.Overview />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="chat"
        title="⑤ 与 Coach 对话 · AI 入口"
        subtitle="所有工具最终都可通过对话调起。富卡片在 chat 里完成任务，不必跳出对话流。"
      >
        <DCArtboard id="chat" label="对话 · 改简历 in progress" width={APP_W} height={APP_H}>
          <window.ChatScreen />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
