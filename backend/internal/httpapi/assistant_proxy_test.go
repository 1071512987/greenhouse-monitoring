package httpapi

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"greenhouse-monitoring/internal/store"
)

func TestAssistantProxyPassthroughAndAPIKey(t *testing.T) {
	gotKey := ""
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotKey = r.Header.Get("X-API-Key")
		switch r.URL.Path {
		case "/api/v1/health":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"code":0,"message":"success","data":{"status":"ok"}}`))
		case "/api/v1/chat/stream":
			w.Header().Set("Content-Type", "text/event-stream")
			flusher, _ := w.(http.Flusher)
			_, _ = w.Write([]byte("event: meta\ndata: {\"session_id\":\"s1\"}\n\n"))
			flusher.Flush()
			_, _ = w.Write([]byte("event: delta\ndata: {\"content\":\"你好\"}\n\n"))
			flusher.Flush()
			_, _ = w.Write([]byte("event: done\ndata: {\"elapsed_ms\":1}\n\n"))
			flusher.Flush()
		default:
			http.NotFound(w, r)
		}
	}))
	defer backend.Close()

	t.Setenv("ASSISTANT_API_URL", backend.URL+"/api/v1")
	t.Setenv("ASSISTANT_API_KEY", "secret-key")
	handler := NewServer("", store.New())

	health := request(t, handler, http.MethodGet, "/api/assistant/health", nil)
	if health.Code != http.StatusOK || !strings.Contains(health.Body.String(), `"status":"ok"`) {
		t.Fatalf("health proxy failed: %d %s", health.Code, health.Body.String())
	}

	stream := request(t, handler, http.MethodPost, "/api/assistant/chat/stream", map[string]any{"message": "hi"})
	if stream.Code != http.StatusOK {
		t.Fatalf("stream status=%d body=%s", stream.Code, stream.Body.String())
	}
	if !strings.Contains(stream.Body.String(), "event: delta") || !strings.Contains(stream.Body.String(), "你好") {
		t.Fatalf("stream body missing SSE frames: %s", stream.Body.String())
	}
	if gotKey != "secret-key" {
		t.Fatalf("expected X-API-Key forwarded, got %q", gotKey)
	}
}
