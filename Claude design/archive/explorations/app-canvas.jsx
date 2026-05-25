// Composes the design canvas with all 4 directions.

const FRAME_W = 1280;
const FRAME_H = 860;

function App() {
  return (
    <DesignCanvas>
      <DCSection
        id="dir-a"
        title="A · Daily Quest 求职日历"
        subtitle="把求职拆成每天 30 分钟的小任务。habit-tracker × 学习陪伴。暖色友好。"
      >
        <DCArtboard id="a-landing" label="A1 · Landing · 每日求职" width={FRAME_W} height={FRAME_H}>
          <window.A_Landing />
        </DCArtboard>
        <DCArtboard id="a-product" label="A2 · 产品 · 今日 5 步 + 连续打卡" width={FRAME_W} height={FRAME_H}>
          <window.A_Product />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="dir-b"
        title="B · Career Cockpit 求职驾驶舱"
        subtitle="把秋招当数据项目来做。funnel 可视化、薪资 P 分位、市场温度。Pro 感、深色、密度高。"
      >
        <DCArtboard id="b-landing" label="B1 · Landing · 启动驾驶舱" width={FRAME_W} height={FRAME_H}>
          <window.B_Landing />
        </DCArtboard>
        <DCArtboard id="b-product" label="B2 · 产品 · 薪资雷达" width={FRAME_W} height={FRAME_H}>
          <window.B_Product />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="dir-c"
        title="C · Campus Quarterly 校招月刊"
        subtitle="求职像读杂志 —— 编辑策展、深度内容驱动。衬线、米黄、有审美。Otta meets 编辑部。"
      >
        <DCArtboard id="c-landing" label="C1 · Landing · 杂志封面" width={FRAME_W} height={FRAME_H}>
          <window.C_Landing />
        </DCArtboard>
        <DCArtboard id="c-product" label="C2 · 简历馆 · 文章式" width={FRAME_W} height={FRAME_H}>
          <window.C_Product />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="dir-d"
        title="D · Coach 对话教练"
        subtitle={`一个对话入口通向所有工具。AI 是「教练」而不是「助手」。极简、温暖、Claude / Pi.ai 美学。`}
      >
        <DCArtboard id="d-landing" label="D1 · Landing · 对话首屏" width={FRAME_W} height={FRAME_H}>
          <window.D_Landing />
        </DCArtboard>
        <DCArtboard id="d-product" label="D2 · 对话进行中 · 富卡片" width={FRAME_W} height={FRAME_H}>
          <window.D_Product />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
