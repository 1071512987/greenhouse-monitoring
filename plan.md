# 智能问答 Chatbot 实施计划

## 1. 目标

在「智能问答」首页做一个简单聊天机器人：输入问题 → 调用设施蔬菜智能问答 API → 流式展示回答，支持多轮上下文。不做登录 / 用户体系，单浏览器一个会话即可。

## 2. 现状

- 首页 `PortalPage`（home 视图）已有问候语、输入框和示例问题，但提交后只做「任务导航建议」，没有真正调用模型。
- 问答 API 是独立服务（默认端口 8089，base 为 `/api/v1`），文档声明支持同步 `/chat` 和流式 `/chat/stream`，多轮上下文用 `session_id` 标识。
- 本项目 Go 后端（8080）托管前端，并已有一组 `/api/*` 路由。

## 3. 方案概述

前端不直连 8089，而是走现有 Go 后端做同源反向代理：

```text
浏览器 → Go 后端 /api/assistant/* → 问答服务 http://127.0.0.1:8089/api/v1/*
```

好处：没有跨域问题；`X-API-Key` 留在服务端，不暴露给浏览器；生产环境仍是单进程托管前后端。

## 4. SSE 可用性确认（重要，必须先做）

文档写了 `POST /api/v1/chat/stream`（SSE）和事件序列，但这是设计文档，不代表已经真实可用。实测结果：

- 当前 Windows 开发机上 8089 没有监听（连接被拒绝），本地也找不到 `api_server.py`；该服务按文档部署在 Linux（`/home/sunhuabin/code/...`）。
- 文档「已知限制」明确说明 `answer_stream` 目前是「先完整生成、再分段下发」的伪流式，不是 token 级真流式。

因此开工前必须确认两件事：

1. 问答服务实际部署在哪个 host/port，开发时能否从本项目所在机器访问到它。
2. 用 curl 或 SSE 客户端实测 `POST /chat/stream`，确认 `meta / delta / done / error` 事件真的按预期下发。

决策：优先用 SSE；若实测 SSE 不可用或不稳定，回退到同步 `POST /chat`（同样已文档化，前端只显示加载态，实现更简单）。无论选哪种，前端接口封装只留一个入口，便于切换。

## 5. 后端改动（Go）

1. 新增 `backend/internal/httpapi/assistant_proxy.go`：
   - 用 `httputil.ReverseProxy`（或自定义转发 handler）把 `/api/assistant/` 前缀转发到 `ASSISTANT_API_URL`（默认 `http://127.0.0.1:8089/api/v1`）。
   - 设置 `FlushInterval`（约 100ms，或 -1 立即刷新），保证 SSE 逐段下发；透传 `X-Accel-Buffering: no`。
   - 若配置了 `ASSISTANT_API_KEY`，转发时自动加上 `X-API-Key` 请求头。
   - 错误信封（`{code, message, request_id, data}`）与 HTTP 状态码原样透传，前端按 `code` 做提示。
2. 路由注册：在 `server.go` 的 `NewServer` 中加 `mux.Handle("/api/assistant/", assistantProxy)`。
3. 环境变量：
   - `ASSISTANT_API_URL`，默认 `http://127.0.0.1:8089/api/v1`
   - `ASSISTANT_API_KEY`，默认空（不鉴权）
4. 前提：问答服务 `api_server.py` 需单独部署并运行在 8089，本项目只负责代理，不包含该服务。

## 6. 前端改动

1. `src/lib/api.ts` 增加封装：
   - `assistantChatStream(message, sessionId, { onMeta, onDelta, onDone, onError })`：用 `fetch` 请求 `/api/assistant/chat/stream`，按空行切 SSE 帧，解析 `event` / `data`。
   - 可选：`assistantDeleteSession(id)`、`assistantCreateSession()`。
2. `src/pages/PortalPage.tsx` 的 home 视图改造：
   - 保留问候语、输入框、示例问题。
   - 新增消息列表（用户气泡靠右、助手气泡靠左并带品牌图标），发送后立即追加用户消息，助手消息流式追加文本。
   - 多轮上下文：`session_id` 存 `localStorage`（键如 `assistant.session_id`）；首次请求自动创建，收到 `meta` 或响应中的 `session_id` 后回填；命中 `40401` 时清掉本地 session 并提示「会话已过期，已为你开启新对话」，随后无 session 重试一次。
   - 「新建对话」按钮：调 `DELETE /sessions/{id}` 并清 localStorage。
   - 状态处理：生成中显示加载态（可带「正在思考」提示）；错误按 code 映射友好文案（40901 正在回答请稍候、42901 服务繁忙请稍后、50001 生成失败请重试、40101 鉴权未配置等）。
   - 新消息到达自动滚动到底部。
3. 样式：在 `portal.css` 或 `styles.css` 增加少量聊天气泡样式，复用现有绿色主题变量与 portal 卡片视觉，保持 UI 一致。
4. 保持不变：智能体广场入口、品牌头部、页脚。

## 7. 关键决策

- 问答方式：优先 `/chat/stream`（SSE），但开工前必须先实测；若 SSE 不可用则回退同步 `/chat`。无论哪种，伪流式首字都可能较慢，必须给「正在思考」占位。
- 会话用 `localStorage`，不做用户体系；服务端会话存内存，重启即失效，靠 `40401` 兜底自动重建。
- API Key 只放 Go 后端环境变量，不进入前端代码。

## 8. 实施步骤

1. 确认问答服务 host/port 可达，实测 `POST /chat/stream` 的 SSE 事件是否正常；据此锁定用 SSE 还是同步 `/chat`。
2. 实现 Go 反向代理 + 环境变量，curl 联调 `/api/assistant/health`、`/api/assistant/chat`、`/api/assistant/chat/stream`。
3. 实现前端 `api.ts` 封装（流式或同步，按第 1 步结论）。
4. 改造 `PortalPage` 聊天 UI + 会话管理 + 错误处理。
5. 样式打磨，确保与现有首页风格一致。
6. 验证：多轮对话、过期重建、服务未启动时友好报错、并发 409/429 提示。

## 9. 验收标准

- 首页可输入问题并流式看到回答。
- 连续多轮上下文正确（同一 session）。
- 刷新后未过期则上下文保留（localStorage 中的 session）。
- 问答服务未启动或返回错误时，前端有可读提示，不白屏。
- UI 与现有首页风格一致（绿色主题、字体、卡片、间距）。

## 10. 风险与注意

- 生成耗时可能很长（最长约 5 分钟）：前端 fetch 超时设 600s 以上，Go 代理的读写超时不要设太短。
- 伪流式导致首字延迟高：需要明显的思考中状态，避免用户以为卡死。
- 会话在内存中，服务重启丢失：依赖 `40401` 自动重建。
- 全局并发上限 8、会话级锁：`409` / `429` 要友好提示，不要无脑重试。
