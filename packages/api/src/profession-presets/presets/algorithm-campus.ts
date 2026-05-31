// 融合版(standard,主力):AI/机器学习算法校招,含传统(CV/NLP/推荐)与大模型(LLM/RAG/Agent)方向;
// 属 AI+X、AI 为核心。可验证技术输出(论文/GitHub/竞赛)是硬通货。字段一律中文。
import { ProfessionPreset } from '../../common/types';

export const algorithmCampus: ProfessionPreset = {
  id: 'algorithm-campus',
  profession: '算法(含大模型)',
  stage: 'campus',
  tier: 'standard',
  displayName: '算法(含大模型)· 校招(融合版)',
  dimensions: [
    { key: 'math_foundation', name: '数学基础(线代/概率/优化)', weight: 25,
      whatGoodLooksLike: '线代(矩阵分解/SVD/特征值)+ 概率(贝叶斯/MLE/信息熵)+ 优化(SGD/Adam/凸优化)能推导关键公式;大模型方向理解 Transformer 注意力的矩阵形式。',
      campusEvidence: '数学类课程 A+;复现论文并记录推导过程的技术博客;面试中能推导 softmax 梯度。',
      commonGaps: '只会调 PyTorch API,问 BatchNorm 的数学定义就卡壳【反模式·调包侠:工具使用者、非算法理解者】。' },
    { key: 'model_depth', name: '算法与模型深度', weight: 25,
      whatGoodLooksLike: '传统方向精通某垂域(CV/NLP/RecSys)主流模型架构及变体;大模型方向理解 预训练→SFT→RLHF/DPO→RAG 完整链路,讲清 LoRA/QLoRA 微调原理与适用场景。',
      campusEvidence: '复现 SOTA 论文并在 GitHub 公开;Kaggle/天池 Top 5%;发表/投稿过论文(arXiv 预印本也算)。',
      commonGaps: '跑通了 notebook,但改一行代码就报错【反模式·笔记本跑通侠:运行了不代表理解了】。' },
    { key: 'engineering_landing', name: '工程实现与落地能力', weight: 20,
      whatGoodLooksLike: '能把模型部署成 API 服务(FastAPI/Flask);理解推理优化(量化/蒸馏/vLLM/TensorRT-LLM);有生产 AB 实验或百万级以上数据处理经验。大模型方向尤为看重“能把模型跑起来上线”。',
      campusEvidence: 'GitHub 有完整工程项目(含 Dockerfile/CI);实习有上线模型的业务效果数据(CTR 提升 X、BLEU 提升 Y)。',
      commonGaps: '论文实现了,但没考虑过延迟/吞吐/成本约束【反模式·实验室纯种:学术闭环、无工程意识】。' },
    { key: 'research_impact', name: '科研/竞赛/开源影响力', weight: 20,
      whatGoodLooksLike: '顶会论文(NeurIPS/ICLR/ACL/CVPR 一作或共一)> Kaggle 金牌 > 知名开源项目核心贡献 > 天池冠军。',
      campusEvidence: '论文链接/arXiv 编号;竞赛排名(写名次比例)+ 方案 Blog;GitHub star 与贡献记录。',
      commonGaps: '只有课程项目,没有任何可被招聘方独立核实的技术影响力【反模式·无迹可查型:简历无法被独立核实】。' },
    { key: 'domain_depth', name: '领域知识纵深', weight: 10,
      whatGoodLooksLike: '大模型方向 RAG/Agent/多模态/RLHF 任选其一讲到很深(框架选型理由+已知缺陷+解法);传统方向能讲清推荐系统 召回→粗排→精排→重排 全流程。',
      campusEvidence: '技术分享(掘金/知乎长文);对特定模型或论文做完整复现+改进报告。',
      commonGaps: '什么都懂一点,追问任何细节都说“大概了解”【反模式·表面冲浪者:宽而不深、面试深挖中存活不下来】。' },
  ],
  explanationRubric: '每个维度必须给出 why:① 指出简历中具体命中/缺失的事实(论文/arXiv、竞赛名次比例、GitHub、实习离线指标+在线 AB、数学推导能力),写进 evidenceFound/gap;② 说明在校招算法语境下为何重要;③ 命中反模式直接点名(如“调包侠”“笔记本跑通侠”“实验室纯种”“无迹可查型”“表面冲浪者”),不得空泛。分数必须与 why 一致。',
  rewriteGuidance: '改写只能基于简历已有内容重组/量化/补证据链(把“用了某模型”改写为带指标与工程约束的表述)。严禁虚构论文、竞赛或数字;缺数字用 [具体数字] 占位并在 reason 说明“建议补充真实数据”;简历无某经历输出“建议补充 X”而非编造;original 必须是简历原文一字不差。',
  resumeConventions: '中国校招算法惯例核查:① 项目/论文必须附链接(GitHub/arXiv,招聘方会点开核实),无链接近乎不计入评分;② 竞赛写名次比例(“天池 Top 0.5%”优于“第 8 名”);③ 实习算法工作写离线指标+在线 AB 实验结论,只写离线指标扣分;④ 硕博写清导师/实验室,顶会单位 > 普通 985;⑤ 大模型方向写过 RAG/Agent 应用或参与开源模型微调者明显加分;⑥ 无关证书(如 CFA)不写,技术密度优先。',
};
