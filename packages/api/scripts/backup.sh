#!/usr/bin/env bash
#
# Coach 数据库每日备份脚本 —— 单机 4C4G,按 DB_TYPE 自动选 Postgres / SQLite 分支。
#
# 设计:
#   - Postgres:在 postgres 容器内跑 pg_dump 自定义格式(-Fc),流式导出到宿主文件。
#     生产 compose 不向宿主发布 5432 端口,宿主直连必失败,故统一走
#     `docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -Fc`
#     (与 deploy/README.md §3 备份节同一方案)。压缩 + 支持 pg_restore 选择性恢复。
#   - SQLite(dev):.backup 在线热备(读写并发安全),再 gzip。
#   - 保留最近 14 份,更旧的自动清理。
#
# 用法:
#   # Postgres(生产):在仓库根(含 docker-compose.prod.yml)执行,容器须已起。
#   bash packages/api/scripts/backup.sh
#   # SQLite(dev):同样可在仓库根执行,读本地库文件。
#
# 定时(生产,每天 03:00,写入 crontab):
#   0 3 * * * cd /opt/coach && bash packages/api/scripts/backup.sh >> /var/log/coach-backup.log 2>&1
#
# 环境变量(沿用 packages/api/.env 同名变量;脚本会自动 source 同目录上级的 .env):
#   DB_TYPE   sqlite | postgres
#   DB_PATH   sqlite 库文件路径(DB_TYPE=sqlite)
#   DB_NAME DB_USER DB_PASS   (DB_TYPE=postgres;经 compose exec 进容器,无需 DB_HOST/DB_PORT)
#   COMPOSE_FILE  compose 文件路径(默认 docker-compose.prod.yml,相对当前工作目录)
#   BACKUP_DIR  备份输出目录(默认 ./backups)
#
# ── 恢复说明(RESTORE) ──────────────────────────────────────────────────────
#   Postgres(自定义格式 .dump,经 postgres 容器 pg_restore):
#     # 清库并恢复(--clean 先 DROP 同名对象,--if-exists 防不存在报错);目标库须已存在。
#     docker compose -f docker-compose.prod.yml exec -T postgres \
#       pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner \
#       < backups/coach-pg-YYYYmmdd-HHMMSS.dump
#     # 注:恢复后无需再跑 migration —— dump 已含完整 schema + 数据。
#
#   SQLite(.db.gz):
#     gunzip -c backups/coach-sqlite-YYYYmmdd-HHMMSS.db.gz > restored.db
#     # 停服后用 restored.db 覆盖 DB_PATH 指向的库文件即可。
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# 加载 packages/api/.env(若存在),让脚本独立运行时也能拿到 DB_* 配置。
# 仅对「当前未设置」的变量赋默认值 —— 调用方显式导出的环境变量优先,绝不被 .env 覆盖。
if [ -f "$API_DIR/.env" ]; then
  while IFS= read -r line; do
    case "$line" in
      ''|'#'*) continue ;;  # 跳过空行/注释
    esac
    key="${line%%=*}"
    val="${line#*=}"
    # 去掉 key 两侧空白与可选的 export 前缀
    key="$(printf '%s' "$key" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^export[[:space:]]\{1,\}//')"
    case "$key" in
      DB_TYPE|DB_PATH|DB_NAME|DB_USER|DB_PASS|COMPOSE_FILE|BACKUP_DIR)
        # 仅当调用方未提供时才采用 .env 值(间接展开判空)
        if [ -z "${!key:-}" ]; then
          export "$key=$val"
        fi
        ;;
    esac
  done < "$API_DIR/.env"
fi

DB_TYPE="${DB_TYPE:-sqlite}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_DIR="${BACKUP_DIR:-$API_DIR/backups}"
RETAIN=14
TS="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

if [ "$DB_TYPE" = "postgres" ]; then
  DB_NAME="${DB_NAME:-coach}"
  DB_USER="${DB_USER:-coach}"
  OUT="$BACKUP_DIR/coach-pg-$TS.dump"

  echo "[backup] Postgres $DB_NAME (容器内 pg_dump) -> $OUT"
  # compose 不向宿主发布 5432,宿主直连必失败 → 进 postgres 容器跑 pg_dump,流式回宿主文件。
  # -Fc 自定义格式(压缩 + 可 pg_restore);exec -T 无 TTY,二进制流可安全重定向。
  docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_dump -U "$DB_USER" -Fc --no-owner --no-acl "$DB_NAME" \
    > "$OUT"

  PREFIX="coach-pg-"
  EXT="dump"
else
  DB_PATH="${DB_PATH:-$API_DIR/coach-dev.db}"
  OUT="$BACKUP_DIR/coach-sqlite-$TS.db"

  echo "[backup] SQLite $DB_PATH -> $OUT.gz"
  if [ ! -f "$DB_PATH" ]; then
    echo "[backup] ERROR: SQLite 库文件不存在: $DB_PATH" >&2
    exit 1
  fi
  # 优先用 sqlite3 .backup(在线热备,读写并发下拿一致快照);
  # 无 sqlite3 CLI 时回退 cp(dev 单写场景可接受,生产用 Postgres 分支不受影响)。
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$DB_PATH" ".backup '$OUT'"
  else
    echo "[backup] WARN: 无 sqlite3 CLI,回退 cp 冷拷贝"
    cp "$DB_PATH" "$OUT"
  fi
  gzip -f "$OUT"
  OUT="$OUT.gz"

  PREFIX="coach-sqlite-"
  EXT="db.gz"
fi

echo "[backup] done: $OUT"

# ── 保留最近 RETAIN 份,清理更旧的 ───────────────────────────────────────────
# 按时间倒序列出本类型备份,跳过前 RETAIN 份,删除其余。
mapfile -t OLD < <(ls -1t "$BACKUP_DIR"/${PREFIX}*.${EXT} 2>/dev/null | tail -n +$((RETAIN + 1)))
if [ "${#OLD[@]}" -gt 0 ]; then
  echo "[backup] 清理 ${#OLD[@]} 份过期备份(保留 $RETAIN 份):"
  for f in "${OLD[@]}"; do
    echo "  rm $f"
    rm -f "$f"
  done
fi

echo "[backup] 当前保留:"
ls -1t "$BACKUP_DIR"/${PREFIX}*.${EXT} 2>/dev/null | head -n "$RETAIN" | sed 's/^/  /'
