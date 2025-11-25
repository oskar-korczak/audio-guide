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
	"audio-guide-api/models"
)

const (
	openAIEndpoint     = "https://api.openai.com/v1/chat/completions"
	openAITimeout      = 30 * time.Second
)

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
	Error *struct {
		Message string `json:"message"`
		Code    string `json:"code"`
	} `json:"error,omitempty"`
}

// OpenAIService handles OpenAI API interactions
type OpenAIService struct {
	apiKey string
	client *http.Client
}

// NewOpenAIService creates a new OpenAI service
func NewOpenAIService() (*OpenAIService, error) {
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("OPENAI_API_KEY environment variable is required")
	}
	return &OpenAIService{
		apiKey: apiKey,
		client: &http.Client{
			Timeout: openAITimeout,
		},
	}, nil
}

// GenerateFacts generates interesting facts about an attraction
func (s *OpenAIService) GenerateFacts(ctx context.Context, attraction *models.Attraction) (string, error) {
	systemPrompt := "You are a knowledgeable tour guide with expertise in history, architecture, and culture. Provide accurate, engaging facts suitable for tourists."

	userPrompt := fmt.Sprintf(`Provide 3-5 interesting facts about "%s" (%s) located at coordinates %f, %f. Focus on:
- Historical significance
- Architectural features
- Cultural importance
- Interesting stories or legends

Be concise but engaging. Each fact should be 1-2 sentences.`, attraction.Name, attraction.Category, attraction.Latitude, attraction.Longitude)

	return s.chatCompletion(ctx, systemPrompt, userPrompt, 500, 0.7)
}

// GenerateScript generates a TTS-optimized narration script from facts
func (s *OpenAIService) GenerateScript(ctx context.Context, attractionName string, facts string) (string, error) {
	systemPrompt := "You are a professional audio guide scriptwriter. Write natural, conversational scripts for text-to-speech narration. Avoid visual references like \"as you can see\". Use clear pronunciation-friendly language."

	userPrompt := fmt.Sprintf(`Write a 30-60 second audio guide script for "%s" based on these facts:

%s

Requirements:
- Start with a warm welcome mentioning the attraction name
- Share 2-3 of the most interesting facts naturally
- Use conversational, engaging language
- End with an invitation to explore or take photos
- Keep it between 80-150 words for optimal audio length`, attractionName, facts)

	return s.chatCompletion(ctx, systemPrompt, userPrompt, 300, 0.8)
}

func (s *OpenAIService) chatCompletion(ctx context.Context, systemPrompt, userPrompt string, maxTokens int, temperature float64) (string, error) {
	// Check if context is already done
	if err := ctx.Err(); err != nil {
		return "", err
	}

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
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", openAIEndpoint, bytes.NewReader(jsonBody))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.apiKey)

	resp, err := s.client.Do(req)
	if err != nil {
		// Check if it was a timeout or cancellation
		if ctx.Err() != nil {
			return "", ctx.Err()
		}
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		var errResp chatResponse
		errMsg := fmt.Sprintf("OpenAI API error: %d", resp.StatusCode)
		if json.Unmarshal(body, &errResp) == nil && errResp.Error != nil {
			errMsg = errResp.Error.Message
		}
		return "", apierrors.NewAPIError(resp.StatusCode, "openai", errMsg)
	}

	var chatResp chatResponse
	if err := json.Unmarshal(body, &chatResp); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	if len(chatResp.Choices) == 0 {
		return "", fmt.Errorf("no response from OpenAI")
	}

	return chatResp.Choices[0].Message.Content, nil
}
