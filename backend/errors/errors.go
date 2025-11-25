package errors

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

// APIError represents an error from an external API
type APIError struct {
	StatusCode int
	Service    string // "openai" or "elevenlabs"
	Message    string
	RawError   error
}

func (e *APIError) Error() string {
	return fmt.Sprintf("%s API error (%d): %s", e.Service, e.StatusCode, e.Message)
}

// NewAPIError creates a new API error
func NewAPIError(statusCode int, service, message string) *APIError {
	return &APIError{
		StatusCode: statusCode,
		Service:    service,
		Message:    message,
	}
}

// ErrorResponse represents a JSON error response
type ErrorResponse struct {
	Error string `json:"error"`
}

// ToUserMessage converts an error to a user-friendly message
func ToUserMessage(err error) string {
	// Check for context deadline exceeded (timeout)
	if err == context.DeadlineExceeded {
		return "Request timed out. Please try again."
	}

	// Check for context canceled
	if err == context.Canceled {
		return "Request was cancelled."
	}

	// Check for API error
	apiErr, ok := err.(*APIError)
	if !ok {
		return "An unexpected error occurred. Please try again."
	}

	// Map API errors to user-friendly messages based on status code and service
	switch apiErr.StatusCode {
	case http.StatusUnauthorized: // 401
		return "Service configuration error. Please try again later."
	case http.StatusTooManyRequests: // 429
		if apiErr.Service == "elevenlabs" {
			return "Audio service is busy. Please wait a moment."
		}
		return "Service is busy. Please wait a moment and try again."
	case http.StatusUnprocessableEntity: // 422
		return "Content could not be processed. Please try again."
	default:
		return "An unexpected error occurred. Please try again."
	}
}

// HTTPStatusFromError determines the appropriate HTTP status code for an error
func HTTPStatusFromError(err error) int {
	if err == context.DeadlineExceeded {
		return http.StatusGatewayTimeout // 504
	}

	if err == context.Canceled {
		return http.StatusRequestTimeout // 408
	}

	apiErr, ok := err.(*APIError)
	if !ok {
		return http.StatusBadGateway // 502
	}

	// Upstream errors are typically 502 Bad Gateway
	// but we can be more specific for certain cases
	switch apiErr.StatusCode {
	case http.StatusTooManyRequests:
		return http.StatusServiceUnavailable // 503
	default:
		return http.StatusBadGateway // 502
	}
}

// WriteErrorResponse writes a JSON error response with appropriate status code
func WriteErrorResponse(w http.ResponseWriter, err error) {
	statusCode := HTTPStatusFromError(err)
	userMessage := ToUserMessage(err)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(ErrorResponse{Error: userMessage})
}

// WriteValidationError writes a 400 Bad Request error for validation failures
func WriteValidationError(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid request: " + message})
}

// WriteMethodNotAllowed writes a 405 Method Not Allowed error
func WriteMethodNotAllowed(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusMethodNotAllowed)
	json.NewEncoder(w).Encode(ErrorResponse{Error: "Method not allowed"})
}
