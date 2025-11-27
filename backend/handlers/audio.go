package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	apierrors "audio-guide-api/errors"
	"audio-guide-api/models"
	"audio-guide-api/services"
)

const requestTimeout = 90 * time.Second

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
		apierrors.WriteMethodNotAllowed(w)
		return
	}

	// Parse request body
	var attraction models.Attraction
	if err := json.NewDecoder(r.Body).Decode(&attraction); err != nil {
		apierrors.WriteValidationError(w, "Invalid JSON: "+err.Error())
		return
	}

	// Validate attraction data
	if err := attraction.Validate(); err != nil {
		apierrors.WriteValidationError(w, err.Error())
		return
	}

	// Create context with timeout
	ctx, cancel := context.WithTimeout(r.Context(), requestTimeout)
	defer cancel()

	// Step 1: Generate facts
	log.Printf("Generating facts for: %s", attraction.Name)
	facts, err := h.openAI.GenerateFacts(ctx, &attraction)
	if err != nil {
		log.Printf("Error generating facts: %v", err)
		apierrors.WriteErrorResponse(w, err)
		return
	}

	// Check context before continuing
	if ctx.Err() != nil {
		log.Printf("Request timed out after generating facts")
		apierrors.WriteErrorResponse(w, ctx.Err())
		return
	}

	// Step 2: Generate script
	log.Printf("Generating script for: %s in %s", attraction.Name, attraction.Language)
	script, err := h.openAI.GenerateScript(ctx, attraction.Name, facts, attraction.Language)
	if err != nil {
		log.Printf("Error generating script: %v", err)
		apierrors.WriteErrorResponse(w, err)
		return
	}

	// Check context before continuing
	if ctx.Err() != nil {
		log.Printf("Request timed out after generating script")
		apierrors.WriteErrorResponse(w, ctx.Err())
		return
	}

	// Step 3: Generate audio
	log.Printf("Generating audio for: %s", attraction.Name)
	audio, err := h.elevenLabs.GenerateAudio(ctx, script)
	if err != nil {
		log.Printf("Error generating audio: %v", err)
		apierrors.WriteErrorResponse(w, err)
		return
	}

	// Return audio
	log.Printf("Successfully generated audio for: %s (%d bytes)", attraction.Name, len(audio))
	w.Header().Set("Content-Type", "audio/mpeg")
	w.WriteHeader(http.StatusOK)
	w.Write(audio)
}
