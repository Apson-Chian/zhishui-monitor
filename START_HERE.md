# 智水监测 5.16.0

## 本机完整预览

需要 Python 3.11 或更高版本。在本目录运行：

```sh
python3 backend/server.py --preview --data-dir ./.demo-data
```

打开 http://127.0.0.1:5188/ 。查看 AI 识别并点击「运行离线样例」后保存报告。状态显示「已保存到记录库」时，可在同一浏览器刷新回查。预警、污染事件和水文实验也写入记录库。教学计算和例图可断网运行。云端识别需要服务端配置 `VISION_API_KEY`，默认 `VISION_API_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions`、`VISION_MODEL=glm-4.1v-thinking-flash`，使用 Bearer 认证。推理包装会在服务端移除，只返回校验后的观察结果；GLM-4.6V-Flash 作为显式配置使用时会关闭思考。本地复制 `.env.example` 为 `.env.local` 并填入服务端密钥，权限设为 `0600`；可通过 `VISION_ENV_FILE` 指向其他环境文件，进程环境优先。生产继续由 `/etc/zhishui/vision.env` 提供配置。密钥不得放在 `dist/` 下，源码包不携带实际凭据。

可选 `VISION_FALLBACK_API_URL`、`VISION_FALLBACK_API_KEY`、`VISION_FALLBACK_MODEL` 配置备用模型，推荐 `glm-4v-flash`，使用 Bearer 认证。主接口繁忙、访问凭据失效、连接超时、截断或格式错误时尝试备用模型，备用结果仍执行水域和结构校验；已确认非水域的结果不会被另一个模型覆盖。故障接口短时冷却 60 秒，主备请求共享 30 秒预算，单次连接上限分别为 12/16 秒。失败请求退还本次体验次数，不影响其他用户计数。备用凭据只写入私有服务端配置。

健康接口保留 `ready` 表示是否已配置可用路由，并增加 `status`（unverified / ready / degraded / unavailable）和 `last_success_at`，避免把“已填写密钥”当作真实推理成功。本次修复与实测见 [2026-11-12 AI 验收](docs/AI_REPAIR_2026-11-12.md)。

业务数据库 `.demo-data/teaching.sqlite3` 首次访问记录接口时按 `backend/schema.sql` 初始化。网关额度另存 `usage.sqlite3`。前者以随机会话摘要隔离记录。保留浏览器的会话 Cookie 即可从记录库回读。同一站点的其他浏览器会话拥有独立空间。

只运行网页时，执行 `python3 -m http.server 5188 --bind 127.0.0.1 --directory dist`。教学记录此时保存在当前浏览器。

## 回归验证

```sh
npm run check
(cd backend && python3 -m unittest -v)
```

## 服务器部署

先将 `backend/server.py`、`backend/records.py` 和 `backend/schema.sql` 放在同一个安装目录，用 `deploy/install-ai.py` 更新网关。保留既有的私有视觉凭据与 systemd 的状态目录。验证网关后，再用 `scripts/package-server.py` 生成静态包和 SHA-256，使用 `deploy/install-server.py --site zhishui-glass` 发布，配置片段选用 `deploy/zhishui-glass-location.conf`。

上线后分别检查 `/zhishui-glass/api/vision/health` 和 `/zhishui-glass/api/records`，在网页保存一份教学样例并刷新回查。新记录库独立于网关额度库。回滚前端或代理配置时保留状态目录中的数据库。
