package store

import (
	"database/sql"
	"fmt"
	"math"
	"strings"
	"sync"
	"time"

	_ "modernc.org/sqlite"

	"greenhouse-monitoring/internal/catalog"
	"greenhouse-monitoring/internal/domain"
)

// Store 负责演示数据、Agent 运行记录与真实测量值（SQLite）的存取。
// HTTP（新普惠）和 MQTT（华创科技）分别落在两张独立的表里。
type Store struct {
	mu      sync.RWMutex
	history []domain.Observation
	runs    []domain.AgentRun
	db      *sql.DB
}

const httpTable = "measurements"
const mqttTable = "mqtt_measurements"

const schema = `
CREATE TABLE IF NOT EXISTS measurements (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	device_id TEXT NOT NULL,
	metric TEXT NOT NULL,
	label TEXT NOT NULL,
	value REAL NOT NULL,
	unit TEXT NOT NULL,
	recorded_at TEXT NOT NULL,
	UNIQUE(device_id, metric, recorded_at)
);
CREATE INDEX IF NOT EXISTS idx_measurements_device_metric_time
	ON measurements(device_id, metric, recorded_at);
CREATE TABLE IF NOT EXISTS mqtt_measurements (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	device_id TEXT NOT NULL,
	metric TEXT NOT NULL,
	label TEXT NOT NULL,
	value REAL NOT NULL,
	unit TEXT NOT NULL,
	recorded_at TEXT NOT NULL,
	UNIQUE(device_id, metric, recorded_at)
);
CREATE INDEX IF NOT EXISTS idx_mqtt_measurements_device_metric_time
	ON mqtt_measurements(device_id, metric, recorded_at);
`

// New 返回不带数据库的内存实现，供测试和纯演示使用。
func New() *Store {
	return &Store{history: demoHistory(), runs: []domain.AgentRun{}}
}

// Open 打开 SQLite 数据库并建表，供生产环境使用。
func Open(path string) (*Store, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	if _, err := db.Exec(schema); err != nil {
		db.Close()
		return nil, err
	}
	return &Store{history: demoHistory(), runs: []domain.AgentRun{}, db: db}, nil
}

func demoHistory() []domain.Observation {
	now := time.Now().Truncate(time.Minute)
	history := make([]domain.Observation, 0, 25)
	for i := 24; i >= 0; i-- {
		t := now.Add(-time.Duration(i) * time.Hour)
		hour := float64(t.Hour())
		daylight := math.Max(0, math.Sin((hour-6)/12*math.Pi))
		history = append(history, domain.Observation{
			Timestamp:   t,
			Temperature: round(20.8 + daylight*7.1 + math.Sin(float64(i))*0.35),
			Humidity:    round(71 - daylight*15 + math.Cos(float64(i))*1.2),
			Soil:        round(46.5 - float64(24-i)*0.16),
			Light:       math.Round(daylight * 920),
		})
	}
	return history
}

func round(value float64) float64 { return math.Round(value*10) / 10 }

func tableForVendor(vendor string) string {
	if vendor == catalog.VendorHuachuang {
		return mqttTable
	}
	return httpTable
}

func (s *Store) tableForDevice(deviceID string) string {
	if device, ok := catalog.DeviceByID(deviceID); ok {
		return tableForVendor(device.Vendor)
	}
	return httpTable
}

func (s *Store) Dashboard() domain.Dashboard {
	s.mu.RLock()
	defer s.mu.RUnlock()
	history := append([]domain.Observation(nil), s.history...)
	online := 0
	for _, device := range catalog.Devices {
		if s.isRecentLocked(device.ID, 10*time.Minute) {
			online++
		}
	}
	return domain.Dashboard{
		Latest: history[len(history)-1], History: history,
		Zones:  []domain.Zone{{Name: "育苗 A区", Temperature: 25.8, Humidity: 68, Health: 96}, {Name: "番茄 B区", Temperature: 27.1, Humidity: 61, Health: 91}, {Name: "叶菜 C区", Temperature: 24.6, Humidity: 72, Health: 84}},
		Alerts: []domain.Alert{{ID: "a1", Severity: "warning", Title: "A区土壤含水率下降", Detail: "根域探针低于 45% 目标线", Time: "3分钟前"}, {ID: "a2", Severity: "critical", Title: "C区探针离线", Detail: "SM-C02 已失联 18 分钟", Time: "18分钟前"}},
		Online: online, Total: len(catalog.Devices), UpdatedAt: time.Now(), Efficiency: 93.6,
	}
}

// Sensors 返回逻辑设备目录（两路来源），并把每台设备的最新测量值拼进 metrics。
func (s *Store) Sensors() []domain.Sensor {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.Sensor, 0, len(catalog.Devices))
	for _, device := range catalog.Devices {
		latest := s.latestLocked(device.ID)
		metrics := make([]domain.SensorMetric, 0, len(latest))
		value, unit, status, lastSeen := 0.0, "", "offline", "暂无"
		if len(latest) > 0 {
			value = latest[0].Value
			unit = latest[0].Unit
			lastSeen = relative(latest[0].RecordedAt)
			if recent(latest[0].RecordedAt, 10*time.Minute) {
				status = "online"
			}
		}
		for _, m := range latest {
			metrics = append(metrics, domain.SensorMetric{Label: m.Label, Value: m.Value, Unit: m.Unit})
		}
		out = append(out, domain.Sensor{
			ID: device.ID, Vendor: device.Vendor, Name: device.Name, Category: device.Category, Type: device.Type,
			Model: device.Model, Manufacturer: device.Manufacturer, Zone: device.Zone,
			Connection: device.Connection, Value: value, Unit: unit, Metrics: metrics,
			Status: status, Battery: 100, LastSeen: lastSeen,
		})
	}
	return out
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

// InsertMeasurements 按来源写入对应的表，重复的 (设备, 指标, 时间) 会被忽略。
func (s *Store) InsertMeasurements(vendor string, rows []domain.Measurement) error {
	if s.db == nil || len(rows) == 0 {
		return nil
	}
	table := tableForVendor(vendor)
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	stmt, err := tx.Prepare(fmt.Sprintf(`INSERT OR IGNORE INTO %s(device_id, metric, label, value, unit, recorded_at) VALUES (?, ?, ?, ?, ?, ?)`, table))
	if err != nil {
		return err
	}
	defer stmt.Close()
	for _, m := range rows {
		if _, err := stmt.Exec(m.DeviceID, m.Metric, m.Label, m.Value, m.Unit, m.RecordedAt); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// MeasurementPoints 按时间点分页返回某台设备的测量值，每页按时间升序排列。
func (s *Store) MeasurementPoints(deviceID, metric string, page, pageSize int) (domain.MeasurementPage, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 1000 {
		pageSize = 288
	}
	result := domain.MeasurementPage{Items: []domain.MeasurementPoint{}, Total: 0, Page: page, PageSize: pageSize}
	if s.db == nil {
		return result, nil
	}

	table := s.tableForDevice(deviceID)
	where := "device_id = ?"
	args := []any{deviceID}
	if metric != "" {
		where += " AND metric = ?"
		args = append(args, metric)
	}

	var total int
	if err := s.db.QueryRow(fmt.Sprintf("SELECT COUNT(DISTINCT recorded_at) FROM %s WHERE %s", table, where), args...).Scan(&total); err != nil {
		return result, err
	}
	result.Total = total
	if total == 0 {
		return result, nil
	}

	tsArgs := append(append([]any{}, args...), pageSize, (page-1)*pageSize)
	tsRows, err := s.db.Query(fmt.Sprintf("SELECT DISTINCT recorded_at FROM %s WHERE %s ORDER BY recorded_at DESC LIMIT ? OFFSET ?", table, where), tsArgs...)
	if err != nil {
		return result, err
	}
	defer tsRows.Close()

	var timestamps []string
	for tsRows.Next() {
		var ts string
		if err := tsRows.Scan(&ts); err != nil {
			return result, err
		}
		timestamps = append(timestamps, ts)
	}
	if err := tsRows.Err(); err != nil {
		return result, err
	}
	if len(timestamps) == 0 {
		return result, nil
	}

	placeholders := strings.TrimSuffix(strings.Repeat("?,", len(timestamps)), ",")
	rowArgs := append(append([]any{}, args...), toAny(timestamps)...)
	rowRows, err := s.db.Query(fmt.Sprintf("SELECT metric, label, value, unit, recorded_at FROM %s WHERE %s AND recorded_at IN (%s) ORDER BY recorded_at ASC", table, where, placeholders), rowArgs...)
	if err != nil {
		return result, err
	}
	defer rowRows.Close()

	byTime := make(map[string][]domain.Measurement, len(timestamps))
	for rowRows.Next() {
		var m domain.Measurement
		if err := rowRows.Scan(&m.Metric, &m.Label, &m.Value, &m.Unit, &m.RecordedAt); err != nil {
			return result, err
		}
		m.DeviceID = deviceID
		byTime[m.RecordedAt] = append(byTime[m.RecordedAt], m)
	}
	if err := rowRows.Err(); err != nil {
		return result, err
	}

	items := make([]domain.MeasurementPoint, 0, len(timestamps))
	for i := len(timestamps) - 1; i >= 0; i-- {
		ts := timestamps[i]
		metrics := byTime[ts]
		if metrics == nil {
			metrics = []domain.Measurement{}
		}
		items = append(items, domain.MeasurementPoint{Timestamp: ts, Metrics: metrics})
	}
	result.Items = items
	return result, nil
}

func (s *Store) latestLocked(deviceID string) []domain.Measurement {
	if s.db == nil {
		return nil
	}
	table := s.tableForDevice(deviceID)
	rows, err := s.db.Query(fmt.Sprintf(`
		SELECT metric, label, value, unit, recorded_at
		FROM %s
		WHERE device_id = ? AND recorded_at = (
			SELECT MAX(recorded_at) FROM %s WHERE device_id = ?
		)
		ORDER BY metric`, table, table), deviceID, deviceID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var out []domain.Measurement
	for rows.Next() {
		var m domain.Measurement
		if err := rows.Scan(&m.Metric, &m.Label, &m.Value, &m.Unit, &m.RecordedAt); err == nil {
			m.DeviceID = deviceID
			out = append(out, m)
		}
	}
	return out
}

func (s *Store) isRecentLocked(deviceID string, within time.Duration) bool {
	if s.db == nil {
		return false
	}
	table := s.tableForDevice(deviceID)
	var latest string
	if err := s.db.QueryRow(fmt.Sprintf(`SELECT MAX(recorded_at) FROM %s WHERE device_id = ?`, table), deviceID).Scan(&latest); err != nil || latest == "" {
		return false
	}
	return recent(latest, within)
}

func recent(recordedAt string, within time.Duration) bool {
	t, err := time.ParseInLocation("2006-01-02 15:04:05", recordedAt, time.Local)
	if err != nil {
		return true
	}
	elapsed := time.Since(t)
	return elapsed >= 0 && elapsed <= within
}

func relative(recordedAt string) string {
	t, err := time.ParseInLocation("2006-01-02 15:04:05", recordedAt, time.Local)
	if err != nil {
		return recordedAt
	}
	elapsed := time.Since(t)
	switch {
	case elapsed < time.Minute:
		return "刚刚"
	case elapsed < time.Hour:
		return fmt.Sprintf("%d分钟前", int(elapsed.Minutes()))
	case elapsed < 24*time.Hour:
		return fmt.Sprintf("%d小时前", int(elapsed.Hours()))
	default:
		return fmt.Sprintf("%d天前", int(elapsed.Hours()/24))
	}
}

func toAny(list []string) []any {
	out := make([]any, len(list))
	for i, v := range list {
		out[i] = v
	}
	return out
}
