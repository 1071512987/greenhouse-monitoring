package store

import (
	"math"
	"sync"
	"time"

	"greenhouse-monitoring/internal/domain"
)

type Store struct {
	mu      sync.RWMutex
	history []domain.Observation
	sensors []domain.Sensor
	runs    []domain.AgentRun
}

func New() *Store {
	now := time.Now().Truncate(time.Minute)
	history := make([]domain.Observation, 0, 25)
	for i := 24; i >= 0; i-- {
		t := now.Add(-time.Duration(i) * time.Hour)
		hour := float64(t.Hour())
		daylight := math.Max(0, math.Sin((hour-6)/12*math.Pi))
		history = append(history, domain.Observation{
			Timestamp: t, Temperature: round(20.8 + daylight*7.1 + math.Sin(float64(i))*0.35),
			Humidity: round(71 - daylight*15 + math.Cos(float64(i))*1.2),
			Soil:     round(46.5 - float64(24-i)*0.16), Light: math.Round(daylight * 920),
		})
	}
	sensors := []domain.Sensor{
		{ID: "AIR-A01", Name: "空气温湿度传感器", Category: "air", Type: "temperatureHumidity", Model: "PH-WSD-2G", Manufacturer: "PH 农业物联网", Zone: "A区 · 育苗", Connection: "RS485", Value: 26.4, Unit: "°C", Metrics: []domain.SensorMetric{{Label: "空气温度", Value: 26.4, Unit: "°C"}, {Label: "相对湿度", Value: 68, Unit: "% RH"}}, Status: "online", Battery: 92, LastSeen: "刚刚"},
		{ID: "CO2-B01", Name: "二氧化碳传感器", Category: "co2", Type: "co2", Model: "PH-CO2-2H", Manufacturer: "PH 农业物联网", Zone: "B区 · 番茄", Connection: "RS485", Value: 812, Unit: "ppm", Metrics: []domain.SensorMetric{{Label: "CO₂ 浓度", Value: 812, Unit: "ppm"}}, Status: "online", Battery: 100, LastSeen: "8秒前"},
		{ID: "LIGHT-C01", Name: "光照传感器", Category: "light", Type: "light", Model: "PH-GZ-1A", Manufacturer: "PH 农业物联网", Zone: "C区 · 叶菜", Connection: "RS485", Value: 768, Unit: "lx", Metrics: []domain.SensorMetric{{Label: "光照强度", Value: 768, Unit: "lx"}}, Status: "online", Battery: 86, LastSeen: "12秒前"},
		{ID: "LEAF-B01", Name: "叶面积温湿度传感器", Category: "leaf", Type: "leafTemperatureHumidity", Model: "PH-YMX-2K", Manufacturer: "PH 农业物联网", Zone: "B区 · 番茄", Connection: "LoRa", Value: 25.9, Unit: "°C", Metrics: []domain.SensorMetric{{Label: "叶面温度", Value: 25.9, Unit: "°C"}, {Label: "叶面湿度", Value: 74, Unit: "% RH"}, {Label: "叶面湿润度", Value: 12, Unit: "%"}}, Status: "online", Battery: 78, LastSeen: "18秒前"},
		{ID: "SOIL-A01", Name: "土壤温湿盐电导率传感器", Category: "soil", Type: "soilMulti", Model: "PH-TRWS-3C", Manufacturer: "PH 农业物联网", Zone: "A区 · 根域", Connection: "RS485", Value: 43.2, Unit: "%", Metrics: []domain.SensorMetric{{Label: "土壤温度", Value: 23.8, Unit: "°C"}, {Label: "含水率", Value: 43.2, Unit: "%"}, {Label: "盐分", Value: 1.1, Unit: "g/L"}, {Label: "电导率", Value: 2.3, Unit: "mS/cm"}}, Status: "warning", Battery: 41, LastSeen: "1分钟前"},
		{ID: "WEATHER-01", Name: "多功能气象站", Category: "weather", Type: "weather", Model: "PH-QX7", Manufacturer: "数联天下 / 中国", Zone: "温室外 · 北侧", Connection: "4G", Value: 31.2, Unit: "°C", Metrics: []domain.SensorMetric{{Label: "室外温度", Value: 31.2, Unit: "°C"}, {Label: "空气湿度", Value: 58, Unit: "% RH"}, {Label: "风速", Value: 2.6, Unit: "m/s"}, {Label: "降雨量", Value: 0, Unit: "mm"}, {Label: "气压", Value: 1006, Unit: "hPa"}}, Status: "online", Battery: 100, LastSeen: "25秒前"},
		{ID: "GATEWAY-01", Name: "数据采集终端 / 设备箱", Category: "gateway", Type: "dataCollector", Model: "PH-CJ-01", Manufacturer: "PH 农业物联网", Zone: "设备间 · 主网关", Connection: "4G / 5年流量", Value: -72, Unit: "dBm", Metrics: []domain.SensorMetric{{Label: "4G 信号", Value: -72, Unit: "dBm"}, {Label: "剩余流量", Value: 41.6, Unit: "GB"}, {Label: "采集周期", Value: 60, Unit: "s"}}, Status: "online", Battery: 100, LastSeen: "刚刚"},
		{ID: "CTRL-01", Name: "设施栽培技术设备控制器", Category: "controller", Type: "controller", Model: "Sugon RI V1.0", Manufacturer: "曙光网络", Zone: "中控室 · 主控制柜", Connection: "千兆以太网", Value: 18, Unit: "%", Metrics: []domain.SensorMetric{{Label: "CPU 负载", Value: 18, Unit: "%"}, {Label: "内存占用", Value: 42, Unit: "%"}, {Label: "控制回路", Value: 12, Unit: "路"}}, Status: "online", Battery: 100, LastSeen: "刚刚"},
		{ID: "IPC-01", Name: "边缘工控机", Category: "controller", Type: "industrialComputer", Model: "GWB-6030H", Manufacturer: "GWB", Zone: "中控室 · 机柜 01", Connection: "千兆以太网", Value: 23, Unit: "%", Metrics: []domain.SensorMetric{{Label: "CPU 负载", Value: 23, Unit: "%"}, {Label: "磁盘占用", Value: 36, Unit: "%"}, {Label: "运行温度", Value: 44, Unit: "°C"}}, Status: "online", Battery: 100, LastSeen: "4秒前"},
	}
	return &Store{history: history, sensors: sensors, runs: []domain.AgentRun{}}
}

func round(value float64) float64 { return math.Round(value*10) / 10 }

func (s *Store) Dashboard() domain.Dashboard {
	s.mu.RLock()
	defer s.mu.RUnlock()
	history := append([]domain.Observation(nil), s.history...)
	online := 0
	for _, sensor := range s.sensors {
		if sensor.Status != "offline" {
			online++
		}
	}
	return domain.Dashboard{
		Latest: history[len(history)-1], History: history,
		Zones:  []domain.Zone{{Name: "育苗 A区", Temperature: 25.8, Humidity: 68, Health: 96}, {Name: "番茄 B区", Temperature: 27.1, Humidity: 61, Health: 91}, {Name: "叶菜 C区", Temperature: 24.6, Humidity: 72, Health: 84}},
		Alerts: []domain.Alert{{ID: "a1", Severity: "warning", Title: "A区土壤含水率下降", Detail: "根域探针低于 45% 目标线", Time: "3分钟前"}, {ID: "a2", Severity: "critical", Title: "C区探针离线", Detail: "SM-C02 已失联 18 分钟", Time: "18分钟前"}},
		Online: online, Total: len(s.sensors), UpdatedAt: time.Now(), Efficiency: 93.6,
	}
}

func (s *Store) Sensors() []domain.Sensor {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return append([]domain.Sensor(nil), s.sensors...)
}

func (s *Store) SaveRun(run domain.AgentRun) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.runs = append([]domain.AgentRun{run}, s.runs...)
}

func (s *Store) Runs() []domain.AgentRun {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return append([]domain.AgentRun{}, s.runs...)
}
