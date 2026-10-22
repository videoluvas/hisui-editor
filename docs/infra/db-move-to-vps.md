# NeonDB → VPS 内 PostgreSQL 移行手順

> 対象: シン VPS（Next.js + PM2）。アプリは Prisma が `DATABASE_URL` を見るだけなので、コード変更は不要。
> `<...>` は環境に合わせて置き換える。パスワードや接続文字列はこのファイルに書かない。

## 0. 事前確認（VPS 上で実行して結果を共有）

```bash
lsb_release -a            # OS とバージョン
nproc; free -h; df -h /   # CPU・メモリ・ディスク
pm2 ls                    # アプリ名の確認
```

Neon 側（Neon コンソールの SQL Editor で実行）:

```sql
SELECT version();                                        -- PostgreSQL のメジャーバージョン
SELECT pg_size_pretty(pg_database_size(current_database())); -- DB サイズ
SELECT extname FROM pg_extension;                         -- 使っている拡張機能
```

## 1. PostgreSQL のインストール（Ubuntu 想定）

Neon と**同じメジャーバージョン**を入れる（例: 16）。`pg_dump` も同じかそれより新しいバージョンが必要。

```bash
sudo apt install -y curl ca-certificates
sudo install -d /usr/share/postgresql-common/pgdg
sudo curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc
. /etc/os-release
echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $VERSION_CODENAME-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list
sudo apt update
sudo apt install -y postgresql-<VER>
```

### 外部から接続させない

`/etc/postgresql/<VER>/main/postgresql.conf`

```
listen_addresses = 'localhost'
```

`/etc/postgresql/<VER>/main/pg_hba.conf` は `host ... 127.0.0.1/32 scram-sha-256` と `::1/128` の行だけにする。

### メモリ設定の目安（VPS のメモリに合わせて調整）

| 項目 | 2GB | 4GB |
|---|---|---|
| `shared_buffers` | 256MB | 512MB |
| `effective_cache_size` | 768MB | 1536MB |
| `work_mem` | 4MB | 8MB |
| `max_connections` | 50 | 50 |

```bash
sudo systemctl restart postgresql
```

## 2. ユーザーと DB の作成

```bash
sudo -u postgres psql
```

```sql
CREATE ROLE hisui WITH LOGIN PASSWORD '<強いパスワード>';
CREATE DATABASE hisui OWNER hisui;
\q
```

## 3. リハーサル（アプリは動かしたまま）

Neon の接続文字列は **pooler なしのホスト**（ホスト名から `-pooler` を外したもの）を使う。

```bash
export NEON_URL='postgresql://<user>:<pass>@<ep-xxx>.<region>.aws.neon.tech/<db>?sslmode=require'
export LOCAL_URL='postgresql://hisui:<pass>@localhost:5432/hisui'

pg_dump "$NEON_URL" -Fc --no-owner --no-acl -f /tmp/neon_rehearsal.dump
pg_restore -d "$LOCAL_URL" --no-owner --no-acl /tmp/neon_rehearsal.dump
```

件数の比較（主要テーブル）:

```bash
for t in users workspaces projects storyboard_main storyboard_scene files _prisma_migrations; do
  a=$(psql "$NEON_URL"  -Atc "SELECT count(*) FROM \"$t\"")
  b=$(psql "$LOCAL_URL" -Atc "SELECT count(*) FROM \"$t\"")
  echo "$t neon=$a local=$b"
done
```

問題なければリハーサル DB を作り直しておく:

```bash
sudo -u postgres psql -c 'DROP DATABASE hisui;' -c 'CREATE DATABASE hisui OWNER hisui;'
```

## 4. 本番切り替え（停止 数分〜十数分）

```bash
pm2 stop <アプリ名>

pg_dump "$NEON_URL" -Fc --no-owner --no-acl -f /tmp/neon_final.dump
pg_restore -d "$LOCAL_URL" --no-owner --no-acl /tmp/neon_final.dump
# 3. の件数比較をもう一度実行

# .env の DATABASE_URL を書き換え（元の値は控えておく）
#   DATABASE_URL=postgresql://hisui:<pass>@localhost:5432/hisui

npx prisma migrate deploy   # 未適用のマイグレーション（ワークスペースの tool_type など）を適用
pm2 restart <アプリ名> --update-env
pm2 logs <アプリ名> --lines 50
```

確認: ログイン、ワークスペース一覧、プロジェクトを開く、保存、クレジット表示。

## 5. 戻し方

`.env` の `DATABASE_URL` を Neon の値に戻して `pm2 restart <アプリ名> --update-env`。
Neon は **1〜2 週間は削除しない**。

## 6. バックアップ（毎日 R2 へ）

`/opt/hisui-backup/backup.sh`

```bash
#!/bin/bash
set -euo pipefail
source /opt/hisui-backup/backup.env   # LOCAL_URL, R2_ENDPOINT, R2_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
TS=$(date +%Y%m%d-%H%M)
FILE=/tmp/hisui-$TS.dump
pg_dump "$LOCAL_URL" -Fc --no-owner --no-acl -f "$FILE"
aws s3 cp "$FILE" "s3://$R2_BUCKET/db-backup/hisui-$TS.dump" --endpoint-url "$R2_ENDPOINT"
rm -f "$FILE"
```

```bash
chmod 700 /opt/hisui-backup/backup.sh
chmod 600 /opt/hisui-backup/backup.env
crontab -e
# 毎日 4:00
0 4 * * * /opt/hisui-backup/backup.sh >> /var/log/hisui-backup.log 2>&1
```

- R2 のライフサイクルルールで `db-backup/` を 14 日で削除する。
- 復元テスト: 月 1 回、バックアップを別 DB に `pg_restore` して件数を確認する。

## 7. ローカル開発

移行後、VPS の DB には外から接続できない。開発用 DB は次のどちらか:

- 手元に PostgreSQL（Docker など）を立て、`prisma migrate deploy` で作る
- Neon の無料枠を開発用として残す
