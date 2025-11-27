// Package function contains the Cloud Function entry point
package function

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/GoogleCloudPlatform/functions-framework-go/functions"
)

const (
	requestTimeout     = 90 * time.Second
	openAIEndpoint     = "https://api.openai.com/v1/chat/completions"
	elevenLabsEndpoint = "https://api.elevenlabs.io/v1/text-to-speech"
	defaultVoiceID     = "21m00Tcm4TlvDq8ikWAM"
)

func init() {
	functions.HTTP("GenerateAudio", GenerateAudio)
}

// Attraction represents a point of interest
type Attraction struct {
	Name      string  `json:"name"`
	Category  string  `json:"category"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Language  string  `json:"language"`
}

func (a *Attraction) Validate() error {
	a.Name = strings.TrimSpace(a.Name)
	if a.Name == "" {
		return errors.New("name is required")
	}
	if len(a.Name) > 500 {
		return errors.New("name must be at most 500 characters")
	}

	a.Category = strings.TrimSpace(a.Category)
	if a.Category == "" {
		return errors.New("category is required")
	}
	if len(a.Category) > 100 {
		return errors.New("category must be at most 100 characters")
	}

	if a.Latitude < -90 || a.Latitude > 90 {
		return errors.New("latitude must be between -90 and 90")
	}

	if a.Longitude < -180 || a.Longitude > 180 {
		return errors.New("longitude must be between -180 and 180")
	}

	// Set default language if not provided
	a.Language = strings.TrimSpace(a.Language)
	if a.Language == "" {
		a.Language = "English"
	}
	if len(a.Language) > 50 {
		return errors.New("language must be at most 50 characters")
	}

	return nil
}

// GenerateAudio is the Cloud Function entry point
func GenerateAudio(w http.ResponseWriter, r *http.Request) {
	// CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var attraction Attraction
	if err := json.NewDecoder(r.Body).Decode(&attraction); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON: "+err.Error())
		return
	}

	if err := attraction.Validate(); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), requestTimeout)
	defer cancel()

	openAIKey := os.Getenv("OPENAI_API_KEY")
	elevenLabsKey := os.Getenv("ELEVENLABS_API_KEY")

	if openAIKey == "" || elevenLabsKey == "" {
		writeError(w, http.StatusInternalServerError, "Service configuration error")
		return
	}

	// Generate facts
	facts, err := generateFacts(ctx, openAIKey, &attraction)
	if err != nil {
		writeError(w, http.StatusBadGateway, "Failed to generate facts")
		return
	}

	// Generate script
	script, err := generateScript(ctx, openAIKey, attraction.Name, facts, attraction.Language)
	if err != nil {
		writeError(w, http.StatusBadGateway, "Failed to generate script")
		return
	}

	// Generate audio
	audio, err := generateAudioTTS(ctx, elevenLabsKey, script)
	if err != nil {
		writeError(w, http.StatusBadGateway, "Failed to generate audio")
		return
	}

	w.Header().Set("Content-Type", "audio/mpeg")
	w.WriteHeader(http.StatusOK)
	w.Write(audio)
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

// OpenAI types
type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model       string        `json:"model"`
	Messages    []chatMessage `json:"messages"`
	MaxTokens   int           `json:"max_tokens"`
	Temperature float64       `json:"temperature"`
}

type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func generateFacts(ctx context.Context, apiKey string, attraction *Attraction) (string, error) {
	systemPrompt := fmt.Sprintf("You are a knowledgeable tour guide with expertise in history, architecture, and culture. Provide accurate, engaging facts suitable for tourists. Write your response entirely in %s.", attraction.Language)
	userPrompt := fmt.Sprintf(`Provide 3-5 interesting facts about "%s" (%s) located at coordinates %f, %f. Focus on:
- Historical significance
- Architectural features
- Cultural importance
- Interesting stories or legends

Be concise but engaging. Each fact should be 1-2 sentences. Write in %s.`, attraction.Name, attraction.Category, attraction.Latitude, attraction.Longitude, attraction.Language)

	return chatCompletion(ctx, apiKey, systemPrompt, userPrompt, 500, 0.7)
}

func generateScript(ctx context.Context, apiKey, attractionName, facts, language string) (string, error) {
	systemPrompt := fmt.Sprintf("You are a professional audio guide scriptwriter. Write natural, conversational scripts for text-to-speech narration. Avoid visual references like \"as you can see\". Use clear pronunciation-friendly language. Write entirely in %s.", language)
	userPrompt := fmt.Sprintf(`Write a 30-60 second audio guide script for "%s" based on these facts:

%s

Requirements:
- Start with a warm welcome mentioning the attraction name
- Share 2-3 of the most interesting facts naturally
- Use conversational, engaging language
- End with an invitation to explore or take photos
- Keep it between 80-150 words for optimal audio length
- Write the entire script in %s`, attractionName, facts, language)

	return chatCompletion(ctx, apiKey, systemPrompt, userPrompt, 300, 0.8)
}

func chatCompletion(ctx context.Context, apiKey, systemPrompt, userPrompt string, maxTokens int, temperature float64) (string, error) {
	reqBody := chatRequest{
		Model: "gpt-4o-mini",
		Messages: []chatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		MaxTokens:   maxTokens,
		Temperature: temperature,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", openAIEndpoint, bytes.NewReader(jsonBody))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("OpenAI error %d: %s", resp.StatusCode, string(body))
	}

	var chatResp chatResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return "", err
	}

	if len(chatResp.Choices) == 0 {
		return "", errors.New("no response from OpenAI")
	}

	return chatResp.Choices[0].Message.Content, nil
}

// ElevenLabs types
type voiceSettings struct {
	Stability       float64 `json:"stability"`
	SimilarityBoost float64 `json:"similarity_boost"`
	Style           float64 `json:"style"`
	UseSpeakerBoost bool    `json:"use_speaker_boost"`
}

type ttsRequest struct {
	Text          string        `json:"text"`
	ModelID       string        `json:"model_id"`
	VoiceSettings voiceSettings `json:"voice_settings"`
}

func generateAudioTTS(ctx context.Context, apiKey, script string) ([]byte, error) {
	reqBody := ttsRequest{
		Text:    script,
		ModelID: "eleven_multilingual_v2",
		VoiceSettings: voiceSettings{
			Stability:       0.5,
			SimilarityBoost: 0.75,
			Style:           0.0,
			UseSpeakerBoost: true,
		},
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("%s/%s", elevenLabsEndpoint, defaultVoiceID)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(jsonBody))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("xi-api-key", apiKey)
	req.Header.Set("Accept", "audio/mpeg")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ElevenLabs error %d: %s", resp.StatusCode, string(body))
	}

	return io.ReadAll(resp.Body)
}
