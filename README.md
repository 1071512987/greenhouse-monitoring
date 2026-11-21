# 华农·智控温室监控系统

面向设施栽培场景的全栈温室监控平台，用于接入实际传感器 API、集中查看环境状态和设备在线情况，并为后续自主推理决策 Agent 提供数据导入与执行框架。

## 功能概览

- 单屏 Dashboard：环境指标、24 小时趋势、分区状态、系统健康度和异常提醒
- 传感器中心：按厂商（新普惠 HTTP / 华创科技 MQTT）分级浏览设备，支持查看实时读数和分页历史曲线
- 智能体中心：按业务拆分六类专职智能体，分别提供环境调控、精准施肥、机器狗巡检、RGBD 表型鉴定、作物模型和农机问答工作区
- 全栈服务：React 前端通过 `/api` 访问 Go HTTP API，生产环境可由 Go 服务直接托管前端静态文件
- 品牌化界面：使用华中农业大学与华农智能体视觉资源，主题色为 `#09803a`

## 已接入设备（南宁温室）

传感器页按两家厂商分开展示，两路是独立硬件，数值不合并：

| 厂商 | 接入方式 | 传感器 |
| --- | --- | --- |
| 新普惠 | 云平台 HTTP | 空气温湿度（温度/湿度各两套）、二氧化碳、光照、叶面温湿度、土壤综合、室外气象站 |
| 华创科技 | 控制器 MQTT | 室外气象站、多要素传感器×2、电子式温湿度计（CO₂）×2 |

## 技术栈

- 前端：React 19、TypeScript、Vite、Recharts、Lucide React
- 后端：Go 1.25 标准库 HTTP 服务
- 测试：Vitest、Go testing

## 项目结构

```text
greenhouseMonitoring/
├─ frontend/                 # React 前端
│  ├─ src/components/       # 布局与通用组件
│  ├─ src/pages/            # Dashboard、传感器、Agent 页面
│  └─ src/lib/              # API 与数据导入逻辑
├─ backend/                  # Go 后端
│  ├─ cmd/server/           # 服务入口
│  └─ internal/             # API、领域模型、存储和 Agent 引擎
└─ docs/                     # 设计与实施记录
```

## 本地开发

准备 Node.js 20+、npm 10+ 和 Go 1.25+，然后分别启动后端和前端。

终端 1：

```powershell
cd backend
go run ./cmd/server
```

终端 2：

```powershell
cd frontend
npm install
npm run dev
```

浏览器访问 <http://127.0.0.1:5173/>。Vite 会将 `/api` 请求代理到 `http://127.0.0.1:8080`。

## 生产构建与启动

```powershell
cd frontend
npm install
npm run build

cd ..\backend
go run ./cmd/server -frontend ..\frontend\dist
```

浏览器访问 <http://127.0.0.1:8080/>，此时 Go 服务同时提供 API 和前端静态资源。

## 制作免安装发布包

在项目根目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-release.ps1
```

脚本会生成 `release/HuanongZhikong-Windows-x64.zip`。接收方无需安装 Node.js 或 Go，完整解压后双击 `start.bat` 即可运行。

## 测试与检查

```powershell
cd backend
go test ./...

cd ..\frontend
npm test -- --run
npm run typecheck
npm run build
```

## API

| 方法 | 地址 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 服务健康状态 |
| GET | `/api/dashboard` | 环境历史、分区、告警和系统健康度 |
| GET | `/api/sensors` | 传感器与控制设备目录 |
| GET | `/api/sensors/{id}/measurements` | 某台设备的分页历史测量值（`page`/`pageSize`/`metric`） |
| GET | `/api/agent/runs` | Agent 运行历史 |
| POST | `/api/agent/runs` | 导入观测记录并执行推理 |

## 智能问答代理

首页「智能问答」通过 Go 后端同源代理到设施蔬菜问答服务（SSE 流式）：

- `/api/assistant/*` → `ASSISTANT_API_URL`（默认 `http://211.69.141.64:8089/api/v1`）
- 需要鉴权时设置 `ASSISTANT_API_KEY`，代理会自动注入 `X-API-Key` 请求头

## 南宁温室数据接入

后端内置两个采集器，都只读、不下发控制指令：

- 新普惠 HTTP：启动时回补最近 24 小时历史，之后每 60 秒轮询一次实时接口；
- 华创科技 MQTT：长连接订阅控制器上报，并周期性发 `getStatusTopic` 只读请求刷新；
- 两路数据分别落在 SQLite 的两张表（`measurements` / `mqtt_measurements`），重复的「设备 + 指标 + 时间」自动去重；
- 传感器页点击任意设备即可查看实时读数和分页历史曲线。

可用环境变量（都有内置默认值，开箱即用）：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `GREENHOUSE_DB` | `greenhouse.db` | SQLite 文件路径 |
| `NANNING_PLATFORM_BASE` | `http://115.28.187.9:8005` | 厂商平台接口地址 |
| `NANNING_PLATFORM_USER` | `038085047` | 平台账号 |
| `NANNING_PLATFORM_PASS` | `123456` | 平台密码 |
| `NANNING_COLLECT_INTERVAL` | `120` | 实时采集间隔（秒） |
| `NANNING_BACKFILL` | `86400` | 启动时回补历史时长（秒） |
| `NANNING_MQTT_BROKER` | `39.107.83.23:1883` | 控制器 MQTT 服务器 |
| `NANNING_MQTT_USER` | `ZNHKWS1` | MQTT 账号 |
| `NANNING_MQTT_PASS` | `123456` | MQTT 密码 |
| `NANNING_MQTT_TERMINAL` | `19251201894` | 控制器终端编号 |
| `NANNING_MQTT_INTERVAL` | `120` | MQTT 读取请求间隔（秒） |

## 接入真实数据与 Agent

当前环境控制智能体已连接后端的内存数据与确定性规则引擎；另外五类智能体已完成前端任务流和模型接口占位。接入真实项目时：

1. 在 `backend/internal/store` 中替换或扩展数据源，实现传感器 API、数据库或消息队列接入。
2. 实现 `backend/internal/agent` 中的 Agent 引擎边界，替换当前规则策略。
3. 保持现有 HTTP 请求与响应结构，即可继续复用前端页面和执行轨迹展示。

请勿将设备密钥、API Token 或生产环境配置提交到仓库；本地敏感配置应放在 `.env` 文件中。
