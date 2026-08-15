package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"greenhouse-monitoring/internal/agent"
	"greenhouse-monitoring/internal/domain"
	"greenhouse-monitoring/internal/store"
)

type server struct {
	store       *store.Store
	engine      agent.Engine
	frontendDir string
}

func NewServer(frontendDir string) http.Handler {
	s := &server{store: store.New(), engine: agent.NewRuleEngine(), frontendDir: frontendDir}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", s.health)
	mux.HandleFunc("GET /api/dashboard", s.dashboard)
	mux.HandleFunc("GET /api/sensors", s.sensors)
	mux.HandleFunc("GET /api/agent/runs", s.agentRuns)
	mux.HandleFunc("POST /api/agent/runs", s.createAgentRun)
	mux.HandleFunc("/", s.frontend)
	return cors(mux)
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func (s *server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "greenhouse-api"})
}
func (s *server) dashboard(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, s.store.Dashboard())
}
func (s *server) sensors(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, s.store.Sensors())
}
func (s *server) agentRuns(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, s.store.Runs())
}

func (s *server) createAgentRun(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req domain.AgentRunRequest
	decoder := json.NewDecoder(io.LimitReader(r.Body, 4<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil && !errors.Is(err, io.EOF) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "请求数据格式无效"})
		return
	}
	if strings.TrimSpace(req.SourceName) == "" {
		req.SourceName = "在线数据"
	}
	if len(req.Observations) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "至少需要一条温室观测记录"})
		return
	}
	if len(req.Observations) > 5000 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "单次最多导入 5000 条记录"})
		return
	}
	run := s.engine.Execute(req)
	s.store.SaveRun(run)
	writeJSON(w, http.StatusCreated, run)
}

func (s *server) frontend(w http.ResponseWriter, r *http.Request) {
	if s.frontendDir == "" {
		http.NotFound(w, r)
		return
	}
	clean := filepath.Clean(strings.TrimPrefix(r.URL.Path, "/"))
	if clean == "." {
		clean = "index.html"
	}
	path := filepath.Join(s.frontendDir, clean)
	if info, err := os.Stat(path); err != nil || info.IsDir() {
		path = filepath.Join(s.frontendDir, "index.html")
	}
	http.ServeFile(w, r, path)
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
