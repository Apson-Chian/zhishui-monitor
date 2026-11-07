# 智水监测 5.16.0

## 本机完整预览

需要 Python 3.11 或更高版本。在本目录运行：

```sh
python3 backend/server.py --preview --data-dir ./.demo-data
```

打开 http://127.0.0.1:5188/ 。查看 AI 识别并点击「运行离线样例」后保存报告。状态显示「已保存到记录库」时，可在同一浏览器刷新回查。预警、污染事件和水文实验也写入记录库。教学计算和例图可断网运行。云端识别需要服务端配置 `VISION_API_KEY`，可按需设置 `VISION_API_URL` 和 `VISION_MODEL`。源码包不携带实际凭据。

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
