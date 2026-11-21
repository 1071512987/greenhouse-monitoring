package httpapi

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"
)

// newAssistantProxy 把 /api/assistant/* 同源代理到设施蔬菜问答服务（8089）。
// 支持 SSE 逐段透传，并把可选 API Key 注入请求头。
func newAssistantProxy(targetURL, apiKey string) http.Handler {
	target, err := url.Parse(targetURL)
	if err != nil || target.Host == "" {
		log.Printf("[assistant] 代理地址无效: %q，/api/assistant 将不可用", targetURL)
		return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			http.Error(w, "assistant proxy not configured", http.StatusBadGateway)
		})
	}

	proxy := &httputil.ReverseProxy{
		Director: func(req *http.Request) {
			req.URL.Scheme = target.Scheme
			req.URL.Host = target.Host
			req.Host = target.Host
			req.URL.Path = joinProxyPath(target.Path, strings.TrimPrefix(req.URL.Path, "/api/assistant"))
			req.URL.RawPath = ""
			if apiKey != "" {
				req.Header.Set("X-API-Key", apiKey)
			}
		},
		FlushInterval: 100 * time.Millisecond,
		ModifyResponse: func(resp *http.Response) error {
			resp.Header.Set("X-Accel-Buffering", "no")
			return nil
		},
	}
	return proxy
}

func joinProxyPath(base, rest string) string {
	base = strings.TrimSuffix(base, "/")
	if rest == "" {
		if base == "" {
			return "/"
		}
		return base
	}
	if !strings.HasPrefix(rest, "/") {
		rest = "/" + rest
	}
	if base == "" {
		return rest
	}
	return base + rest
}
