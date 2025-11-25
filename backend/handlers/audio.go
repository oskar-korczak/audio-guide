package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"audio-guide-api/models"
	"audio-guide-api/services"
)

// ErrorResponse represents a JSON error response
type ErrorResponse struct {
	Error string `json:"error"`
}

// AudioHandler handles audio generation requests
type AudioHandler struct {
	openAI     *services.OpenAIService
	elevenLabs *services.ElevenLabsService
}

// NewAudioHandler creates a new audio handler
func NewAudioHandler() (*AudioHandler, error) {
	openAI, err := services.NewOpenAIService()
	if err != nil {
		return nil, err
	}

	elevenLabs, err := services.NewElevenLabsService()
	if err != nil {
		return nil, err
	}

	return &AudioHandler{
		openAI:     openAI,
		elevenLabs: elevenLabs,
	}, nil
}

// HandleGenerateAudio handles POST /generate-audio requests
func (h *AudioHandler) HandleGenerateAudio(w http.ResponseWriter, r *http.Request) {
	// Only allow POST method
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Parse request body
	var attraction models.Attraction
	if err := json.NewDecoder(r.Body).Decode(&attraction); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON: "+err.Error())
		return
	}

	// Validate attraction data
	if err := attraction.Validate(); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	ctx := r.Context()

	// Step 1: Generate facts
	log.Printf("Generating facts for: %s", attraction.Name)
	facts, err := h.openAI.GenerateFacts(ctx, &attraction)
	if err != nil {
		log.Printf("Error generating facts: %v", err)
		handleAPIError(w, err)
		return
	}

	// Step 2: Generate script
	log.Printf("Generating script for: %s", attraction.Name)
	script, err := h.openAI.GenerateScript(ctx, attraction.Name, facts)
	if err != nil {
		log.Printf("Error generating script: %v", err)
		handleAPIError(w, err)
		return
	}

	// Step 3: Generate audio
	log.Printf("Generating audio for: %s", attraction.Name)
	audio, err := h.elevenLabs.GenerateAudio(ctx, script)
	if err != nil {
		log.Printf("Error generating audio: %v", err)
		handleAPIError(w, err)
		return
	}

	// Return audio
	log.Printf("Successfully generated audio for: %s (%d bytes)", attraction.Name, len(audio))
	w.Header().Set("Content-Type", "audio/mpeg")
	w.WriteHeader(http.StatusOK)
	w.Write(audio)
}

func writeError(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(ErrorResponse{Error: message})
}

func handleAPIError(w http.ResponseWriter, err error) {
	apiErr, ok := err.(*services.APIError)
	if !ok {
		writeError(w, http.StatusBadGateway, "An unexpected error occurred. Please try again.")
		return
	}

	// Map API errors to user-friendly messages
	var userMessage string
	switch {
	case apiErr.StatusCode == 401:
		userMessage = "Service configuration error. Please try again later."
	case apiErr.StatusCode == 429:
		if apiErr.Service == "elevenlabs" {
			userMessage = "Audio service is busy. Please wait a moment."
		} else {
			userMessage = "Service is busy. Please wait a moment and try again."
		}
	default:
		userMessage = "An unexpected error occurred. Please try again."
	}

	writeError(w, http.StatusBadGateway, userMessage)
}
