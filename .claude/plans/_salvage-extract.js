// 抢救 wf_1e7bea45-efd 各维度 agent 的 StructuredOutput 载荷 → /tmp/audit/salvage.json
const fs = require('fs');
const path = require('path');
const DIR = 'C:/Users/Jayden park/.claude/projects/E--Agent-program-HRBP/2d59fdc3-73ce-4658-900e-75adc9de604c/subagents/workflows/wf_1e7bea45-efd';
const out = {};
for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.jsonl'))) {
  const lines = fs.readFileSync(path.join(DIR, f), 'utf8').split('\n').filter(Boolean);
  let dim = null;
  let payload = null;
  for (const line of lines) {
    let j;
    try { j = JSON.parse(line); } catch { continue; }
    // 识别维度:首条 user 消息里的角色名
    if (!dim && j.type === 'user' && typeof j.message?.content === 'string') {
      const m = j.message.content.match(/你是(产品战略审查员|安全审查员|商业化基础设施审查员|运维\/可靠性审查员|中国 AI 产品合规调研员|单位经济模型调研员|公测策略调研员|总编审)/);
      if (m) dim = m[1];
    }
    // 找 assistant 消息里的 StructuredOutput tool_use
    const content = j.message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === 'tool_use' && block.name === 'StructuredOutput') {
          payload = block.input;
        }
      }
    }
  }
  out[f] = { dimension: dim, hasPayload: !!payload, payload };
}
fs.mkdirSync('/tmp/audit', { recursive: true });
fs.writeFileSync('/tmp/audit/salvage.json', JSON.stringify(out, null, 1), 'utf8');
const summary = Object.entries(out).map(([f, v]) => `${v.dimension ?? '?'} -> ${v.hasPayload ? 'PAYLOAD OK' : 'no payload'}`);
console.log(summary.join('\n'));
