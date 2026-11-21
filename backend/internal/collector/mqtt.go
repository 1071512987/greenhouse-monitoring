package collector

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"

	"greenhouse-monitoring/internal/catalog"
	"greenhouse-monitoring/internal/domain"
	"greenhouse-monitoring/internal/store"
)

// MQTTPoller 直连华创科技 HO-SMART-A32 控制器，订阅传感器上报并写入 SQLite。
type MQTTPoller struct {
	broker    string
	username  string
	password  string
	terminal  string
	udid      string
	store     *store.Store
	interval  time.Duration
	mu        sync.Mutex
	lastWrite time.Time
}

func NewMQTTPoller(broker, username, password, terminal string, st *store.Store, interval time.Duration) *MQTTPoller {
	return &MQTTPoller{
		broker:   broker,
		username: username,
		password: password,
		terminal: terminal,
		udid:     "19",
		store:    st,
		interval: interval,
	}
}

type mqttSensorItem struct {
	AD int          `json:"AD"`
	DV []mqttDVItem `json:"DV"`
}

type mqttDVItem struct {
	T int    `json:"T"`
	V string `json:"V"`
}

func (p *MQTTPoller) Run(ctx context.Context) {
	var client mqtt.Client
	for {
		opts := p.clientOptions()
		client = mqtt.NewClient(opts)
		token := client.Connect()
		token.Wait()
		if token.Error() == nil {
			break
		}
		log.Printf("[mqtt] 连接控制器失败: %v", token.Error())
		if !sleepCtx(ctx, 10*time.Second) {
			return
		}
	}

	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			client.Disconnect(100)
			return
		case <-ticker.C:
			p.publishReadRequest(client)
		}
	}
}

func (p *MQTTPoller) clientOptions() *mqtt.ClientOptions {
	opts := mqtt.NewClientOptions()
	opts.AddBroker(fmt.Sprintf("tcp://%s", p.broker))
	opts.SetClientID(fmt.Sprintf("znhkws-collector-%d", time.Now().UnixNano()%1000000))
	opts.SetUsername(p.username)
	opts.SetPassword(p.password)
	opts.SetKeepAlive(30 * time.Second)
	opts.SetConnectTimeout(10 * time.Second)
	opts.SetAutoReconnect(true)
	opts.SetOnConnectHandler(func(c mqtt.Client) {
		p.subscribeAndRequest(c)
	})
	return opts
}

func (p *MQTTPoller) topics() map[string]byte {
	return map[string]byte{
		fmt.Sprintf("%s/server/%s", p.udid, p.terminal):         0,
		fmt.Sprintf("%s/%s/%s", p.udid, p.username, p.terminal): 0,
	}
}

func (p *MQTTPoller) subscribeAndRequest(client mqtt.Client) {
	token := client.SubscribeMultiple(p.topics(), p.onMessage)
	if token.Wait() && token.Error() != nil {
		log.Printf("[mqtt] 订阅失败: %v", token.Error())
		return
	}
	log.Printf("[mqtt] 已连接并订阅控制器数据")
	p.publishReadRequest(client)
}

func (p *MQTTPoller) publishReadRequest(client mqtt.Client) {
	payload, _ := json.Marshal(map[string]any{"MsgType": "getStatusTopic", "Code": 0, "Data": "All"})
	token := client.Publish(fmt.Sprintf("%s/%s", p.terminal, p.username), 0, false, payload)
	token.Wait()
	if token.Error() != nil {
		log.Printf("[mqtt] 发送读取请求失败: %v", token.Error())
	}
}

func (p *MQTTPoller) onMessage(_ mqtt.Client, message mqtt.Message) {
	var payload struct {
		SensorList []mqttSensorItem `json:"SensorList"`
	}
	if err := json.Unmarshal(message.Payload(), &payload); err != nil || len(payload.SensorList) == 0 {
		return
	}

	now := time.Now().Format("2006-01-02 15:04:05")
	var rows []domain.Measurement
	for _, item := range payload.SensorList {
		sensor, ok := catalog.MQTTSensorByAD(item.AD)
		if !ok {
			continue
		}
		for _, dv := range item.DV {
			metric := mqttMetricByCode(sensor, dv.T)
			if metric == nil {
				continue
			}
			value, ok := toFloat(dv.V)
			if !ok || value <= -100 {
				continue
			}
			rows = append(rows, domain.Measurement{
				DeviceID:   sensor.DeviceID,
				Metric:     metric.Metric,
				Label:      metric.Label,
				Value:      round6(value),
				Unit:       metric.Unit,
				RecordedAt: now,
			})
		}
	}
	if len(rows) == 0 {
		return
	}
	p.mu.Lock()
	if !p.lastWrite.IsZero() && time.Since(p.lastWrite) < p.interval {
		p.mu.Unlock()
		return
	}
	p.mu.Unlock()
	if err := p.store.InsertMeasurements(catalog.VendorHuachuang, rows); err != nil {
		log.Printf("[mqtt] 写入测量值失败: %v", err)
		return
	}
	p.mu.Lock()
	p.lastWrite = time.Now()
	p.mu.Unlock()
	log.Printf("[mqtt] 已写入 %d 条控制器测量值", len(rows))
}

func mqttMetricByCode(sensor catalog.MQTTSensor, code int) *catalog.MQTTMetric {
	for i := range sensor.Metrics {
		if sensor.Metrics[i].Code == code {
			return &sensor.Metrics[i]
		}
	}
	return nil
}

func sleepCtx(ctx context.Context, duration time.Duration) bool {
	timer := time.NewTimer(duration)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-timer.C:
		return true
	}
}
