// 压力版(pressure,高标准):改编自 anthropics/knowledge-work-plugins (Apache-2.0) engineering skills
// (testing-strategy / code-review / debug / incident-response),按校招+中文场景修改;
// 英文框架概念(testing pyramid/edge case/root-cause/5-whys/blameless postmortem 等)仅内部参照,字段文本一律中文。
import { ProfessionPreset } from '../../common/types';

export const testDevCampusAnthropic: ProfessionPreset = {
  id: 'test-dev-campus-anthropic',
  profession: '测试开发',
  stage: 'campus',
  tier: 'pressure',
  displayName: '测试开发 · 校招(压力版 · 高标准)',
  dimensions: [
    {
      key: 'coding_framework_capability',
      name: '编程能力与框架自建',
      weight: 24,
      whatGoodLooksLike:
        '头部大厂卡分标准:测试开发本质是开发——Python 或 Java 掌握到"能独立从零搭测试框架"级,懂面向对象设计、并发、IO、异常处理;代码经得起 code review(单一职责、无重复、可维护、关键路径有自测);SQL(JOIN/索引/事务/执行计划)流畅;能写工具而非只会用工具。',
      campusEvidence:
        'GitHub 有自己设计的自动化测试框架(完整架构而非脚本堆);LeetCode 中等题能稳过(测开笔试也考算法);实习有写过被团队复用的测试工具或框架代码链接。',
      commonGaps:
        '【Anthropic 反模式·重复堆砌不抽象(duplication-over-abstraction)】用例复制粘贴、零封装零复用,维护成本爆炸;【录制回放侠】只会 Selenium 录制回放、写不了 Page Object 封装,是工具操作者非测试工程师。',
    },
    {
      key: 'testing_strategy_pyramid',
      name: '测试策略与分层设计',
      weight: 24,
      whatGoodLooksLike:
        '头部大厂卡分标准:懂测试金字塔——清楚单元/集成/契约/E2E 各覆盖什么、各自的速度与置信度取舍,知道"什么该多写单测、什么该少写慢的 E2E";聚焦业务关键路径、错误处理、边界、安全边界、数据完整性,跳过无价值的 trivial 用例;能从零搭 UI(Playwright+PageObject+报告+数据驱动)与接口(pytest/requests+参数化+断言+日志)框架并讲清稳定性/可维护性设计。',
      campusEvidence:
        'GitHub 项目是完整分层框架并有架构文档说明"为什么这样分层";有测试策略文档(覆盖目标+用例类型分配);实习中框架被团队其他人使用且讲得清取舍。',
      commonGaps:
        '【Anthropic 反模式·只测乐观路径(happy-path-only)】用例只覆盖正常流,异常/边界/并发/安全全漏,真实 Bug 一个抓不到;【测试金字塔倒挂(inverted-pyramid)】堆一堆慢而脆的 E2E、缺快而稳的单测,跑得慢又一动就红。',
    },
    {
      key: 'scenario_edge_design',
      name: '场景设计与边界覆盖',
      weight: 20,
      whatGoodLooksLike:
        '头部大厂卡分标准:拿到系统(电商下单/支付/IM)能快速列出 功能/性能/安全/边界/异常/并发 多维测试点,系统性挖空值/溢出/超时/竞态/幂等等边界;懂等价类/边界值/正交实验/全链路压测,能设计并发与竞态测试场景并讲清覆盖逻辑。',
      campusEvidence:
        '项目有"设计 XX 场景测试用例矩阵、覆盖 YY 个边界与异常条件"的描述;参与过压测专项或安全测试实习;能现场讲清"朋友圈发图"的多维用例设计。',
      commonGaps:
        '【Anthropic 反模式·忽略边界 case(edge-case-blind)】只想得到正常流,空值/并发/超时/竞态一律想不到,放过的全是真实线上 Bug;【HappyPath专员】只测顺畅路径、真实缺陷全漏。',
    },
    {
      key: 'debug_rootcause_quality',
      name: '缺陷定位与根因分析',
      weight: 18,
      whatGoodLooksLike:
        '头部大厂卡分标准:发现缺陷后能结构化定位(复现→隔离→定位根因→给可复现报告→加防回归用例),区分症状与根因(类 5-whys 追到底),提交的缺陷报告精确可复现、附根因与影响面;参与过线上质量事件的复盘(blameless postmortem 思路:对事不对人、产出可执行 action),推动质量左移。',
      campusEvidence:
        '简历有"定位到 P0 缺陷根因为并发下未加锁,补充竞态用例后拦截同类问题"这类带根因+防回归的句子;参与过故障复盘或质量度量(逃逸缺陷率/拦截率)的实习。',
      commonGaps:
        '【Anthropic 反模式·只报症状不究根因(symptom-not-root-cause)】缺陷报告只写"点了没反应",无复现步骤、无根因、无影响面,开发无法定位;【缺陷复读机(rerun-no-rca)】发现就重提,不做根因不补防回归,同类 Bug 反复逃逸。',
    },
    {
      key: 'cs_toolchain_devops',
      name: '计算机基础与工程工具链',
      weight: 14,
      whatGoodLooksLike:
        '头部大厂卡分标准:网络(HTTP(S)/TCP/DNS,接口测试必备)、Linux 常用命令(日志/进程/文件)、MySQL 核心原理扎实;Git 熟练、能配 Jenkins/GitLab CI 流水线、用 Docker 搭测试环境、用 JMeter/k6 做压测,理解 CI 把测试从手动改为自动触发的工程价值并有量化收益。',
      campusEvidence:
        '简历有"搭建 CI/CD 流水线把回归从手动改自动触发、每日省 2h / 缺陷拦截前移到 PR 阶段"的具体成果;能讲清 Jenkins 与 GitHub Actions 的差异与选型。',
      commonGaps:
        '【Anthropic 反模式·工具名单背诵(toolname-checklist)】CI/CD/Docker/JMeter 只是技能栏名词,讲不出实际用来解决什么、带来什么量化收益;【定义背诵员】测试理论停在名词定义,落地不到用例。',
    },
  ],
  explanationRubric:
    '每个维度必须给出 why:① 指出简历中具体命中/缺失的事实(编程与框架自建代码、测试策略与分层取舍、场景与边界覆盖、缺陷根因与防回归、工具链的量化收益),写进 evidenceFound/gap;② 说明在校招测试开发压力档语境下为何重要(大厂招的是"写代码搭框架+系统性挖 Bug+根因止血"的工程师而非手工点测);③ 命中反模式直接点名(如"只测乐观路径""测试金字塔倒挂""只报症状不究根因""录制回放侠""HappyPath专员""工具名单背诵"),不得空泛。严禁泄漏满分占比或扣分数值等内部计算。分数必须与 why 一致。',
  rewriteGuidance:
    '测试开发(压力版)改写铁律——只精修简历"已有"的框架/用例/缺陷句:讲精准(用了什么框架/工具、分层与覆盖规模多大、发现缺陷的根因与影响如何),用测开精准动词(搭建/封装/设计/覆盖/定位/止血)与可量化指标(用例数/覆盖率/P0 缺陷数/逃逸率/日构建次数)增强可信度;只在缺数字处用 [具体数字] 占位;严禁替候选人添加原句没有体现的框架能力、缺陷数字或根因分析,没写根因就不能编根因、没写覆盖率就不能造数字;凡简历没有的能力一律走"建议补充(gap_advice)"而非编造。',
  resumeConventions:
    '中国校招测试开发惯例核查(压力档从严):① 必须区分"测试开发"(写代码搭框架,大厂校招主招)与"测试"(偏手工/用例),压力档纯手工测试基本不得分;② 项目必须有代码且 GitHub 链接权重高于文字描述;③ 测试框架要写规模(用例数/覆盖率/日构建次数)且能讲清分层取舍,否则不可信;④ 缺陷成果写"定位 YY 个 P0 缺陷根因"而非"细心/负责任"等软词;⑤ 算法/竞赛加分低于后端,但开源贡献稀缺、加分显著;⑥ 不写爱好/个人评价,工程密度优先。',
};
