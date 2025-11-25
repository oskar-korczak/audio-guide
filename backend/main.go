package main

import (
	"log"
	"net/http"
	"os"

	"audio-guide-api/handlers"
	"audio-guide-api/middleware"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Initialize audio handler
	audioHandler, err := handlers.NewAudioHandler()
	if err != nil {
		log.Fatalf("Failed to initialize audio handler: %v", err)
	}

	// Register routes with CORS
	http.HandleFunc("/generate-audio", middleware.CORSHandler(audioHandler.HandleGenerateAudio))
	http.HandleFunc("/health", middleware.CORSHandler(healthHandler))

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}
