package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"greenhouse-monitoring/internal/store"
)

func request(t *testing.T, handler http.Handler, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var payload bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&payload).Encode(body); err != nil {
			t.Fatal(err)
		}
	}
	req := httptest.NewRequest(method, path, &payload)
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	return res
}

func decodeMap(t *testing.T, res *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var result map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &result); err != nil {
		t.Fatalf("decode response: %v; body=%s", err, res.Body.String())
	}
	return result
}

func TestHealth(t *testing.T) {
	handler := NewServer("", store.New())
	res := request(t, handler, http.MethodGet, "/api/health", nil)
	if res.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", res.Code, res.Body.String())
	}
	if decodeMap(t, res)["status"] != "ok" {
		t.Fatalf("unexpected body: %s", res.Body.String())
	}
}

func TestDashboardAndSensors(t *testing.T) {
	handler := NewServer("", store.New())
	dashboard := request(t, handler, http.MethodGet, "/api/dashboard", nil)
	if dashboard.Code != http.StatusOK {
		t.Fatalf("dashboard status=%d", dashboard.Code)
	}
	body := decodeMap(t, dashboard)
	if _, ok := body["latest"]; !ok {
		t.Fatal("dashboard must include latest")
	}
	if history, ok := body["history"].([]any); !ok || len(history) < 12 {
		t.Fatalf("dashboard must include history, got %#v", body["history"])
	}

	sensors := request(t, handler, http.MethodGet, "/api/sensors", nil)
	if sensors.Code != http.StatusOK {
		t.Fatalf("sensors status=%d", sensors.Code)
	}
	var sensorBody []map[string]any
	if err := json.Unmarshal(sensors.Body.Bytes(), &sensorBody); err != nil || len(sensorBody) < 4 {
		t.Fatalf("expected sensor list, err=%v body=%s", err, sensors.Body.String())
	}
	ids := map[string]bool{}
	for _, sensor := range sensorBody {
		id, _ := sensor["id"].(string)
		ids[id] = true
	}
	for _, id := range []string{"indoor-air", "indoor-co2", "indoor-light", "indoor-leaf", "indoor-soil", "outdoor-weather"} {
		if !ids[id] {
			t.Errorf("sensor inventory must include device %s", id)
		}
	}
	if _, ok := sensorBody[0]["metrics"]; !ok {
		t.Fatal("sensor must include type-specific metrics")
	}
}

func TestAgentRunValidationAndHistory(t *testing.T) {
	handler := NewServer("", store.New())
	empty := request(t, handler, http.MethodPost, "/api/agent/runs", map[string]any{"sourceName": "empty.csv", "observations": []any{}})
	if empty.Code != http.StatusBadRequest {
		t.Fatalf("empty observations status=%d body=%s", empty.Code, empty.Body.String())
	}

	valid := map[string]any{
		"sourceName": "zone-a.csv",
		"observations": []map[string]any{{
			"timestamp": "2026-08-14T09:30:00Z", "temperature": 33.2,
			"humidity": 48.0, "soilMoisture": 29.0, "light": 890.0,
		}},
	}
	run := request(t, handler, http.MethodPost, "/api/agent/runs", valid)
	if run.Code != http.StatusCreated {
		t.Fatalf("run status=%d body=%s", run.Code, run.Body.String())
	}
	runBody := decodeMap(t, run)
	if runBody["status"] != "completed" {
		t.Fatalf("expected completed run, got %s", run.Body.String())
	}
	if actions, ok := runBody["actions"].([]any); !ok || len(actions) == 0 {
		t.Fatalf("expected actions, got %s", run.Body.String())
	}

	history := request(t, handler, http.MethodGet, "/api/agent/runs", nil)
	var runs []map[string]any
	if err := json.Unmarshal(history.Body.Bytes(), &runs); err != nil || len(runs) != 1 {
		t.Fatalf("expected one run, err=%v body=%s", err, history.Body.String())
	}
}

func TestEmptyAgentHistoryIsJSONArray(t *testing.T) {
	handler := NewServer("", store.New())
	history := request(t, handler, http.MethodGet, "/api/agent/runs", nil)
	if history.Code != http.StatusOK {
		t.Fatalf("history status=%d", history.Code)
	}
	if got := history.Body.String(); got != "[]\n" {
		t.Fatalf("empty history must be a JSON array, got %q", got)
	}
}
