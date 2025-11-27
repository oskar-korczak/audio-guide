package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	apierrors "audio-guide-api/errors"
)

const (
	elevenLabsEndpoint = "https://api.elevenlabs.io/v1/text-to-speech"
	defaultVoiceID     = "21m00Tcm4TlvDq8ikWAM" // Rachel - clear and professional
	elevenLabsTimeout  = 30 * time.Second
)

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

type elevenLabsError struct {
	Detail interface{} `json:"detail"`
}

// ElevenLabsService handles ElevenLabs API interactions
type ElevenLabsService struct {
	apiKey string
	client *http.Client
}

// NewElevenLabsService creates a new ElevenLabs service
func NewElevenLabsService() (*ElevenLabsService, error) {
	apiKey := os.Getenv("ELEVENLABS_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("ELEVENLABS_API_KEY environment variable is required")
	}
	return &ElevenLabsService{
		apiKey: apiKey,
		client: &http.Client{
			Timeout: elevenLabsTimeout,
		},
	}, nil
}

// GenerateAudio converts script text to MP3 audio
func (s *ElevenLabsService) GenerateAudio(ctx context.Context, script string) ([]byte, error) {
	// Check if context is already done
	if err := ctx.Err(); err != nil {
		return nil, err
	}

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
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/%s", elevenLabsEndpoint, defaultVoiceID)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("xi-api-key", s.apiKey)
	req.Header.Set("Accept", "audio/mpeg")

	resp, err := s.client.Do(req)
	if err != nil {
		// Check if it was a timeout or cancellation
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		var errResp elevenLabsError
		errMsg := fmt.Sprintf("ElevenLabs API error: %d", resp.StatusCode)
		if json.Unmarshal(body, &errResp) == nil {
			errMsg = parseElevenLabsError(errResp.Detail)
		}
		return nil, apierrors.NewAPIError(resp.StatusCode, "elevenlabs", errMsg)
	}

	return body, nil
}

func parseElevenLabsError(detail interface{}) string {
	switch v := detail.(type) {
	case string:
		return v
	case map[string]interface{}:
		if msg, ok := v["message"].(string); ok {
			return msg
		}
	}
	return "Unknown ElevenLabs error"
}
