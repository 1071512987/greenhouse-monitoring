package main

import (
	"flag"
	"log"
	"net/http"

	"greenhouse-monitoring/internal/httpapi"
)

func main() {
	addr := flag.String("addr", ":8080", "HTTP listen address")
	frontend := flag.String("frontend", "", "optional built frontend directory")
	flag.Parse()
	log.Printf("Greenhouse API listening on %s", *addr)
	if err := http.ListenAndServe(*addr, httpapi.NewServer(*frontend)); err != nil {
		log.Fatal(err)
	}
}
