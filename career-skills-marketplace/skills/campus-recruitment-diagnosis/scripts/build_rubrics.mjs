// 构建期脚本:把 91 个已编译职业预设(packages/api/dist/profession-presets/presets/*.js)渲染成
// 每职业一个中文标尺 .md + 一份按大类分组的 index.md,放进 marketplace 共享 knowledge/。
// 单一真相源仍是后端 preset .ts;新增/改职业后重跑本脚本即可,产物预生成并提交(运行期零依赖)。
//   node career-skills-marketplace/skills/campus-recruitment-diagnosis/scripts/build_rubrics.mjs
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = resolve(process.cwd());
const DIST = resolve(ROOT, 'packages/api/dist/profession-presets/presets');
const SERVICE = resolve(ROOT, 'packages/api/src/profession-presets/profession-presets.service.ts');
const OUT = resolve(ROOT, 'career-skills-marketplace/skills/_career-skills-shared/knowledge/campus-recruitment-rubrics');
const PROF_DIR = resolve(OUT, 'professions');

// 1) 载入全部预设对象(每个 dist .js 导出一个含 .profession 的常量)
const files = readdirSync(DIST).filter((f) => f.endsWith('.js') && !f.endsWith('.d.ts'));
const presets = [];
for (const f of files) {
  const mod = require(resolve(DIST, f));
  const p = Object.values(mod).find((v) => v && typeof v === 'object' && v.profession && Array.isArray(v.dimensions));
  if (p) presets.push(p);
}
if (presets.length < 80) throw new Error(`只载入到 ${presets.length} 个预设,疑似 dist 未构建?先 nest build`);

// 2) 校验 + 渲染每个预设为中文 .md
rmSync(PROF_DIR, { recursive: true, force: true });
mkdirSync(PROF_DIR, { recursive: true });
const byId = new Map();
for (const p of presets) {
  const sum = p.dimensions.reduce((a, d) => a + d.weight, 0);
  if (p.dimensions.length !== 5) throw new Error(`${p.id}: 维度数 ${p.dimensions.length} ≠ 5`);
  if (sum !== 100) throw new Error(`${p.id}: 权重和 ${sum} ≠ 100`);
  byId.set(p.id, p);
  const dims = p.dimensions
    .map(
      (d, i) =>
        `### ${i + 1}. ${d.name}（满分 ${d.weight}）\n` +
        `- **好的样子**：${d.whatGoodLooksLike}\n` +
        `- **应届证据**：${d.campusEvidence}\n` +
        `- **常见缺失 / 反模式**：${d.commonGaps}\n`,
    )
    .join('\n');
  const md =
    `# ${p.profession}（${p.displayName}）\n\n` +
    `> 校招职业标尺 · 难度档：\`${p.tier}\` · 预设ID：\`${p.id}\`\n\n` +
    `## 五维评分标尺（权重之和 = 100；score 封顶各维满分，total_score = 各维之和）\n\n${dims}\n` +
    `## 打分解释规则（每维 why 必须落到简历事实；命中反模式直接点名；严禁泄漏"满分的X%/扣X分"等内部计算）\n${p.explanationRubric}\n\n` +
    `## 改写指引（禁编造铁律）\n${p.rewriteGuidance}\n\n` +
    `## 本土惯例与硬规则\n${p.resumeConventions}\n`;
  writeFileSync(resolve(PROF_DIR, `${p.id}.md`), md, 'utf8');
}

// 3) 从 service.ts 正则解析 CATEGORY_ORDER(category + professions[]),保证分组/顺序与产品一致
const svc = readFileSync(SERVICE, 'utf8');
const block = svc.slice(svc.indexOf('CATEGORY_ORDER'), svc.indexOf('@Injectable'));
const cats = [];
const re = /\{\s*category:\s*"([^"]+)",\s*professions:\s*\[([^\]]+)\]\s*\}/g;
let m;
while ((m = re.exec(block)) !== null) {
  const professions = m[2].match(/"([^"]+)"/g).map((s) => s.replace(/"/g, ''));
  cats.push({ category: m[1], professions });
}

// profession -> [presets(按难度档)]
const byProfession = new Map();
for (const p of presets) {
  if (!byProfession.has(p.profession)) byProfession.set(p.profession, []);
  byProfession.get(p.profession).push(p);
}

// 4) 写 index.md(一级直达:职业 -> professions/<id>.md;按大类 optgroup 分组)
let total = 0;
const lines = [
  '# 校招职业标尺索引',
  '',
  '诊断时:按"目标职业"在本表中匹配(精确或最相近)→ 读取对应 `professions/<id>.md` 作为该职业的锁定标尺(locked rubric)。',
  '单次诊断只读所选职业 1 个文件,其余零上下文成本。难度档默认 `standard`;仅当用户要求"压力档/大厂卡人"时用 `pressure`。',
  '',
];
for (const { category, professions } of cats) {
  lines.push(`## ${category}`);
  for (const name of professions) {
    const ps = byProfession.get(name) || [];
    for (const p of ps.sort((a, b) => (a.tier === 'standard' ? -1 : 1))) {
      lines.push(`- ${name}（${p.tier}）→ \`professions/${p.id}.md\``);
      total++;
    }
  }
  lines.push('');
}
mkdirSync(OUT, { recursive: true });
writeFileSync(resolve(OUT, 'index.md'), lines.join('\n'), 'utf8');

console.log(`OK 渲染 ${presets.length} 个预设 → professions/*.md;index.md 列出 ${total} 条(职业×难度档),${cats.length} 大类。`);
