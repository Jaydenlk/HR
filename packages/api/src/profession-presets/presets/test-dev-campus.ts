// 融合版(standard,主力):测试开发校招。大厂招的是“测试开发”(写代码搭框架)而非手工测试;
// 核心=编程能力+自动化框架设计+测试场景设计。字段一律中文。
import { ProfessionPreset } from '../../common/types';

export const testDevCampus: ProfessionPreset = {
  id: 'test-dev-campus',
  profession: '测试开发',
  stage: 'campus',
  tier: 'standard',
  displayName: '测试开发 · 校招(融合版)',
  dimensions: [
    { key: 'coding', name: '编程能力(Python/Java)', weight: 25,
      whatGoodLooksLike: 'Python(数据处理/脚本/接口测试)或 Java 至少一门掌握到“能独立搭框架”级;理解常用类/IO/异常处理;SQL 增删改查+JOIN+索引+事务流畅。',
      campusEvidence: 'GitHub 有自己写的自动化测试框架代码;LeetCode 基础题能做(测试岗笔试也考算法);实习写过测试脚本的代码链接。',
      commonGaps: '只会用 Selenium 录制回放,写不了 Page Object 封装【反模式·录制回放侠:工具操作者、非测试工程师】。' },
    { key: 'automation_framework', name: '自动化测试框架设计', weight: 25,
      whatGoodLooksLike: '能从零搭 UI 自动化框架(Selenium/Playwright + PageObject + 报告 + 数据驱动)与接口测试框架(requests/pytest + 参数化 + 断言 + 日志);理解框架稳定性/可维护性设计。',
      campusEvidence: 'GitHub 项目是完整框架而非单个测试文件;有框架设计文档说明架构决策;实习中框架被团队其他人使用。',
      commonGaps: '测试用例写了一堆,但没有封装/复用/异常处理【反模式·脚本堆砌者:有量无质、维护成本极高】。' },
    { key: 'cs_test_theory', name: '计算机基础与测试理论', weight: 20,
      whatGoodLooksLike: '网络(HTTP(S)/TCP/DNS,接口测试必须)+ Linux 常用命令(日志/进程/文件)+ 测试理论(等价类/边界值/正交实验)+ MySQL 核心原理。',
      campusEvidence: '能讲“朋友圈发图”的完整测试用例设计(功能/性能/安全/兼容多维度);面试能讲清一次完整 Bug 生命周期。',
      commonGaps: '测试理论停留在“功能测试/回归测试”定义层面,问边界值分析给不出用例【反模式·定义背诵员:知道名词不会落地】。' },
    { key: 'scenario_design', name: '测试场景设计能力', weight: 20,
      whatGoodLooksLike: '拿到一个系统(电商下单/IM 消息/支付)能快速列出 功能/性能/安全/边界/异常 5 个维度的测试点;理解全链路压测;能设计并发/竞态条件测试场景。',
      campusEvidence: '项目描述中有“设计了 XX 场景的测试用例矩阵、覆盖 YY 个边界条件”;参与过压测专项或安全测试的实习。',
      commonGaps: '测试用例只有正常流,没有异常/边界/并发【反模式·HappyPath专员:只测顺畅路径、真实 Bug 全漏掉】。' },
    { key: 'toolchain', name: '工程工具链(CI/DevOps)', weight: 10,
      whatGoodLooksLike: 'Git 基本操作熟练;理解 Jenkins/GitLab CI 流水线配置;会用 Docker 搭测试环境;接触过 JMeter/k6 压测工具。',
      campusEvidence: '简历有“在 XX 实习搭建 CI/CD 流水线,将回归测试从手动执行改为自动触发,节省每日 2h”的具体成果。',
      commonGaps: '不知道 Jenkins 和 GitHub Actions 的区别,CI/CD 只是听过名字【反模式·工具名单背诵型】。' },
  ],
  explanationRubric: '每个维度必须给出 why:① 指出简历中具体命中/缺失的事实(编程/框架代码、GitHub 链接、框架规模、用例设计、Bug 数据),写进 evidenceFound/gap;② 说明在校招测试开发语境下为何重要;③ 命中反模式直接点名(如“录制回放侠”“脚本堆砌者”“HappyPath专员”“定义背诵员”),不得空泛。分数必须与 why 一致。',
  rewriteGuidance: '改写只能基于简历已有内容重组/量化/补证据链(把“做了自动化测试”改写为带框架架构/规模/缺陷数的表述)。严禁虚构项目、数字或经历;缺数字用 [具体数字] 占位并在 reason 说明“建议补充真实数据”;简历无某经历输出“建议补充 X”而非编造;original 必须是简历原文一字不差。',
  resumeConventions: '中国校招测试开发惯例核查:① 必须区分“测试开发”(写代码搭框架,大厂校招主招)与“测试”(偏手工/用例);② 项目中必须有代码,GitHub 链接比文字描述权重高;③ 测试框架要写规模(用例数/日构建次数/覆盖率指标),否则不可信;④ 不写“细心/负责任”等软性词,改写成“发现并记录了 YY 个 P0 级缺陷”;⑤ 算法/竞赛加分低于后端,但开源贡献稀缺、加分显著。',
};
