---
work_package_id: "WP01"
subtasks:
  - "T001"
  - "T002"
  - "T003"
title: "Project Setup"
phase: "Phase 0 - Setup"
lane: "doing"
assignee: ""
agent: "claude"
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-11-25T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP01 – Project Setup

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you understand the feedback, update `review_status: acknowledged`.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

- Initialize a Go 1.21+ module in `backend/` directory
- Create HTTP server skeleton that listens on `PORT` environment variable
- Create Dockerfile for GCP Cloud Run deployment
- **Success**: `go build` succeeds; `docker build` succeeds

## Context & Constraints

- **Tech Stack**: Go 1.21+, stdlib `net/http` only
- **Target**: GCP Cloud Run (serverless container)
- **Reference**: `kitty-specs/001-backend-api-for/plan.md` for project structure
- **Reference**: `kitty-specs/001-backend-api-for/research.md` for Cloud Run config

Cloud Run requirements:
- Server must listen on `PORT` env var (not hardcoded)
- Container must respond to HTTP requests
- Multi-stage Dockerfile for smaller image size

## Subtasks & Detailed Guidance

### Subtask T001 – Initialize Go module

- **Purpose**: Create the Go project with module definition
- **Steps**:
  1. Create `backend/` directory at repository root
  2. Run `go mod init audio-guide-api` inside `backend/`
  3. Verify `go.mod` exists with Go 1.21+
- **Files**:
  - Create: `backend/go.mod`
- **Parallel?**: No (must be first)
- **Notes**: Module name `audio-guide-api` matches deployment name

### Subtask T002 – Create main.go with HTTP server skeleton

- **Purpose**: Entry point for the backend service
- **Steps**:
  1. Create `backend/main.go`
  2. Implement basic HTTP server that:
     - Reads `PORT` from environment (default to 8080)
     - Registers placeholder route for `/generate-audio`
     - Logs startup message
  3. Verify with `go run main.go`
- **Files**:
  - Create: `backend/main.go`
- **Parallel?**: No (depends on T001)
- **Notes**:
  - Use `http.ListenAndServe`
  - Placeholder handler can return 501 Not Implemented for now
  - Example:
    ```go
    package main

    import (
        "fmt"
        "log"
        "net/http"
        "os"
    )

    func main() {
        port := os.Getenv("PORT")
        if port == "" {
            port = "8080"
        }

        http.HandleFunc("/generate-audio", func(w http.ResponseWriter, r *http.Request) {
            http.Error(w, "Not implemented", http.StatusNotImplemented)
        })

        log.Printf("Server starting on port %s", port)
        if err := http.ListenAndServe(":"+port, nil); err != nil {
            log.Fatal(err)
        }
    }
    ```

### Subtask T003 – Create Dockerfile for Cloud Run

- **Purpose**: Container definition for deployment
- **Steps**:
  1. Create `backend/Dockerfile`
  2. Use multi-stage build:
     - Stage 1: Build Go binary
     - Stage 2: Copy binary to minimal image (distroless or alpine)
  3. Verify with `docker build -t audio-guide-api ./backend`
- **Files**:
  - Create: `backend/Dockerfile`
- **Parallel?**: Yes (can be done alongside T002 once T001 is complete)
- **Notes**:
  - Example Dockerfile:
    ```dockerfile
    # Build stage
    FROM golang:1.21-alpine AS builder
    WORKDIR /app
    COPY go.mod ./
    RUN go mod download
    COPY . .
    RUN CGO_ENABLED=0 GOOS=linux go build -o server .

    # Runtime stage
    FROM alpine:3.19
    RUN apk --no-cache add ca-certificates
    WORKDIR /root/
    COPY --from=builder /app/server .
    EXPOSE 8080
    CMD ["./server"]
    ```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Go version mismatch | Specify `go 1.21` in go.mod |
| Docker build fails | Test locally before WP02 |
| PORT not read correctly | Test with `PORT=3000 go run main.go` |

## Definition of Done Checklist

- [ ] `backend/go.mod` exists with Go 1.21+
- [ ] `backend/main.go` compiles without errors
- [ ] Server starts and listens on PORT env var
- [ ] `docker build` succeeds
- [ ] `tasks.md` updated with completion status

## Review Guidance

- Verify Go version in go.mod
- Verify PORT is read from environment, not hardcoded
- Verify Dockerfile uses multi-stage build
- Test: `cd backend && go build && PORT=3000 ./audio-guide-api`

## Activity Log

- 2025-11-25T00:00:00Z – system – lane=planned – Prompt created.
- 2025-11-25T22:08:31Z – claude – shell_pid= – lane=doing – Started implementation
