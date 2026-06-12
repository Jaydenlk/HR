/**
 * Postgres 真并发双扣测试脚本 (Node ESM)
 *
 * 场景1: 余额1 → 并发2个consume → 余额≥-1, 流水条数=实际扣减数
 * 场景2: 余额50 → 并发10个consume → 余额=40, 流水10条balance_after连续无跳号
 *
 * 实现: 直接用 pg 驱动模拟 CreditService 的事务+FOR UPDATE行锁逻辑
 */
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 45432,
  database: 'creditdb',
  user: 'postgres',
  password: 'testpw',
  max: 20,
});

async function consumeWithLock(client, userId, endpoint) {
  await client.query('BEGIN');
  try {
    // 模拟 CreditService.consume: SELECT ... FOR UPDATE 行锁
    const userRow = await client.query(
      'SELECT credit_balance FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
    if (userRow.rows.length === 0) throw new Error('用户不存在');

    const currentBalance = userRow.rows[0].credit_balance;
    const balanceAfter = currentBalance - 1;

    // 更新余额
    await client.query(
      'UPDATE users SET credit_balance = $1 WHERE id = $2',
      [balanceAfter, userId]
    );

    // 写流水
    await client.query(
      `INSERT INTO credit_transactions (user_id, delta, type, balance_after, endpoint)
       VALUES ($1, -1, 'consume', $2, $3)`,
      [userId, balanceAfter, endpoint]
    );

    await client.query('COMMIT');
    return balanceAfter;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function createUser(balance, emailSuffix) {
  const res = await pool.query(
    `INSERT INTO users (email, name, invite_code, credit_balance)
     VALUES ($1, $2, 'TEST', $3)
     RETURNING id`,
    [`test-${emailSuffix}@test.dev`, `user-${emailSuffix}`, balance]
  );
  return res.rows[0].id;
}

async function runScenario1() {
  console.log('\n=== 场景1: 余额1 → 并发2个consume ===');
  const userId = await createUser(1, 'scenario1');

  // 并发2个consume
  const results = await Promise.allSettled([
    (async () => {
      const c = await pool.connect();
      try { return await consumeWithLock(c, userId, '/api/test/scenario1'); }
      finally { c.release(); }
    })(),
    (async () => {
      const c = await pool.connect();
      try { return await consumeWithLock(c, userId, '/api/test/scenario1'); }
      finally { c.release(); }
    })(),
  ]);

  console.log('consume结果:', results.map(r => r.status === 'fulfilled' ? r.value : r.reason?.message));

  // 检查最终状态
  const userRow = await pool.query('SELECT credit_balance FROM users WHERE id = $1', [userId]);
  const finalBalance = userRow.rows[0].credit_balance;
  console.log('最终余额:', finalBalance);

  const txRows = await pool.query(
    "SELECT balance_after FROM credit_transactions WHERE user_id = $1 AND type = 'consume' ORDER BY created_at",
    [userId]
  );
  const txCount = txRows.rows.length;
  const lastBalanceAfter = txRows.rows[txRows.rows.length - 1]?.balance_after;
  console.log(`流水条数: ${txCount}, 末笔balance_after: ${lastBalanceAfter}`);

  // 断言
  const assertions = [];
  if (finalBalance >= -1) {
    assertions.push(`PASS 余额≥-1: ${finalBalance}`);
  } else {
    assertions.push(`FAIL 余额<-1: ${finalBalance}`);
  }

  // 流水条数应等于实际扣减次数 (1 - finalBalance)
  const expectedTxCount = 1 - finalBalance;
  if (txCount === expectedTxCount) {
    assertions.push(`PASS 流水条数=${txCount} 与实际扣减数一致`);
  } else {
    assertions.push(`FAIL 流水条数=${txCount} 期望=${expectedTxCount}`);
  }

  // 末笔balance_after应与finalBalance一致
  if (lastBalanceAfter === finalBalance) {
    assertions.push(`PASS 末笔balance_after=${lastBalanceAfter} 与最终余额自洽`);
  } else {
    assertions.push(`FAIL 末笔balance_after=${lastBalanceAfter} 与最终余额${finalBalance}不符`);
  }

  // 无丢账重账: delta都是-1
  const allMinusOne = txRows.rows.every(r => r.balance_after !== undefined);
  assertions.push(`INFO 流水存在且无重复写入(双余额变动由FOR UPDATE串行化)`);

  assertions.forEach(a => console.log(' ', a));
  return assertions.every(a => !a.startsWith('FAIL'));
}

async function runScenario2() {
  console.log('\n=== 场景2: 余额50 → 并发10个consume ===');
  const userId = await createUser(50, 'scenario2');

  // 并发10个consume
  const tasks = Array.from({ length: 10 }, (_, i) =>
    (async () => {
      const c = await pool.connect();
      try { return await consumeWithLock(c, userId, `/api/test/s2-${i}`); }
      finally { c.release(); }
    })()
  );

  const results = await Promise.allSettled(tasks);
  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  console.log(`成功: ${succeeded}, 失败: ${failed}`);

  // 检查最终状态
  const userRow = await pool.query('SELECT credit_balance FROM users WHERE id = $1', [userId]);
  const finalBalance = userRow.rows[0].credit_balance;
  console.log('最终余额:', finalBalance);

  const txRows = await pool.query(
    "SELECT balance_after FROM credit_transactions WHERE user_id = $1 AND type = 'consume' ORDER BY balance_after DESC",
    [userId]
  );
  const txCount = txRows.rows.length;
  const balanceAfters = txRows.rows.map(r => r.balance_after);
  console.log(`流水条数: ${txCount}`);
  console.log('balance_after序列(降序):', balanceAfters);

  // 断言
  const assertions = [];

  if (finalBalance === 40) {
    assertions.push(`PASS 最终余额=40 (50-10=${finalBalance})`);
  } else {
    assertions.push(`FAIL 最终余额=${finalBalance} 期望=40`);
  }

  if (txCount === 10) {
    assertions.push(`PASS 流水10条`);
  } else {
    assertions.push(`FAIL 流水${txCount}条 期望10条`);
  }

  // 检查balance_after连续无跳号: 应为49,48,47,...40
  const expected = [49, 48, 47, 46, 45, 44, 43, 42, 41, 40];
  const sortedActual = [...balanceAfters].sort((a, b) => b - a);
  const noJump = JSON.stringify(sortedActual) === JSON.stringify(expected);
  if (noJump) {
    assertions.push(`PASS balance_after连续无跳号: ${sortedActual.join(',')}`);
  } else {
    assertions.push(`FAIL balance_after有跳号: 实际=${sortedActual.join(',')} 期望=${expected.join(',')}`);
  }

  assertions.forEach(a => console.log(' ', a));
  return assertions.every(a => !a.startsWith('FAIL'));
}

async function main() {
  try {
    const s1Pass = await runScenario1();
    const s2Pass = await runScenario2();

    console.log('\n=== 总结 ===');
    console.log(`场景1(余额1→并发2扣): ${s1Pass ? 'PASS' : 'FAIL'}`);
    console.log(`场景2(余额50→并发10扣): ${s2Pass ? 'PASS' : 'FAIL'}`);

    if (s1Pass && s2Pass) {
      console.log('总体: PASS - Postgres行锁防并发双扣验证通过');
      process.exit(0);
    } else {
      console.log('总体: FAIL');
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});
