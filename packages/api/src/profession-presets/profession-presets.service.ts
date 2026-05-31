import { Injectable, NotFoundException } from '@nestjs/common';
import { ProfessionPreset, ProfessionTier } from '../common/types';
import { productManagerCampus } from './presets/product-manager-campus';
import { productManagerCampusAnthropic } from './presets/product-manager-campus-anthropic';
import { financeManagementTraineeCampus } from './presets/finance-management-trainee-campus';
import { auditorFirmCampus } from './presets/auditor-firm-campus';
import { accountantGlCampus } from './presets/accountant-gl-campus';
import { fpaAnalystCampus } from './presets/fpa-analyst-campus';
import { backendCampus } from './presets/backend-campus';
import { algorithmCampus } from './presets/algorithm-campus';
import { frontendCampus } from './presets/frontend-campus';
import { testDevCampus } from './presets/test-dev-campus';
import { operationsCampus } from './presets/operations-campus';
import { securitiesResearchCampus } from './presets/securities-research-campus';
import { investmentBankingCampus } from './presets/investment-banking-campus';
import { riskManagementCampus } from './presets/risk-management-campus';
import { quantCampus } from './presets/quant-campus';
import { dataAnalystCampus } from './presets/data-analyst-campus';
import { salesCampus } from './presets/sales-campus';
import { designerCampus } from './presets/designer-campus';
import { marketingCampus } from './presets/marketing-campus';
import { recruiterCampus } from './presets/recruiter-campus';
import { hrbpCampus } from './presets/hrbp-campus';
import { compensationCampus } from './presets/compensation-campus';
import { legalCampus } from './presets/legal-campus';
import { supplyChainCampus } from './presets/supply-chain-campus';
import { customerSuccessCampus } from './presets/customer-success-campus';
import { adminCampus } from './presets/admin-campus';
import { embeddedCampus } from './presets/embedded-campus';
import { bankingCampus } from './presets/banking-campus';
import { assetMgmtCampus } from './presets/asset-mgmt-campus';
import { devopsSreCampus } from './presets/devops-sre-campus';
import { bigdataEngCampus } from './presets/bigdata-eng-campus';
import { visualDesignCampus } from './presets/visual-design-campus';
import { taxCampus } from './presets/tax-campus';
import { brandPrCampus } from './presets/brand-pr-campus';
import { consultingCampus } from './presets/consulting-campus';
import { businessAnalystCampus } from './presets/business-analyst-campus';
import { securityCampus } from './presets/security-campus';
import { gamedevCampus } from './presets/gamedev-campus';
import { dataScienceCampus } from './presets/data-science-campus';
import { interactionDesignCampus } from './presets/interaction-design-campus';
import { industrialDesignCampus } from './presets/industrial-design-campus';
import { gameArtCampus } from './presets/game-art-campus';
import { ecommerceOpsCampus } from './presets/ecommerce-ops-campus';
import { growthCampus } from './presets/growth-campus';
import { newmediaCampus } from './presets/newmedia-campus';
import { gameDesignCampus } from './presets/game-design-campus';
import { marketResearchCampus } from './presets/market-research-campus';
import { bdCampus } from './presets/bd-campus';
import { actuaryCampus } from './presets/actuary-campus';
import { creditAnalysisCampus } from './presets/credit-analysis-campus';
import { costAccountingCampus } from './presets/cost-accounting-campus';
import { internalAuditCampus } from './presets/internal-audit-campus';
import { orgDevelopmentCampus } from './presets/org-development-campus';
import { procurementCampus } from './presets/procurement-campus';
import { projectManagementCampus } from './presets/project-management-campus';
import { fmcgMtCampus } from './presets/fmcg-mt-campus';
import { medicalRepCampus } from './presets/medical-rep-campus';
import { trainingDevelopmentCampus } from './presets/training-development-campus';
import { corporateStrategyCampus } from './presets/corporate-strategy-campus';
import { realEstateCampus } from './presets/real-estate-campus';
import { educationCampus } from './presets/education-campus';
import { dataWarehouseDevCampus } from './presets/data-warehouse-dev-campus';
import { biEngineerCampus } from './presets/bi-engineer-campus';
import { digitalTransformationConsultingCampus } from './presets/digital-transformation-consulting-campus';
import { riskAdvisoryCampus } from './presets/risk-advisory-campus';
import { processEngineerCampus } from './presets/process-engineer-campus';
import { qualityEngineerCampus } from './presets/quality-engineer-campus';
import { craClinicalCampus } from './presets/cra-clinical-campus';
import { storeManagerTraineeCampus } from './presets/store-manager-trainee-campus';
import { recsysAdsAlgoCampus } from './presets/recsys-ads-algo-campus';
import { multimediaDevCampus } from './presets/multimedia-dev-campus';
import { infraMiddlewareCampus } from './presets/infra-middleware-campus';
import { dataProductManagerCampus } from './presets/data-product-manager-campus';
import { strategyProductManagerCampus } from './presets/strategy-product-manager-campus';
import { userOperationsCampus } from './presets/user-operations-campus';
import { motionDesignCampus } from './presets/motion-design-campus';
import { uxResearchCampus } from './presets/ux-research-campus';
import { threeDDesignCampus } from './presets/three-d-design-campus';
import { salesOperationsCampus } from './presets/sales-operations-campus';
import { crossBorderEcommerceCampus } from './presets/cross-border-ecommerce-campus';
import { adOptimizerCampus } from './presets/ad-optimizer-campus';
import { wealthManagementCampus } from './presets/wealth-management-campus';
import { institutionalSalesCampus } from './presets/institutional-sales-campus';
import { financeBpCampus } from './presets/finance-bp-campus';
import { cashierCampus } from './presets/cashier-campus';
import { treasuryCampus } from './presets/treasury-campus';
import { hrSscCampus } from './presets/hr-ssc-campus';
import { hrTraineeCampus } from './presets/hr-trainee-campus';
import { recruitmentConsultantCampus } from './presets/recruitment-consultant-campus';
import { compliancePrivacyCampus } from './presets/compliance-privacy-campus';
import { ipPatentCampus } from './presets/ip-patent-campus';

const PRESETS: ProfessionPreset[] = [
  productManagerCampus,
  productManagerCampusAnthropic,
  financeManagementTraineeCampus,
  auditorFirmCampus,
  accountantGlCampus,
  fpaAnalystCampus,
  backendCampus,
  algorithmCampus,
  frontendCampus,
  testDevCampus,
  operationsCampus,
  securitiesResearchCampus,
  investmentBankingCampus,
  riskManagementCampus,
  quantCampus,
  dataAnalystCampus,
  salesCampus,
  designerCampus,
  marketingCampus,
  recruiterCampus,
  hrbpCampus,
  compensationCampus,
  legalCampus,
  supplyChainCampus,
  customerSuccessCampus,
  adminCampus,
  embeddedCampus,
  bankingCampus,
  assetMgmtCampus,
  devopsSreCampus,
  bigdataEngCampus,
  visualDesignCampus,
  taxCampus,
  brandPrCampus,
  consultingCampus,
  businessAnalystCampus,
  securityCampus,
  gamedevCampus,
  dataScienceCampus,
  interactionDesignCampus,
  industrialDesignCampus,
  gameArtCampus,
  ecommerceOpsCampus,
  growthCampus,
  newmediaCampus,
  gameDesignCampus,
  marketResearchCampus,
  bdCampus,
  actuaryCampus,
  creditAnalysisCampus,
  costAccountingCampus,
  internalAuditCampus,
  orgDevelopmentCampus,
  procurementCampus,
  projectManagementCampus,
  fmcgMtCampus,
  medicalRepCampus,
  trainingDevelopmentCampus,
  corporateStrategyCampus,
  realEstateCampus,
  educationCampus,
  dataWarehouseDevCampus,
  biEngineerCampus,
  digitalTransformationConsultingCampus,
  riskAdvisoryCampus,
  processEngineerCampus,
  qualityEngineerCampus,
  craClinicalCampus,
  storeManagerTraineeCampus,
  recsysAdsAlgoCampus,
  multimediaDevCampus,
  infraMiddlewareCampus,
  dataProductManagerCampus,
  strategyProductManagerCampus,
  userOperationsCampus,
  motionDesignCampus,
  uxResearchCampus,
  threeDDesignCampus,
  salesOperationsCampus,
  crossBorderEcommerceCampus,
  adOptimizerCampus,
  wealthManagementCampus,
  institutionalSalesCampus,
  financeBpCampus,
  cashierCampus,
  treasuryCampus,
  hrSscCampus,
  hrTraineeCampus,
  recruitmentConsultantCampus,
  compliancePrivacyCampus,
  ipPatentCampus,
];

const tierKey = (profession: string, tier: ProfessionTier): string => `${profession}::${tier}`;

export interface ProfessionOption {
  profession: string;
  tiers: Array<{ tier: ProfessionTier; presetId: string; displayName: string }>;
}

export interface ProfessionGroup {
  category: string;
  options: ProfessionOption[];
}

// 职业大类(数组顺序 = 前端展示顺序);新增职业时把其 profession 归入对应大类的 professions 即可。
const CATEGORY_ORDER: ReadonlyArray<{ category: string; professions: readonly string[] }> = [
  { category: "技术研发", professions: ["后端开发", "前端/客户端", "算法(含大模型)", "测试开发", "硬件开发/嵌入式", "运维/SRE", "大数据开发", "网络安全", "游戏开发", "推荐/搜索/广告算法", "音视频/多媒体开发", "基础架构/中间件"] },
  { category: "产品 · 运营", professions: ["互联网产品经理", "运营(含AIGC)", "电商运营", "增长运营", "新媒体运营", "游戏策划", "数据产品经理", "策略产品经理", "用户运营"] },
  { category: "设计", professions: ["设计师(UI/UX)", "视觉/平面设计", "交互设计", "工业设计", "游戏美术/原画", "动效设计师", "用户研究(UXR)", "三维设计师(3D)"] },
  { category: "数据", professions: ["数据分析师", "数据科学", "数据开发(数仓/ETL)", "BI工程师"] },
  { category: "市场 · 销售", professions: ["市场营销", "销售", "品牌/公关(PR)", "市场研究/用户研究", "商务拓展(BD)", "销售运营", "跨境电商/海外销售", "广告投放/优化师"] },
  { category: "金融", professions: ["证券研究/行业研究", "投行(IBD)", "风控/风险管理", "量化研究/交易", "银行(管培/综合岗)", "资产管理/资管", "精算", "信贷/信用分析", "财富管理/投顾", "机构销售/交易(FICC)"] },
  { category: "财务", professions: ["财务管培生", "审计(事务所)", "会计核算", "财务分析/FP&A", "税务", "成本会计", "内审/内控", "财务BP(业财融合)", "出纳/资金", "资金管理/司库"] },
  { category: "人力资源", professions: ["招聘/校园招聘", "HRBP", "薪酬福利(C&B)", "组织发展(OD)", "培训发展(TD)", "HR共享服务(SSC)", "HR管培生", "招聘顾问/猎头"] },
  { category: "职能 · 法务", professions: ["法务", "供应链/物流", "客服/客户成功", "行政", "采购", "项目管理(PMO)", "合规/数据隐私", "知识产权/专利"] },
  { category: "咨询 · 战略", professions: ["管理咨询", "商业分析(BA)", "企业战略", "数字化转型咨询(IT)", "风险咨询(内控/合规)"] },
  { category: "行业 · 垂类", professions: ["快消管培生", "医药代表", "地产(营销策划)", "教育(教研/教师)", "工艺工程师(制造/半导体)", "质量工程师(SQE/QE)", "临床监查员(CRA)", "门店管培/储备店长"] },
];

@Injectable()
export class ProfessionPresetsService {
  private readonly byProfessionTier = new Map(PRESETS.map((p) => [tierKey(p.profession, p.tier), p]));

  /** 按大类分组的职业清单(每个职业含其可用难度档),供前端下拉 optgroup / 档位开关使用。 */
  list(): ProfessionGroup[] {
    const byProfession = new Map<string, ProfessionOption>();
    for (const p of PRESETS) {
      const opt = byProfession.get(p.profession) ?? { profession: p.profession, tiers: [] };
      opt.tiers.push({ tier: p.tier, presetId: p.id, displayName: p.displayName });
      byProfession.set(p.profession, opt);
    }
    const used = new Set<string>();
    const groups: ProfessionGroup[] = [];
    for (const { category, professions } of CATEGORY_ORDER) {
      const options = professions
        .map((name) => byProfession.get(name))
        .filter((o): o is ProfessionOption => !!o);
      options.forEach((o) => used.add(o.profession));
      if (options.length > 0) groups.push({ category, options });
    }
    // 兜底:未在 CATEGORY_ORDER 归类的职业(如新增未登记)仍可见,不至于消失。
    const rest = [...byProfession.values()].filter((o) => !used.has(o.profession));
    if (rest.length > 0) groups.push({ category: '其他', options: rest });
    return groups;
  }

  resolveByProfession(profession: string, tier: ProfessionTier = 'standard'): ProfessionPreset {
    const p = this.byProfessionTier.get(tierKey(profession, tier));
    if (!p) {
      throw new NotFoundException(`暂不支持该职业/难度档的校招诊断: ${profession} (${tier})`);
    }
    return p;
  }
}
