// 出参:单用户活动明细响应(GET /admin/user-activity)。
// 隐私铁律:只暴露计数级数据。原始调用内容(简历文本/对话内容/JD原文等)严禁出现在任何字段。
// 手工映射风格:沿用 AdminUserRow 模式,字段逐一声明,无 class-transformer 自动透传。

// 每个端点的调用计数汇总。
export interface EndpointCallCount {
  endpoint: string;
  count: number;
}

// credit 消耗计数汇总(按端点分组)。
export interface EndpointCreditCount {
  endpoint: string | null; // consume 记录可能无 endpoint(旧数据兼容)
  count: number;
}

export class AdminActivityResponseDto {
  // 被查询用户 ID(与入参 userId 一致,供前端校验)。
  userId: string;

  // 时间窗口:ISO 8601 字符串,与入参 from/to 对应。
  from: string | null;
  to: string | null;

  // AI 调用次数按端点分组(来源:ai_usage 表,只含成功调用)。
  aiCallsByEndpoint: EndpointCallCount[];

  // AI 调用总次数(= aiCallsByEndpoint 各项之和)。
  aiCallsTotal: number;

  // credit 消耗次数按端点分组(来源:credit_transactions where type='consume')。
  creditConsumeByEndpoint: EndpointCreditCount[];

  // credit 消耗总次数。
  creditConsumeTotal: number;

  // 静态工厂:从聚合原始数据构造响应,强制只输出白名单字段。
  static from(params: {
    userId: string;
    from: string | null;
    to: string | null;
    aiCallsByEndpoint: EndpointCallCount[];
    creditConsumeByEndpoint: EndpointCreditCount[];
  }): AdminActivityResponseDto {
    const dto = new AdminActivityResponseDto();
    dto.userId = params.userId;
    dto.from = params.from;
    dto.to = params.to;
    dto.aiCallsByEndpoint = params.aiCallsByEndpoint;
    dto.aiCallsTotal = params.aiCallsByEndpoint.reduce((s, r) => s + r.count, 0);
    dto.creditConsumeByEndpoint = params.creditConsumeByEndpoint;
    dto.creditConsumeTotal = params.creditConsumeByEndpoint.reduce((s, r) => s + r.count, 0);
    return dto;
  }
}
