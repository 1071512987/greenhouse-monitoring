package domain

import "time"

type Observation struct {
	Timestamp   time.Time `json:"timestamp"`
	Temperature float64   `json:"temperature"`
	Humidity    float64   `json:"humidity"`
	Soil        float64   `json:"soilMoisture"`
	Light       float64   `json:"light"`
}

type Sensor struct {
	ID           string         `json:"id"`
	Name         string         `json:"name"`
	Category     string         `json:"category"`
	Type         string         `json:"type"`
	Model        string         `json:"model"`
	Manufacturer string         `json:"manufacturer"`
	Zone         string         `json:"zone"`
	Connection   string         `json:"connection"`
	Value        float64        `json:"value"`
	Unit         string         `json:"unit"`
	Metrics      []SensorMetric `json:"metrics"`
	Status       string         `json:"status"`
	Battery      int            `json:"battery"`
	LastSeen     string         `json:"lastSeen"`
}

type SensorMetric struct {
	Label string      `json:"label"`
	Value interface{} `json:"value"`
	Unit  string      `json:"unit"`
}

type Zone struct {
	Name        string  `json:"name"`
	Temperature float64 `json:"temperature"`
	Humidity    float64 `json:"humidity"`
	Health      int     `json:"health"`
}

type Alert struct {
	ID       string `json:"id"`
	Severity string `json:"severity"`
	Title    string `json:"title"`
	Detail   string `json:"detail"`
	Time     string `json:"time"`
}

type Dashboard struct {
	Latest     Observation   `json:"latest"`
	History    []Observation `json:"history"`
	Zones      []Zone        `json:"zones"`
	Alerts     []Alert       `json:"alerts"`
	Online     int           `json:"online"`
	Total      int           `json:"total"`
	UpdatedAt  time.Time     `json:"updatedAt"`
	Efficiency float64       `json:"efficiency"`
}

type AgentRunRequest struct {
	SourceName   string        `json:"sourceName"`
	Observations []Observation `json:"observations"`
}

type AgentAction struct {
	Device   string `json:"device"`
	Command  string `json:"command"`
	Reason   string `json:"reason"`
	Priority string `json:"priority"`
}

type TraceStep struct {
	Label   string `json:"label"`
	Detail  string `json:"detail"`
	Outcome string `json:"outcome"`
}

type AgentRun struct {
	ID          string        `json:"id"`
	SourceName  string        `json:"sourceName"`
	Status      string        `json:"status"`
	Summary     string        `json:"summary"`
	Confidence  float64       `json:"confidence"`
	Actions     []AgentAction `json:"actions"`
	Trace       []TraceStep   `json:"trace"`
	Records     int           `json:"records"`
	CreatedAt   time.Time     `json:"createdAt"`
	CompletedAt time.Time     `json:"completedAt"`
}
