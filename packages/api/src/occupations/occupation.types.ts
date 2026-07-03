/**
 * 职业维基 · Stage0 · 骨架类型定义(焊死为常量,不许自行增删)
 *
 * 权威源:docs/refactor2/T3-career-wiki.md §3§4 + docs/refactor2/T3-总体设计-原稿.md 第一、二部分。
 *
 * 架构要点(与 p2lib 老 phase1/occupation.types.ts 的关键区别):
 *  - 结构主干(skeleton)固定 8 层,所有职业完全一致,不许各写各的。
 *  - 骨架字段是纯值(字符串 / 字符串数组 / 结构化子对象),不携带任何来源信息——
 *    不使用老脚手架 Sourced<T>(value + 来源引用两件套内嵌)包装模式。
 *  - 证据侧的溯源/分级/校验结论一律不进本文件:那些概念只属于证据表行类型,
 *    定义在同目录 occupation-evidence.types.ts,与本文件物理隔离。
 *  - 本文件本身即是「骨架类型文件」,残留扫描门会核对此文件不出现任何证据侧概念。
 *
 * 不允许 any / as unknown as。
 */

// ─────────────────────────────────────────────
// 横切枚举(仅保留在新 5 表 / 8 层骨架里确有落点的)
// ─────────────────────────────────────────────

/** 顶层分类板块(L0,原稿一、3 节:6 类) */
export type L0Board = '通用职能' | '工程技术' | '产业专业' | '公共制度' | 'AI新兴' | '创意服务';

/**
 * 组织性质(原稿一、3 节:横切维度 = 企业性质,9 类)。
 * 差异层(variation)的组织性质差异条目引用此枚举。
 */
export type OrgNature =
  | '民企'
  | '外企'
  | '央企'
  | '国企'
  | '政府'
  | '事业单位'
  | '法院检察院'
  | '高校科研'
  | '创业';

/**
 * axis:差异主轴枚举(T3-career-wiki.md §3 焊死,10 个值,Stage0 定稿后量产不改)。
 * 语义:这个职业的「周期」按什么走——不再让每条词条自己解释 project/quarterly,
 * 而是从固定选项里选一个,当场消灭语义不统一问题(原稿「质量与 ROI」第一杠杆)。
 */
export type Axis =
  | 'product_lifecycle'
  | 'project_delivery'
  | 'accreditation_cycle'
  | 'crop_cycle'
  | 'case_cycle'
  | 'patient_flow'
  | 'fiscal_cycle'
  | 'academic_cycle'
  | 'campaign_cycle'
  | 'ops_routine';

/** 全部合法 axis 取值(供校验器/JSON Schema 复用,不许与上面的联合类型脱节)。 */
export const AXIS_VALUES: readonly Axis[] = [
  'product_lifecycle',
  'project_delivery',
  'accreditation_cycle',
  'crop_cycle',
  'case_cycle',
  'patient_flow',
  'fiscal_cycle',
  'academic_cycle',
  'campaign_cycle',
  'ops_routine',
];

// ─────────────────────────────────────────────
// 微调槽:domain_specifics(专有槽,封顶 5 条/词条)
// ─────────────────────────────────────────────

/** 专有槽单条:只装该职业真正独有的东西,超出封顶一律回落固定骨架。 */
export interface DomainSpecific {
  key: string;
  value: string;
}

/** domain_specifics 封顶条数(超出必须回落固定骨架,校验器据此拒绝)。 */
export const DOMAIN_SPECIFICS_MAX = 5;

// ─────────────────────────────────────────────
// 固定骨架:8 层,逐层字段清单摘自原稿第一、二部分表格
// ─────────────────────────────────────────────

/**
 * 1. 定位层:一句话定位 / 解决什么问题 / 为什么这个职业成立(社会分工意义,非 JD 定义)。
 * 用户读完能在 30 秒建立心智模型。
 */
export interface PositioningLayer {
  /** 一句话定位 */
  one_liner: string;
  /** 该岗位解决的核心问题 */
  problem_solved: string;
  /** 为什么这个职业在社会分工里成立(非 JD 定义的表面描述) */
  social_rationale: string;
}

/**
 * 2. 坐标层:职业族 → 行业场景 → 相邻职业(≥3) → 上游/下游。
 * 用户读完知道它在职业世界里站哪、旁边是谁、上下游是谁。
 * 与 occupation_edges 表是两回事:此处是骨架内的描述性字段(渲染用),
 * occupation_edges 是可查询的关系图(引用完整性由脚本保证)。
 */
export interface CoordinatesLayer {
  /** 职业族(对应 L1) */
  occupation_family: string;
  /** 行业场景(对应 L2,可多值) */
  industry_scenes: string[];
  /** 相邻职业名称,≥3 */
  adjacent_occupations: string[];
  /** 上游协作方/角色 */
  upstream: string[];
  /** 下游交付对象/角色 */
  downstream: string[];
}

/** 与单个相邻职业的真实差异(边界层子结构)。 */
export interface AdjacentDifference {
  /** 相邻职业名称,需能在坐标层 adjacent_occupations 中找到对应项 */
  occupation: string;
  /** 与该相邻职业的真实差异描述 */
  diff: string;
}

/**
 * 3. 边界层:与 ≥3 个相邻职业的真实差异——百科最核心模块。
 * 没有相邻对比就不是百科,只是介绍。
 */
export interface BoundaryLayer {
  /** 与相邻职业的差异条目,≥3 条 */
  adjacent_diffs: AdjacentDifference[];
}

/** 真实工作流:日常 / 项目 / 周期三个维度(周期语义由 axis 决定,不再自行造词)。 */
export interface Workflow {
  daily: string;
  project: string;
  cycle: string;
}

/**
 * 4. 实操层:真实工作流(日/项目/周期) / 典型产出物 / 工具系统 / 考核指标。
 */
export interface OperationsLayer {
  workflow: Workflow;
  /** 典型产出物 */
  deliverables: string[];
  /** 真实工具/系统/方法/专业对象 */
  tools_systems: string[];
  /** 决定合不合格的考核指标 */
  eval_metrics: string[];
}

/**
 * 5. 入行层:对口专业 / 非对口转入 / 校招信号 / 简历有效经历 / 看似相关实则无用。
 */
export interface EntryLayer {
  /** 对口专业(本科/硕士层面) */
  eligible_majors: string[];
  /** 非对口转入路径描述 */
  non_major_route: string;
  /** 校园期有效信号(竞赛/实习/项目经历等) */
  campus_recruitment_signals: string[];
  /** 简历上真正有效的经历类型 */
  resume_valid_experiences: string[];
  /** 看似相关但 HR/面试官不认的经历 */
  resume_looks_relevant_but_useless: string[];
}

/** 行业差异条目(差异层子结构)。 */
export interface IndustryDifference {
  /** 行业场景标签(对应坐标层 industry_scenes 中的某一项) */
  scene: string;
  /** 该行业场景下该职业的差异描述 */
  diff: string;
}

/** 组织性质差异条目(差异层子结构)。 */
export interface OrgNatureDifference {
  org_nature: OrgNature;
  /** 该组织性质下该职业的差异描述 */
  diff: string;
}

/**
 * 6. 差异层:行业差异 / 组织性质差异。
 * 同一个岗位在不同行业、不同性质单位(国企/外企/民企/政府)的真实差异。
 */
export interface VariationLayer {
  industry_diffs: IndustryDifference[];
  org_nature_diffs: OrgNatureDifference[];
}

/**
 * 7. 门槛层:隐性门槛 / 常见误解(客观事实性的:代价、淘汰、收入结构)。
 * 反优绩主义修正②:硬闸只有防编造一道,此层不做主观匹配打分,
 * 只带一句客观的「哪类人不适合」(原稿二节「关于匹配判断的定位」)。
 */
export interface ThresholdLayer {
  /** 真实代价(工作强度/压力场景,非泛泛「加班」) */
  hidden_cost: string;
  /** 淘汰机制现实(到哪个阶段/什么条件下被淘汰) */
  attrition_reality: string;
  /** 收入结构(固浮比/发薪节奏/体制内外差异) */
  income_structure: string;
  /** 常见误解(外行以为的 vs 内行实际的) */
  common_misconceptions: string;
  /** 客观事实性的一句「哪类人不适合」,非主观匹配画像 */
  who_should_not: string;
}

/**
 * 8. 趋势层:AI 影响(被替代 / 被增强 / 新技能)。
 */
export interface TrendLayer {
  /** 可能被 AI 替代的任务 */
  ai_tasks_replaced: string[];
  /** AI 增强的任务 */
  ai_tasks_augmented: string[];
  /** 需要掌握的新技能 */
  ai_new_skills: string[];
}

/**
 * 结构主干(skeleton)顶层类型:8 层固定骨架 + axis 微调枚举 + domain_specifics 专有槽。
 * 这是 occupation_entries.skeleton(jsonb)列的行内结构,也是生成/校验唯一作用的对象。
 */
export interface OccupationSkeleton {
  positioning: PositioningLayer;
  coordinates: CoordinatesLayer;
  boundary: BoundaryLayer;
  operations: OperationsLayer;
  entry: EntryLayer;
  variation: VariationLayer;
  threshold: ThresholdLayer;
  trend: TrendLayer;
  axis: Axis;
  domain_specifics: DomainSpecific[];
}

/** 骨架 8 层的键名清单(顺序即定位/坐标/边界/实操/入行/差异/门槛/趋势),供校验器遍历。 */
export const SKELETON_LAYER_KEYS = [
  'positioning',
  'coordinates',
  'boundary',
  'operations',
  'entry',
  'variation',
  'threshold',
  'trend',
] as const;

export type SkeletonLayerKey = (typeof SKELETON_LAYER_KEYS)[number];

// ─────────────────────────────────────────────
// 5 张表中,与证据侧无关的 4 张行类型
// (occupation_evidence 的行类型见 occupation-evidence.types.ts,物理隔离)
// ─────────────────────────────────────────────

/** occupation_slugs.status:词条生产生命周期状态。 */
export type OccupationSlugStatus = 'planned' | 'in_production' | 'published' | 'parked';

/**
 * occupation_slugs 表行类型:全库注册表坑位(700–800 顶天,Stage0 只焊类型,不建注册表内容)。
 * l3_flag:是否为「拆条判据」下的独立 L3 变体(§1 设计裁决②——默认一条职业一条词条,
 * 仅当行业变体在 ≥4/8 骨架层有实质差异且有独立 JD 池时才拆为独立 L3 词条)。
 */
export interface OccupationSlugRow {
  /** 主键,小写连字符 slug */
  slug: string;
  /** 规范中文职业名 */
  name: string;
  l0: L0Board;
  l1_family: string;
  l2_scene: string;
  /** 是否为拆条判据下独立生成的 L3 变体 */
  l3_flag: boolean;
  status: OccupationSlugStatus;
}

/** occupation_entries.status:词条内容生命周期状态。 */
export type OccupationEntryStatus = 'draft' | 'validated' | 'published' | 'needs_refresh';

/**
 * occupation_entries 表行类型:结构主干 + 散文渲染,slug 外键指向 occupation_slugs(数据库级 FK,
 * 理由见 seed-importer/migration 头注——注册表先行,entries 只在 slug 已存在后才产生)。
 */
export interface OccupationEntryRow {
  slug: string;
  skeleton: OccupationSkeleton;
  /** 散文渲染(主干校验完之后的一次性廉价重排,不再单独校验) */
  prose: string;
  axis: Axis;
  status: OccupationEntryStatus;
  /** 该词条累计消耗的 token 成本(单条预算 5 万目标/8 万熔断的可盯指标) */
  cost_tokens: number;
  last_verified: Date | null;
}

/** occupation_edges.type:三选一,不同于 p2lib 老 EdgeType('traditional_to_ai'|'adjacent'|'transfers_to')。 */
export type OccupationEdgeType = 'adjacent' | 'upstream' | 'downstream';

/**
 * occupation_edges 表行类型:词条关系边,一等公民数据(不是骨架内嵌字段)。
 * from_slug/to_slug 不设数据库级外键(理由见 migration 头注),零悬空引用由脚本/校验器保证。
 */
export interface OccupationEdgeRow {
  from_slug: string;
  to_slug: string;
  type: OccupationEdgeType;
  note: string;
}

/** occupation_aliases 表行类型:别名表,精确命中检索用,唯一索引 (alias, slug)。 */
export interface OccupationAliasRow {
  alias: string;
  slug: string;
  weight: number;
}
