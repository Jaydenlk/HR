---
name: verify-coach-change
description: "任何人(用户、主代理、子代理)声称本仓库(Coach)的代码改动'完成/通过/可合并/可上线'之前,必须先走本技能过六门验收 + Playwright 硬门。TRIGGER when: 准备提交声称任务完成、准备合并 feat/* 分支进 dev、准备说'测试通过了'、准备写 PASS 结论。DO NOT TRIGGER when: 只是在探索代码或讨论方案,尚未产生可验收的改动。"
---

# verify-coach-change

本仓库六门验收此前靠 prompt 里手抄,六份拷贝出现过内容漂移事故(裸 jest 当全量跑、e2e 命令用错导致静默 0 匹配却报"全部通过")。本技能是六门验收的单一真相源,正文只讲判据和使用方法,脚本内部实现细节不在此复述——脚本本身才是权威,改动脚本不必同步改这份文档的判据逻辑,只有判据本身变化才需要改本文件。

## 1. 六门 = 跑脚本,不是跑感觉

```
node scripts/run-gates.mjs --json <输出路径>
```

- 只读 JSON 结果做判定,不读终端滚动的观感。
- `overall_pass === false` → 未通过,不许合并/不许说"完成"。
- 任意一个测试门(`api-unit` / `api-e2e`)的 `stats_line` 为 `null` → 该门视为 FAIL,即便它的 `exit_code` 是 0。这是防"0 匹配静默漏跑却报绿"的机械判据,不接受"看着退出码是 0 应该就是过了"的解释。
- `--skip` 用于前端未改动时跳过 web 门(`web-lint` / `web-build`),但跳过必须显式声明——JSON 的 `skipped` 数组必须能看到跳过原因,不许悄悄不跑。
- 结论必须绑定 `head_commit`(脚本用 `git rev-parse HEAD` 实读)。汇报里只说"跑过了"而不带 commit hash 的,视为无效证据。

## 2. Playwright 硬门(脚本管不到,人/代理必须真跑真过)

判据(不因为"麻烦"而降级):
- 涉及前端改动或任何用户可见行为变更 → Playwright 必须真跑真过,"环境起不来"不算通过,起不来按 STOP 处理、修好环境再验,不许标 SKIPPED 混过去。
- 纯后端、不影响任何用户可见行为的改动 → 此门 N/A,但必须在结论里写明 N/A 的理由(不写理由 = 可能是偷懒跳过,视同未过)。

worktree 环境准备四步(缺一步服务起不来或端口对不上):
1. 从主仓库拷 `.env` / `.env.local`(gitignored,worktree 不会自动带):`packages/api/.env`、`packages/web/.env.local`。
2. 验收用 build + start,不用 dev 模式(dev 模式单页编译慢且吃内存,起不来不代表代码错)。
3. web 用 `npx next start --port 3001`,不用裸 `npm start`(web 的 start 脚本默认监听 3000,和 `playwright.config.ts` 里 `baseURL http://localhost:3001` 对不上)。
4. 需要 dev-login 时,先调用 dev-login 接口拿 token 写入 `localStorage` 再跑用例。

一句话坑位:
- 端口冲突(3001/3002 被主 dev 服务占用):先确认冲突来源,换端口要同步改 `.env.local` 的 `NEXT_PUBLIC_API_URL` 与 Playwright `baseURL`,不要盲目 kill 别的任务的服务。
- 本机 5432 起不来(Windows 重启后常见):winnat 端口排除区间吞了 5432,管理员权限跑 `net stop winnat` → `netsh int ipv4 add excludedportrange protocol=tcp startport=5432 numberofports=1` → `net start winnat`。

## 3. 证据文化三条(没有证据 = 没有完成)

1. 没有原始输出(命令回显/JSON 文件/截图)= 没有通过。"跑了,应该没问题"不是证据。
2. 任何"完成/通过"结论必须含 `head_commit`,防止结论绑定到错误的提交(幻影提交)。
3. Playwright 结论必须附截图或至少 test runner 的原始通过摘要,不许只说"走查了一遍看起来正常"。

## 4. 危险区提醒(改这些文件,先跑指定 spec 再谈其他门)

改动以下任一文件(或其直接调用链上的逻辑)—— `ai.service.ts` 流式部分 / `concurrency-limiter.ts` / `diagnoses.service.ts` 管线超时——线上出过两次事故,顺序如下:

```
cd packages/api && npx jest ai-stream-watchdog.spec.ts concurrency-limiter.spec.ts
```

先过这两个 spec,再走六门 + Playwright。不变量提醒(改错了这两条最容易踩):槽位只在 `finally` 释放;reset 必须 reject 排队中的 waiter;看门狗的 idle 重置点是 `reader.read()` 返回(含 reasoning 帧),不是 yield 点。

## 5. 合并判据(引用,不重复定义)

完整的"通过判据"与"合并规程"以 `docs/refactor2/02-execution-playbook.md` 为准,本技能不重复维护第二份——出现分歧时以该文档 + 本技能第 1-2 节为准,本技能只是"先跑脚本、别漏 Playwright"的操作入口。
