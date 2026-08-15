# 华农·智控温室监控系统

面向设施栽培场景的全栈温室监控平台，用于接入实际传感器 API、集中查看环境状态和设备在线情况，并为后续自主推理决策 Agent 提供数据导入与执行框架。

## 功能概览

- 单屏 Dashboard：环境指标、24 小时趋势、分区状态、系统健康度和异常提醒
- 传感器中心：按设备类别浏览，支持查看全部设备汇总和在线状态
- Agent 工作台：导入 JSON/CSV 温室观测数据，展示推理过程、建议动作和运行历史
- 全栈服务：React 前端通过 `/api` 访问 Go HTTP API，生产环境可由 Go 服务直接托管前端静态文件
- 品牌化界面：使用华中农业大学与华农智能体视觉资源，主题色为 `#09803a`

## 已覆盖设备

| 类别 | 型号/设备 |
| --- | --- |
| 空气环境 | 空气温湿度传感器 PH-WSD-2G、二氧化碳传感器 PH-CO2-2H、光照传感器 PH-GZ-1A |
| 作物冠层 | 叶面积温湿度传感器 PH-YMX-2K / SL-PH-YWS |
| 土壤环境 | 土壤温湿度、盐分、电导率传感器 PH-TRWS-3C |
| 气象监测 | 多功能气象站 PH-QX7 / QX1202G |
| 采集与控制 | 数据采集终端 PH-CJ-01、曙光网络 Sugon RI V1.0 控制器、GWB-6030H 工控机 |

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
| GET | `/api/agent/runs` | Agent 运行历史 |
| POST | `/api/agent/runs` | 导入观测记录并执行推理 |

## 接入真实数据与 Agent

目前后端提供可运行的内存数据与确定性规则引擎。接入真实项目时：

1. 在 `backend/internal/store` 中替换或扩展数据源，实现传感器 API、数据库或消息队列接入。
2. 实现 `backend/internal/agent` 中的 Agent 引擎边界，替换当前规则策略。
3. 保持现有 HTTP 请求与响应结构，即可继续复用前端页面和执行轨迹展示。

请勿将设备密钥、API Token 或生产环境配置提交到仓库；本地敏感配置应放在 `.env` 文件中。
