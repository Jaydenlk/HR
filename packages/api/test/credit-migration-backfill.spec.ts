/**
 * 存量回填数据自洽性(用 sqlite 跑迁移回填的等价 SQL,验证真实数据正确)。
 *
 * 迁移的建表 DDL 是 Postgres 专用(gen_random_uuid 等),本机无 PG 无法直接 migration:run;
 * 但回填两条语句(UPDATE +50、INSERT...SELECT signup_grant)是可移植 SQL,口径与迁移一致。
 * 本测试在 sqlite 建等价表、播 3 个不同初值的用户,跑这两条语句,断言:
 *  - 每个用户余额 = 初值 + 50;
 *  - 每个用户恰好一条 signup_grant 流水,delta=50,balance_after = 回填后余额(自洽)。
 */
import Database from 'better-sqlite3';

interface UserRow {
  id: string;
  credit_balance: number;
}
interface TxRow {
  user_id: string;
  delta: number;
  type: string;
  balance_after: number;
  note: string | null;
  created_by: string | null;
  endpoint: string | null;
}

describe('AddCreditSystem 存量回填(sqlite 等价 SQL)', () => {
  it('全员 +50 且逐人一条 signup_grant,balance_after 与余额自洽', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE users (id TEXT PRIMARY KEY, credit_balance INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE credit_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        delta INTEGER NOT NULL,
        type TEXT NOT NULL,
        balance_after INTEGER NOT NULL,
        note TEXT,
        created_by TEXT,
        endpoint TEXT
      );
    `);
    // 3 个不同初值的存量用户(默认 0、被手工调过的 0、以及一个非 0 边界)。
    db.prepare(`INSERT INTO users (id, credit_balance) VALUES (?, ?)`).run('u1', 0);
    db.prepare(`INSERT INTO users (id, credit_balance) VALUES (?, ?)`).run('u2', 0);
    db.prepare(`INSERT INTO users (id, credit_balance) VALUES (?, ?)`).run('u3', 7);

    // 迁移回填的两条可移植语句(列引号去掉以适配 sqlite,语义等价)。
    db.exec(`UPDATE users SET credit_balance = credit_balance + 50`);
    db.exec(`
      INSERT INTO credit_transactions (user_id, delta, type, balance_after, note, created_by, endpoint)
      SELECT id, 50, 'signup_grant', credit_balance, NULL, NULL, NULL FROM users
    `);

    const users = db.prepare(`SELECT id, credit_balance FROM users ORDER BY id`).all() as UserRow[];
    const txs = db
      .prepare(`SELECT user_id, delta, type, balance_after, note, created_by, endpoint FROM credit_transactions ORDER BY user_id`)
      .all() as TxRow[];

    // eslint-disable-next-line no-console
    console.log('users after backfill:', JSON.stringify(users));
    // eslint-disable-next-line no-console
    console.log('credit_transactions:', JSON.stringify(txs));

    expect(users).toEqual([
      { id: 'u1', credit_balance: 50 },
      { id: 'u2', credit_balance: 50 },
      { id: 'u3', credit_balance: 57 },
    ]);
    // 每人恰好一条 signup_grant,balance_after == 回填后余额。
    expect(txs).toHaveLength(3);
    for (const tx of txs) {
      expect(tx.type).toBe('signup_grant');
      expect(tx.delta).toBe(50);
      const u = users.find((x) => x.id === tx.user_id);
      expect(tx.balance_after).toBe(u?.credit_balance);
      expect(tx.note).toBeNull();
      expect(tx.created_by).toBeNull();
      expect(tx.endpoint).toBeNull();
    }
    db.close();
  });
});
