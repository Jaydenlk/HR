/**
 * Smoke 验证脚本(改造自 p2lib career-explore/phase1/checks/smoke.mjs)
 *
 * 用途:验证 dim1/dim3/dim6/edges 四个校验脚本能在新 8 层骨架下正常运行,并输出符合预期
 * 的结果。样本词条改造为新骨架结构(不再有 A/B 层,不再有 Sourced<T> 包装)。
 *
 * 预期结果:
 *  SAMPLE_PASS: dim1=pass, dim3=pass, dim6=pass
 *  SAMPLE_FAIL: dim3=fail(含套话), dim6=fail(缺层/字段不完整/domain_specifics超5条)
 *  edges 样本: EDGES_PASS 通过,EDGES_FAIL(悬空引用 + 非法 type)失败
 *
 * 用法: node smoke.mjs
 * 退出码: 0 = 所有断言通过;1 = 有断言失败
 */

import { checkDim1 } from './dim1-vocab-density.mjs';
import { checkDim3 } from './dim3-boilerplate-blacklist.mjs';
import { checkDim6 } from './dim6-field-completeness.mjs';
import { checkEdgesReferentialIntegrity } from './edges-referential-integrity.mjs';

// ─────────────────────────────────────────────
// 样本词条:PASS(房建结构工程师)
// ─────────────────────────────────────────────
const SAMPLE_PASS = {
  slug: 'structural-engineer-building',
  name: '房建结构工程师',
  l0: '工程技术',
  l1_family: '建筑工程',
  l2_scene: '房建住宅',
  l3_flag: false,
  axis: 'project_delivery',
  skeleton: {
    positioning: {
      one_liner: '在开发商与施工单位之间,把建筑师方案转化为可施工的钢筋混凝土配筋图,并对结构安全和规范合规负责。',
      problem_solved: '解决「建筑方案能否在结构上安全落地」的核心工程问题:在 GB50010 混凝土结构设计规范与 GB50011 抗震设计规范约束下,产出配筋计算书和施工图,使建筑物同时满足承载力极限状态与正常使用极限状态。',
      social_rationale: '建筑师负责空间与美学,结构工程师负责把这份方案转化为经得起地震和风荷载考验的物理结构,这条专业分工是现代建筑行业规模化交付的前提。',
    },
    coordinates: {
      occupation_family: '建筑工程',
      industry_scenes: ['房建住宅', '公共建筑', '基础设施'],
      adjacent_occupations: ['岩土工程师', '建筑设计师', '机电工程师', '造价工程师'],
      upstream: ['建筑专业(提供建筑方案图及荷载条件)', '岩土专业(提供地勘报告与基础方案)'],
      downstream: ['施工单位(执行施工图)', '审图机构(施工图审查)', '造价工程师(钢筋量化)'],
    },
    boundary: {
      adjacent_diffs: [
        { occupation: '岩土工程师', diff: '岩土工程师聚焦地基处理与基坑支护,结构工程师聚焦主体结构配筋与整体稳定性验算,两者在地下室节点交接但职责边界清晰。' },
        { occupation: '建筑设计师', diff: '建筑设计师定义空间形态、立面与功能布局,结构工程师把这份形态转译为可承重的构件尺寸与配筋方案,前者管好看好用,后者管站得住。' },
        { occupation: '造价工程师', diff: '造价工程师核算钢筋、混凝土用量对应的工程造价,结构工程师产出配筋方案本身,前者是后者产出物的下游计价环节,不介入结构安全判断。' },
      ],
    },
    operations: {
      workflow: {
        daily: '接收建筑专业 CAD 底图 → 在 PKPM 或 YJK 中建立结构计算模型 → 输入恒载/活载/风载/地震作用组合 → 调整截面和配筋满足规范配筋率 0.2%–2.5% → 出 AutoCAD 施工图 → 回应审图机构意见。',
        project: '方案阶段完成结构选型(框架/剪力墙/框剪)和柱网布置,初步设计阶段完成整体计算、确定主要截面,施工图阶段逐层出图并配合审图,施工配合阶段处理设计变更、解答现场 RFI。',
        cycle: '按项目交付周期推进,一个住宅项目从方案到施工图定稿通常跨 2-4 个季度,期间随地勘补充和业主变更反复迭代计算模型。',
      },
      deliverables: [
        '结构施工图(梁板柱墙配筋图)',
        '结构计算书(PKPM/YJK 计算文件及手算校核)',
        '地基基础方案报告',
        '专项设计说明(超限高层抗震性能目标)',
        '图纸会审纪要与设计变更单',
      ],
      tools_systems: ['PKPM结构设计软件', 'YJK盈建科', 'AutoCAD', 'SAP2000', 'ETABS', 'GB50010混凝土结构设计规范', 'GB50011抗震设计规范'],
      eval_metrics: [
        '施工图审查一次通过率(合格院所通常要求≥85%)',
        '设计变更率(归咎于设计错误的变更单数量/总变更单)',
        '结构计算轴压比与剪压比是否满足规范限值',
      ],
    },
    entry: {
      eligible_majors: ['土木工程', '建筑工程', '结构工程(硕士方向)'],
      non_major_route: '机械工程或工程力学背景可通过补修混凝土结构课程加施工图实习入行,但注册结构工程师考试科目对专业背景有硬性限制。',
      campus_recruitment_signals: ['参与过全国大学生结构设计竞赛', '有设计院或地产公司施工图实习', 'PKPM/YJK 操作经验'],
      resume_valid_experiences: ['施工图实习经历(能说清具体图纸类型)', '结构竞赛获奖', '毕业设计基于实际工程项目'],
      resume_looks_relevant_but_useless: ['BIM 建模课程证书(不等于施工图设计能力)', '建筑学背景描述(不等于结构计算能力)', 'CAD 绘图证书(基础技能,不构成亮点)'],
    },
    variation: {
      industry_diffs: [
        { scene: '房建住宅', diff: '标准化程度高,配筋图可复用模板,但甲方催工期导致设计变更频繁,技术含量偏向熟练度而非创新性。' },
        { scene: '公共建筑', diff: '超限高层和大跨空间结构更常见,需完成抗震性能化设计报告和超限审查,技术含量更高,审图周期也更长。' },
      ],
      org_nature_diffs: [
        { org_nature: '民企', diff: '私营设计院或地产公司出图节奏快,项目多压力大,薪资弹性较高但加班普遍。' },
        { org_nature: '国企', diff: '大型国有设计院持有甲级资质,项目类型更复杂,职称晋升体系健全,但薪资天花板偏低。' },
      ],
    },
    threshold: {
      hidden_cost: '施工图审查被打回需要快速返工,深化设计冲刺阶段常见日均工作十小时以上,且要与审图工程师就规范条文细节反复拉锯。',
      attrition_reality: '入行前三年主要做标准层配筋这类重复性工作,熬不过这个阶段、扛不住返工节奏的人多半会转岗或离开设计院序列。',
      income_structure: '底薪加绩效,绩效挂钩项目产值,房地产行情下行期项目减少收入随之缩水;体制内设计院基本工资稳定但天花板低,私营院高峰期奖金可观但波动大。',
      common_misconceptions: '应届生常以为把 PKPM 用熟就够了,实际上规范理解和工程判断力才是核心壁垒,软件只是把判断落地的工具;PKPM、YJK、SAP2000、ETABS 之间的模型互导误差,以及 GB50010、GB50011 两本规范的边界条件差异,是新人最容易踩的技术坑。',
      who_should_not: '对图纸细节合规缺乏耐心、或希望三年内转向产品与运营方向的人不适合走这条技术路线。',
    },
    trend: {
      ai_tasks_replaced: ['标准层配筋图的模板化生成', '审图意见分类汇总'],
      ai_tasks_augmented: ['PKPM/YJK 辅助截面优化', '规范条文智能检索'],
      ai_new_skills: ['BIM协同与AI出图工具使用', '结构优化算法基础理解'],
    },
    axis: 'project_delivery',
    domain_specifics: [
      { key: '超限高层抗震性能目标', value: '超限高层项目需额外完成抗震性能化设计报告并通过超限审查,这是本职业区别于常规多层住宅设计的独有槽位。' },
    ],
  },
};

// ─────────────────────────────────────────────
// 样本词条:FAIL(故意含套话 + 缺层 + domain_specifics 超 5 条)
// ─────────────────────────────────────────────
const SAMPLE_FAIL = {
  slug: 'product-manager-generic',
  name: '产品经理',
  l0: '通用职能',
  l1_family: '产品管理',
  l2_scene: '互联网',
  l3_flag: false,
  axis: 'project_delivery',
  skeleton: {
    positioning: {
      one_liner: '产品经理需要具备优秀的沟通能力强和团队合作精神,积极主动地推进产品迭代。', // 故意含套话
      problem_solved: '解决用户需求与商业目标之间的平衡。',
      social_rationale: '产品经理负责把模糊的市场机会转化为可执行的需求。',
    },
    coordinates: {
      occupation_family: '产品管理',
      industry_scenes: ['互联网'],
      adjacent_occupations: ['运营经理', '项目经理'], // 故意只有 2 个,低于下限 3
      upstream: ['业务方'],
      downstream: ['研发'],
    },
    boundary: {
      adjacent_diffs: [
        { occupation: '运营经理', diff: '互联网产品经理关注用户增长和留存。' },
      ], // 故意只有 1 条,低于下限 3
    },
    operations: {
      workflow: { daily: '开会、写文档、协调研发。', project: '立项到上线的完整流程管理。', cycle: '季度 OKR 复盘。' },
      deliverables: ['PRD文档', '原型图'],
      tools_systems: ['Axure', 'Jira'],
      eval_metrics: ['用户留存率'],
    },
    entry: {
      eligible_majors: ['计算机'],
      non_major_route: '任何专业均可。',
      campus_recruitment_signals: ['有产品实习'],
      resume_valid_experiences: ['互联网产品实习'],
      resume_looks_relevant_but_useless: ['运营实习'],
    },
    variation: {
      industry_diffs: [{ scene: '互联网', diff: '互联网产品经理关注用户增长和留存。' }],
      org_nature_diffs: [{ org_nature: '民企', diff: '互联网民企产品迭代快,OKR驱动。' }],
    },
    threshold: {
      hidden_cost: '需要持续学习快速变化的行业趋势,乐于接受挑战。', // 含套话
      attrition_reality: '', // 故意留空
      income_structure: '', // 故意留空
      common_misconceptions: '', // 故意留空
      who_should_not: '不适合不善于沟通的人。', // 套话变体
    },
    trend: {
      ai_tasks_replaced: ['需求文档模板化生成'],
      ai_tasks_augmented: ['用户研究辅助'],
      ai_new_skills: ['AI产品设计思维'],
    },
    axis: 'project_delivery',
    // 故意超过封顶 5 条(6 条)
    domain_specifics: [
      { key: 'a', value: '占位1' },
      { key: 'b', value: '占位2' },
      { key: 'c', value: '占位3' },
      { key: 'd', value: '占位4' },
      { key: 'e', value: '占位5' },
      { key: 'f', value: '占位6' },
    ],
  },
};

// ─────────────────────────────────────────────
// edges 引用完整性样本
// ─────────────────────────────────────────────
const EDGES_PASS = {
  slugs: ['product-manager-generic', 'operations-manager', 'project-manager'],
  edges: [
    { from_slug: 'product-manager-generic', to_slug: 'operations-manager', type: 'adjacent' },
    { from_slug: 'product-manager-generic', to_slug: 'project-manager', type: 'adjacent' },
  ],
};

const EDGES_FAIL = {
  slugs: ['product-manager-generic'],
  edges: [
    { from_slug: 'product-manager-generic', to_slug: 'ghost-slug-not-registered', type: 'adjacent' },
    { from_slug: 'product-manager-generic', to_slug: 'product-manager-generic', type: 'traditional_to_ai' }, // 老 EdgeType 残留,非法 type
  ],
};

// ─────────────────────────────────────────────
// 运行断言
// ─────────────────────────────────────────────
let allPassed = true;

function assert(condition, msg) {
  if (!condition) {
    console.error(`[FAIL] ${msg}`);
    allPassed = false;
  } else {
    console.log(`[PASS] ${msg}`);
  }
}

console.log('\n========================================');
console.log('Smoke Test: SAMPLE_PASS (房建结构工程师)');
console.log('========================================');

const passR1 = checkDim1(SAMPLE_PASS);
console.log('\n[Dim1 结果]');
console.log(`  entity_density_per_300: ${passR1.metrics.entity_density_per_300}`);
console.log(`  generic_word_ratio_pct: ${passR1.metrics.generic_word_ratio_pct}`);
if (!passR1.pass) console.log('  failures:', passR1.failures);
assert(passR1.pass === true, 'SAMPLE_PASS: Dim1 应通过');

const passR3 = checkDim3(SAMPLE_PASS);
console.log('\n[Dim3 结果]');
console.log(`  total_hit_count: ${passR3.metrics.total_hit_count}`);
assert(passR3.pass === true, 'SAMPLE_PASS: Dim3 应通过(无套话)');

const passR6 = checkDim6(SAMPLE_PASS);
console.log('\n[Dim6 结果]');
if (!passR6.pass) console.log('  failures:', passR6.failures);
assert(passR6.pass === true, 'SAMPLE_PASS: Dim6 应通过(字段完整)');

console.log('\n========================================');
console.log('Smoke Test: SAMPLE_FAIL (故意缺陷词条)');
console.log('========================================');

const failR3 = checkDim3(SAMPLE_FAIL);
console.log('\n[Dim3 结果]');
console.log(`  total_hit_count: ${failR3.metrics.total_hit_count}`);
console.log(`  命中词: ${failR3.hits?.map((h) => h.term).join(', ')}`);
assert(failR3.pass === false, 'SAMPLE_FAIL: Dim3 应失败(含套话词)');
assert(failR3.metrics.total_hit_count > 0, 'SAMPLE_FAIL: Dim3 应命中至少1个黑名单词');

const failR6 = checkDim6(SAMPLE_FAIL);
console.log('\n[Dim6 结果]');
console.log(`  failure_count: ${failR6.metrics.failure_count}`);
console.log(`  failures(前8条): ${failR6.failures.slice(0, 8).join('\n    ')}`);
assert(failR6.pass === false, 'SAMPLE_FAIL: Dim6 应失败');
assert(failR6.failures.some((f) => f.includes('adjacent_occupations')), 'SAMPLE_FAIL: Dim6 应报告 adjacent_occupations 不足3条');
assert(failR6.failures.some((f) => f.includes('adjacent_diffs')), 'SAMPLE_FAIL: Dim6 应报告 adjacent_diffs 不足3条');
assert(failR6.failures.some((f) => f.includes('domain_specifics')), 'SAMPLE_FAIL: Dim6 应报告 domain_specifics 超过5条');
assert(failR6.failures.some((f) => f.includes('threshold.attrition_reality')), 'SAMPLE_FAIL: Dim6 应报告 threshold.attrition_reality 缺失');

console.log('\n========================================');
console.log('Smoke Test: edges 引用完整性');
console.log('========================================');

const edgesPassR = checkEdgesReferentialIntegrity(EDGES_PASS);
console.log('\n[EDGES_PASS 结果]', edgesPassR.metrics);
assert(edgesPassR.pass === true, 'EDGES_PASS: 应通过(全部引用有效)');

const edgesFailR = checkEdgesReferentialIntegrity(EDGES_FAIL);
console.log('\n[EDGES_FAIL 结果]', edgesFailR.metrics);
console.log('  failures:', edgesFailR.failures);
assert(edgesFailR.pass === false, 'EDGES_FAIL: 应失败(悬空引用 + 非法 type)');
assert(edgesFailR.metrics.dangling_reference_count > 0, 'EDGES_FAIL: 应检出悬空引用');
assert(edgesFailR.metrics.bad_type_count > 0, 'EDGES_FAIL: 应检出非法 type(老 EdgeType 残留)');

console.log('\n========================================');
if (allPassed) {
  console.log('所有 smoke 断言通过。');
  process.exit(0);
} else {
  console.error('有断言失败,见上方 [FAIL] 标记。');
  process.exit(1);
}
