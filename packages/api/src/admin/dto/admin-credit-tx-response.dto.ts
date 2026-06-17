import { CreditTransaction } from '../../credit/entities/credit-transaction.entity';

// 出参:管理后台单条积分流水(GET /admin/users/:id/credit-history)。
// 隐私铁律 + 字段白名单:fromMany() 静态工厂强制投影,绝不直接返回实体。
// type / endpoint / note 是运营必要信息,无 PII;created_by(充值管理员 id)admin 可见。
// CreditTransaction 实体本就只含账务字段(无正文),此 DTO 锁定投影并稳定对外契约。
export class AdminCreditTxResponseDto {
  id: string;
  delta: number;
  type: string;
  balance_after: number;
  note: string | null;
  created_by: string | null;
  endpoint: string | null;
  created_at: string; // ISO 8601 字符串

  static from(tx: CreditTransaction): AdminCreditTxResponseDto {
    const dto = new AdminCreditTxResponseDto();
    dto.id = tx.id;
    dto.delta = tx.delta;
    dto.type = tx.type;
    dto.balance_after = tx.balance_after;
    dto.note = tx.note;
    dto.created_by = tx.created_by;
    dto.endpoint = tx.endpoint;
    dto.created_at = tx.created_at.toISOString();
    return dto;
  }

  static fromMany(items: CreditTransaction[]): AdminCreditTxResponseDto[] {
    return items.map((t) => AdminCreditTxResponseDto.from(t));
  }
}

// 出参:积分流水分页响应(GET /admin/users/:id/credit-history)。
export interface AdminCreditHistoryResponse {
  items: AdminCreditTxResponseDto[];
  total: number;
}
