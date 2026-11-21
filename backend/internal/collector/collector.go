// Package collector 从南宁温室厂商云平台定时采集数据并写入 SQLite。
package collector

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"greenhouse-monitoring/internal/catalog"
	"greenhouse-monitoring/internal/domain"
	"greenhouse-monitoring/internal/store"
)

// Platform 是厂商云平台 HTTP 客户端（只读，不下发任何控制指令）。
type Platform struct {
	base  string
	user  string
	pass  string
	token string
	http  *http.Client
}

func NewPlatform(base, user, pass string) *Platform {
	return &Platform{
		base: strings.TrimRight(base, "/"),
		user: user,
		pass: pass,
		http: &http.Client{Timeout: 30 * time.Second},
	}
}

type realtimeItem struct {
	Num   string `json:"eNum"`
	Name  string `json:"eName"`
	Value any    `json:"eValue"`
	Unit  string `json:"eUnit"`
	Key   string `json:"eKey"`
	Time  string `json:"datetime"`
}

// Login 登录换取 token（历史接口需要，实时接口不需要）。
func (p *Platform) Login() error {
	raw, err := p.requestOnce(http.MethodPost, "/login", false, map[string]string{"username": p.user, "password": p.pass}, false)
	if err != nil {
		return err
	}
	var obj struct {
		Token   string `json:"token"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(raw, &obj); err != nil {
		return fmt.Errorf("登录响应无法解析: %w", err)
	}
	if obj.Token == "" {
		return fmt.Errorf("登录失败: %s", obj.Message)
	}
	p.token = obj.Token
	return nil
}

func (p *Platform) requestOnce(method, path string, withToken bool, body any, allowRelogin bool) ([]byte, error) {
	var reader io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reader = bytes.NewReader(encoded)
	}
	req, err := http.NewRequest(method, p.base+path, reader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json, text/plain, */*")
	if body != nil {
		req.Header.Set("Content-Type", "application/json;charset=UTF-8")
	}
	if withToken && p.token != "" {
		req.Header.Set("token", p.token)
	}
	res, err := p.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	if (res.StatusCode == http.StatusUnauthorized || res.StatusCode == http.StatusForbidden) && withToken && allowRelogin {
		if err := p.Login(); err != nil {
			return nil, err
		}
		return p.requestOnce(method, path, withToken, body, false)
	}
	if res.StatusCode < 200 || res.StatusCode > 299 {
		return nil, fmt.Errorf("HTTP %d: %s", res.StatusCode, truncate(raw, 200))
	}
	return raw, nil
}

// Realtime 拉取设备实时数据（免登录）。
func (p *Platform) Realtime(deviceID string) ([]realtimeItem, error) {
	raw, err := p.requestOnce(http.MethodGet, "/intfa/queryData/"+deviceID, false, nil, false)
	if err != nil {
		return nil, err
	}
	var obj struct {
		Entity []realtimeItem `json:"entity"`
	}
	if err := json.Unmarshal(raw, &obj); err != nil {
		return nil, err
	}
	return obj.Entity, nil
}

// History 拉取历史数据，interval 单位为分钟，返回按时间正序的记录。
func (p *Platform) History(deviceID, start, end string, interval int) ([]map[string]any, error) {
	var out []map[string]any
	for page := 1; ; page++ {
		query := url.Values{}
		query.Set("startTime", start)
		query.Set("endTime", end)
		query.Set("interval", strconv.Itoa(interval))
		query.Set("pageNum", strconv.Itoa(page))
		query.Set("pageSize", "2000")
		raw, err := p.requestOnce(http.MethodGet, "/datas/"+deviceID+"?"+query.Encode(), true, nil, true)
		if err != nil {
			return nil, err
		}
		var batch []map[string]any
		if err := json.Unmarshal(raw, &batch); err != nil {
			return nil, err
		}
		if len(batch) == 0 {
			break
		}
		out = append(out, batch...)
		if len(batch) < 2000 {
			break
		}
	}
	return out, nil
}

// Poller 定时从平台采集实时数据，并在启动时回补最近一段时间的历史。
type Poller struct {
	platform *Platform
	store    *store.Store
	interval time.Duration
	backfill time.Duration
}

func NewPoller(platform *Platform, st *store.Store, interval, backfill time.Duration) *Poller {
	return &Poller{platform: platform, store: st, interval: interval, backfill: backfill}
}

func (p *Poller) Run(ctx context.Context) {
	p.collectRealtime()
	p.backfillHistory()
	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			p.collectRealtime()
		}
	}
}

func (p *Poller) collectRealtime() {
	var rows []domain.Measurement
	for _, id := range catalog.PhysicalIDs() {
		items, err := p.platform.Realtime(id)
		if err != nil {
			log.Printf("[collector] 实时数据 %s 取数失败: %v", id, err)
			continue
		}
		for _, item := range items {
			ch, ok := catalog.ChannelByPhysical(id, item.Key)
			if !ok {
				continue
			}
			value, ok := toFloat(item.Value)
			if !ok {
				continue
			}
			rows = append(rows, domain.Measurement{
				DeviceID:   ch.DeviceID,
				Metric:     ch.Metric,
				Label:      firstNonEmpty(item.Name, ch.Label),
				Value:      value,
				Unit:       firstNonEmpty(item.Unit, ch.Unit),
				RecordedAt: item.Time,
			})
		}
	}
	if len(rows) == 0 {
		log.Printf("[collector] 本轮没有取到实时数据")
		return
	}
	if err := p.store.InsertMeasurements(catalog.VendorXinpuhui, rows); err != nil {
		log.Printf("[collector] 写入实时数据失败: %v", err)
		return
	}
	log.Printf("[collector] 已写入 %d 条实时测量值", len(rows))
}

func (p *Poller) backfillHistory() {
	if p.backfill <= 0 {
		return
	}
	if err := p.platform.Login(); err != nil {
		log.Printf("[collector] 历史回补登录失败: %v", err)
		return
	}
	now := time.Now()
	start := now.Add(-p.backfill).Format("2006-01-02 15:04:05")
	end := now.Format("2006-01-02 15:04:05")
	for _, id := range catalog.PhysicalIDs() {
		records, err := p.platform.History(id, start, end, 1)
		if err != nil {
			log.Printf("[collector] 历史回补 %s 失败: %v", id, err)
			continue
		}
		var rows []domain.Measurement
		for _, record := range records {
			recordedAt, _ := record["dataTime"].(string)
			if recordedAt == "" {
				continue
			}
			for _, ch := range catalog.Channels {
				if ch.PhysicalID != id {
					continue
				}
				rawValue, ok := toFloat(record[ch.Key])
				if !ok || rawValue >= 32767 {
					continue
				}
				rows = append(rows, domain.Measurement{
					DeviceID:   ch.DeviceID,
					Metric:     ch.Metric,
					Label:      ch.Label,
					Value:      round6(rawValue * ch.Prec),
					Unit:       ch.Unit,
					RecordedAt: recordedAt,
				})
			}
		}
		if err := p.store.InsertMeasurements(catalog.VendorXinpuhui, rows); err != nil {
			log.Printf("[collector] 历史回补 %s 写入失败: %v", id, err)
			continue
		}
		log.Printf("[collector] 历史回补 %s: %d 条记录 → %d 条测量值", id, len(records), len(rows))
	}
}

func toFloat(value any) (float64, bool) {
	switch v := value.(type) {
	case float64:
		return v, true
	case json.Number:
		f, err := v.Float64()
		return f, err == nil
	case string:
		f, err := strconv.ParseFloat(strings.TrimSpace(v), 64)
		return f, err == nil
	case int:
		return float64(v), true
	case int64:
		return float64(v), true
	default:
		return 0, false
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func truncate(raw []byte, limit int) string {
	if len(raw) <= limit {
		return string(raw)
	}
	return string(raw[:limit])
}

func round6(value float64) float64 {
	return math.Round(value*1e6) / 1e6
}
