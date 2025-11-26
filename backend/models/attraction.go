package models

import (
	"errors"
	"strings"
)

// Attraction represents a point of interest for audio guide generation
type Attraction struct {
	Name      string  `json:"name"`
	Category  string  `json:"category"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// Validate checks if the attraction data is valid
func (a *Attraction) Validate() error {
	// Validate name
	a.Name = strings.TrimSpace(a.Name)
	if a.Name == "" {
		return errors.New("name is required")
	}
	if len(a.Name) > 500 {
		return errors.New("name must be at most 500 characters")
	}

	// Validate category
	a.Category = strings.TrimSpace(a.Category)
	if a.Category == "" {
		return errors.New("category is required")
	}
	if len(a.Category) > 100 {
		return errors.New("category must be at most 100 characters")
	}

	// Validate latitude
	if a.Latitude < -90 || a.Latitude > 90 {
		return errors.New("latitude must be between -90 and 90")
	}

	// Validate longitude
	if a.Longitude < -180 || a.Longitude > 180 {
		return errors.New("longitude must be between -180 and 180")
	}

	return nil
}
