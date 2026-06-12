import type { Metadata } from 'next';

// 用户条款页:静态服务端组件,无需登录即可访问(登录页条款门链接至此)。
// 排版:窄栏居中 + 浅色背景,标题 + 编号小节,与全站设计语言(CSS 变量)一致。

export const metadata: Metadata = {
  title: '用户条款 - Coach',
  description: 'Coach 用户条款(试运行版)',
};

// 条款小节:实质内容为前后端契约文案,不得擅改。
const SECTIONS: Array<{ heading: string; body: string }> = [
  {
    heading: '一、服务说明',
    body: 'Coach 是面向校招求职者的 AI 求职辅助工具，当前处于免费公测试运行阶段，凭邀请码注册使用。公测期间功能与可用性可能调整，服务可能临时中断或终止，恕不另行通知。',
  },
  {
    heading: '二、账号',
    body: '使用邮箱验证码登录；邀请码仅限本人使用，不得转售或共享账号。',
  },
  {
    heading: '三、你的内容',
    body: '你上传的简历等资料所有权归你。你授权 Coach 仅为向你提供服务（诊断、改写、生成求职材料等）而处理这些内容。我们不出售你的资料，不将其用于与你的服务无关的用途。',
  },
  {
    heading: '四、AI 输出',
    body: '诊断与建议由 AI 生成，坚持「句句有据」原则，但仍可能存在错漏，仅供参考，不构成录用承诺或任何职业保证；重要决定请自行核实。',
  },
  {
    heading: '五、行为规范',
    body: '禁止上传违法、侵权或含他人隐私的内容；禁止恶意刷量、爬取、攻击系统或绕过使用配额；违者将被封禁账号。',
  },
  {
    heading: '六、数据与隐私',
    body: '你的资料存储于我们的服务器；为安全与统计目的，登录时会记录 IP 地址及其归属地；邮箱仅用于发送验证码与重要服务通知。你可随时联系管理员删除账号及全部数据。',
  },
  {
    heading: '七、条款变更',
    body: '条款更新将在本页公布，更新后继续使用即视为接受。',
  },
  {
    heading: '八、联系方式',
    body: '试运行期间，可通过你的邀请人或站内管理员与我们联系。',
  },
];

export default function TermsPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        padding: '56px 24px 80px',
      }}
    >
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* 标题区 */}
        <h1
          style={{
            fontSize: '26px',
            fontWeight: 800,
            color: 'var(--color-ink)',
            letterSpacing: '-0.4px',
            marginBottom: '8px',
            lineHeight: 1.3,
          }}
        >
          《Coach 用户条款》
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--color-ink-4)',
            marginBottom: '36px',
            fontWeight: 500,
          }}
        >
          试运行版 · 更新于 2026-06-12
        </p>

        {/* 条款小节 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2
                style={{
                  fontSize: '15.5px',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  letterSpacing: '-0.2px',
                  marginBottom: '8px',
                }}
              >
                {s.heading}
              </h2>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--color-ink-2)',
                  lineHeight: 1.8,
                }}
              >
                {s.body}
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
