package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"greenhouse-monitoring/internal/collector"
	"greenhouse-monitoring/internal/httpapi"
	"greenhouse-monitoring/internal/store"
)

func main() {
	addr := flag.String("addr", ":8080", "HTTP listen address")
	frontend := flag.String("frontend", "", "optional built frontend directory")
	dbPath := flag.String("db", envOr("GREENHOUSE_DB", "greenhouse.db"), "SQLite database path")
	flag.Parse()

	st, err := store.Open(*dbPath)
	if err != nil {
		log.Fatalf("打开数据库失败: %v", err)
	}

	platform := collector.NewPlatform(
		envOr("NANNING_PLATFORM_BASE", "http://115.28.187.9:8005"),
		envOr("NANNING_PLATFORM_USER", "038085047"),
		envOr("NANNING_PLATFORM_PASS", "123456"),
	)
	poller := collector.NewPoller(
		platform,
		st,
		envDuration("NANNING_COLLECT_INTERVAL", 2*time.Minute),
		envDuration("NANNING_BACKFILL", 24*time.Hour),
	)
	go poller.Run(context.Background())

	mqttPoller := collector.NewMQTTPoller(
		envOr("NANNING_MQTT_BROKER", "39.107.83.23:1883"),
		envOr("NANNING_MQTT_USER", "ZNHKWS1"),
		envOr("NANNING_MQTT_PASS", "123456"),
		envOr("NANNING_MQTT_TERMINAL", "19251201894"),
		st,
		envDuration("NANNING_MQTT_INTERVAL", 2*time.Minute),
	)
	go mqttPoller.Run(context.Background())

	log.Printf("Greenhouse API listening on %s", *addr)
	if err := http.ListenAndServe(*addr, httpapi.NewServer(*frontend, st)); err != nil {
		log.Fatal(err)
	}
}

func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func envDuration(key string, fallback time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if n, err := strconv.Atoi(value); err == nil && n > 0 {
			return time.Duration(n) * time.Second
		}
	}
	return fallback
}
