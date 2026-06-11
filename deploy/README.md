# Coach 生产部署手册(单机 4C4G)

本手册覆盖 Coach(校招求职 AI SaaS)在单台 4C4G 服务器上的容器化部署:
PostgreSQL 16 + API(NestJS)+ Web(Next.js)+ Caddy(反代 / 自动 HTTPS)。

所有命令在**仓库根目录**执行(即包含 `docker-compose.prod.yml` 的目录)。

---

## 0. 前置条件

- 一台 4C4G 服务器(Linux,建议 Ubuntu 22.04+),已装 Docker 24+ 与 Docker Compose v2。
- 一个解析到本机公网 IP 的域名(用于自动 HTTPS;无域名可用 IP + 纯 HTTP,仅限内网/调试)。
- AI 主通道密钥(CloudDreamAI),建议同时备好 DeepSeek 备用通道密钥。
- 一个可用的 SMTP 账号(用于发送登录验证码,**production 必填,否则 API 启动即失败**)。

检查环境:

```bash
docker --version
docker compose version
```

---

## 1. 首次部署

### 1.1 准备环境变量

```bash
cp .env.production.example .env.production
# 编辑 .env.production,逐项填写(见文件内中文注释)
```

**必填项检查清单**(缺任一项 API 启动会报错):

- `JWT_SECRET` —— 长随机串,生成:`openssl rand -hex 32`
- `DB_USER` / `DB_PASS` / `DB_NAME` —— 数据库账号(postgres 容器建库 + API 连库共用)
- `AI_PRIMARY_API_KEY` —— AI 主通道密钥
- `SMTP_HOST`(及 `SMTP_PORT/USER/PASS/FROM`)—— 验证码邮件
- `CORS_ORIGINS` —— 前端来源白名单(同源部署填站点域名,如 `https://coach.example.com`)
- `DOMAIN` —— 站点域名(留空则 Caddy 走 :80 纯 HTTP)

> ⚠️ 安全:`.env.production` 含明文密钥。确认它已被 git 忽略(见下方"安全提醒"),
> 切勿提交到仓库。

### 1.2 构建并启动

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

首次会拉取 postgres/caddy 镜像并构建 api/web 两镜像(含 native 依赖编译,约数分钟)。

### 1.3 初始化数据库

生产走 PostgreSQL,**不依赖 synchronize 自动建表**(production 已关闭),首次需跑 migration:

```bash
# 在 api 容器内执行数据库 migration(用编译产物 + node,runner 镜像无 pnpm/ts-node)
docker compose -f docker-compose.prod.yml exec api node_modules/.bin/typeorm -d dist/database/data-source.js migration:run
# 灌入市场薪资/面经种子数据
docker compose -f docker-compose.prod.yml exec api node dist/seed.js
```

> ⚠️ runner 镜像是精简运行镜像:**没有 pnpm、没有 ts-node、没有 src/**,只有 `dist/` 编译产物与
> 生产依赖。故容器内只能用上面的 `node dist/...` / `node_modules/.bin/typeorm -d dist/...` 命令,
> **不要**用 `pnpm migration:run` / `pnpm seed`(那两个脚本走 ts-node + src,仅用于本机 dev)。
> 对应的 package.json 脚本别名:`migration:run:prod` / `seed:prod`(在仓库根/有 src 的环境用 `pnpm --filter @coach/api migration:run:prod`)。

### 1.4 验证

```bash
# 健康检查(应返回 {"status":"ok","db":"ok",...})
curl -s http://localhost/api/health

# 查看各容器状态(均应 healthy / running)
docker compose -f docker-compose.prod.yml ps
```

浏览器访问 `https://你的域名`(或 `http://服务器IP`)应能打开登录页。

---

## 2. 升级(发布新版本)

```bash
# 1. 拉取最新代码
git pull

# 2. 重建并滚动重启(postgres 卷数据不受影响)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# 3. 若本次有新的 DB 结构变更,补跑 migration(runner 镜像用 dist + node,无 pnpm/ts-node)
docker compose -f docker-compose.prod.yml exec api node_modules/.bin/typeorm -d dist/database/data-source.js migration:run

# 4. 验证健康
curl -s http://localhost/api/health
```

建议在 `.env.production` 的 `APP_VERSION` 填入本次 git short sha,
之后可通过 `/api/health` 的 `version` 字段确认线上跑的是哪个版本。

### 2.1 迁移命名约定(后续 schema 变更必读)

后续任何数据库结构变更,**一律手写迁移文件**,沿用初始迁移的命名与组织方式:

- 文件名:`<毫秒时间戳>-<PascalCase 描述>.ts`(如 `1781186894991-InitialSchema.ts`);
  类名同名 `<描述><时间戳>`,`name` 字段与文件名时间戳一致(TypeORM 据此记录已跑迁移)。
- 放在 `packages/api/src/database/migrations/`,按时间戳升序执行。
- **不要无脑信 `migration:generate` 的伪 diff**:本机无 Postgres 实例,`migration:generate` 拿不到
  线上真实 schema,生成的 diff 不可靠(可能漏列/误判类型/错配 FK)。务必参照实体逐表手写 DDL,
  类型映射依据初始迁移头注的 PostgresDriver 映射表(`up`/`down` 成对,`down` 逆序回滚)。
- 双端列类型(如可空时间列)用 `src/database/column-types.ts` 的 `TIMESTAMP_COLUMN_TYPE`,
  迁移里固定写 PostgreSQL 落地类型(`timestamp`),与实体在 postgres 端的映射保持一致。
- 改完跑 `pnpm --filter @coach/api test -- migration-smoke` 冒烟(校验建表/回滚/FK 列类型),再上线。

---

## 3. 数据备份与恢复

数据只存在于 PostgreSQL(`postgres_data` 卷)。备份 = 导出该库。

备份脚本 `packages/api/scripts/backup.sh` 已封装本节方案(按 `DB_TYPE` 自动选分支 + 保留最近 14 份),
生产直接 `bash packages/api/scripts/backup.sh` 即可;下面是其等价的手工命令,便于排查。

### 3.1 备份

```bash
# 进 postgres 容器跑 pg_dump 自定义格式(-Fc:压缩 + 可 pg_restore 选择性恢复),流式回宿主文件。
# compose 不向宿主发布 5432 端口,宿主直连必失败,故统一走容器内 pg_dump。
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$DB_USER" -Fc --no-owner --no-acl "$DB_NAME" \
  > coach-pg-$(date +%Y%m%d-%H%M%S).dump
```

> `$DB_USER` / `$DB_NAME` 需与 `.env.production` 一致(可先 `set -a; . ./.env.production; set +a`)。

建议用 cron 每日定时备份并把 `.dump` 文件同步到异地存储(脚本默认输出到 `packages/api/backups/`)。

### 3.2 恢复

```bash
# 将自定义格式 dump 导回(目标库须已存在;全新机器先 up -d 起 postgres)。
# --clean 先 DROP 同名对象、--if-exists 防不存在报错;恢复后无需再跑 migration(dump 已含 schema + 数据)。
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner \
  < coach-pg-YYYYMMDD-HHMMSS.dump
```

---

## 4. 回滚

### 4.1 回滚代码 + 镜像

```bash
# 回到上一个稳定 commit / tag
git checkout <上一个稳定的 tag 或 commit>

# 重建并重启
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### 4.2 回滚数据库(谨慎)

若新版本 migration 破坏了数据,先停应用,再从 3.2 恢复最近一次备份:

```bash
docker compose -f docker-compose.prod.yml stop api web
# 按 3.2 恢复数据库备份
docker compose -f docker-compose.prod.yml start api web
```

> 数据库回滚无法"撤销"已写入的用户数据,务必以"恢复最近备份"为准,
> 因此**每次升级前先做一次备份**(第 3 节)。

---

## 5. 常用运维命令

```bash
# 查看日志(跟随)
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f caddy

# 重启单个服务
docker compose -f docker-compose.prod.yml restart api

# 进入 api 容器排查
docker compose -f docker-compose.prod.yml exec api sh

# 停止全部(保留数据卷)
docker compose -f docker-compose.prod.yml down

# 停止并清空数据卷(⚠️ 删库,慎用)
docker compose -f docker-compose.prod.yml down -v
```

---

## 6. 架构与端口

| 组件     | 容器内端口 | 对外暴露         | 说明                                   |
|----------|-----------|-----------------|----------------------------------------|
| caddy    | 80 / 443  | 80 / 443        | 唯一对公网开放;反代 `/api`→api、其余→web |
| web      | 3000      | 不直接暴露       | Next.js standalone                     |
| api      | 3002      | 不直接暴露       | NestJS,全局前缀 `/api`                 |
| postgres | 5432      | 不直接暴露       | 仅容器内网可达                          |

反代规则(`deploy/Caddyfile`):

- `/api/*` → `api:3002`(保留前缀,后端 `setGlobalPrefix('api')` 需要)
- 其余 → `web:3000`

资源限制(`docker-compose.prod.yml`,总和约 3.5G,为 4C4G 留余量):
postgres 1C/1G,api 2C/1.5G,web 1C/0.8G,caddy 0.5C/0.25G。

---

## 7. 安全提醒

- **`.env.production` 必须被 git 忽略**。`.gitignore` 已显式追加 `.env.production` /
  `*.env.production` 规则(`*.env` 不匹配它,因其不以 `.env` 结尾,故单列)。部署前可复核:

  ```bash
  git check-ignore .env.production   # 应输出 .gitignore 行号;无输出 = 未被忽略,需修
  ```

  备份产物(`packages/api/backups/`、`*.dump`、`*.db.gz`)也已在 `.gitignore` 忽略,避免数据库快照误入库。

- 仅 caddy 对公网开放 80/443;api/web/postgres 均不映射宿主端口,只走容器内网。
- `DEV_LOGIN` 在生产必须为 `0`(免验证码登录后门),`.env.production.example` 已默认 0。
- 定期轮换 `JWT_SECRET` 与各密钥;轮换 `JWT_SECRET` 会使所有已签发 token 失效(用户需重登)。
```
