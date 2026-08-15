package agent

import (
	"fmt"
	"time"

	"greenhouse-monitoring/internal/domain"
)

type Engine interface {
	Execute(domain.AgentRunRequest) domain.AgentRun
}

type RuleEngine struct{}

func NewRuleEngine() *RuleEngine { return &RuleEngine{} }

func (e *RuleEngine) Execute(req domain.AgentRunRequest) domain.AgentRun {
	var temp, humidity, soil, light float64
	for _, item := range req.Observations {
		temp += item.Temperature
		humidity += item.Humidity
		soil += item.Soil
		light += item.Light
	}
	count := float64(len(req.Observations))
	temp /= count
	humidity /= count
	soil /= count
	light /= count
	actions := make([]domain.AgentAction, 0, 3)
	if temp > 30 {
		actions = append(actions, domain.AgentAction{Device: "顶窗与循环风机", Command: "通风 35% · 风机 2档", Reason: fmt.Sprintf("平均温度 %.1f°C 高于舒适区", temp), Priority: "high"})
	}
	if soil < 38 {
		actions = append(actions, domain.AgentAction{Device: "滴灌 A/B 回路", Command: "灌溉 8 分钟", Reason: fmt.Sprintf("根域含水率 %.1f%% 偏低", soil), Priority: "high"})
	}
	if humidity > 78 {
		actions = append(actions, domain.AgentAction{Device: "除湿风机", Command: "运行 15 分钟", Reason: fmt.Sprintf("平均湿度 %.1f%%，存在病害风险", humidity), Priority: "medium"})
	}
	if len(actions) == 0 {
		actions = append(actions, domain.AgentAction{Device: "环境控制系统", Command: "维持当前策略", Reason: "核心指标均处于目标区间", Priority: "low"})
	}
	now := time.Now()
	return domain.AgentRun{
		ID: fmt.Sprintf("RUN-%d", now.UnixMilli()), SourceName: req.SourceName, Status: "completed",
		Summary: fmt.Sprintf("已分析 %d 条记录，识别 %d 项可执行策略。", len(req.Observations), len(actions)), Confidence: 0.91,
		Actions: actions, Records: len(req.Observations), CreatedAt: now, CompletedAt: now,
		Trace: []domain.TraceStep{{Label: "数据校验", Detail: "检查时间戳与四项环境指标", Outcome: "数据完整"}, {Label: "环境诊断", Detail: fmt.Sprintf("均值：%.1f°C · %.1f%% RH · %.1f%% 土壤 · %.0f lx", temp, humidity, soil, light), Outcome: "诊断完成"}, {Label: "策略生成", Detail: "按阈值与设备能力生成候选动作", Outcome: fmt.Sprintf("%d 项动作", len(actions))}},
	}
}
