---
work_package_id: "WP04"
subtasks:
  - "T015"
  - "T016"
  - "T017"
title: "Cloud Run Deployment"
phase: "Phase 3 - Deployment"
lane: "planned"
assignee: ""
agent: ""
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

# Work Package Prompt: WP04 – Cloud Run Deployment

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

- Deploy Go backend to GCP Cloud Run
- Configure API keys securely as environment variables
- Verify deployed endpoint responds correctly
- **Success**: `curl https://[deployed-url]/health` returns `{"status":"ok"}`; audio generation works

## Context & Constraints

- **Reference**: `kitty-specs/001-backend-api-for/research.md` for Cloud Run configuration
- **Reference**: `kitty-specs/001-backend-api-for/quickstart.md` for deployment commands

**Cloud Run Configuration** (from research.md):
- Memory: 256MB
- CPU: 1 vCPU
- Timeout: 120 seconds
- Min instances: 0 (scale to zero)
- Max instances: 1 (limit costs)
- Region: us-central1

**Prerequisites**:
- GCP account with billing enabled
- `gcloud` CLI installed and authenticated
- Cloud Run API enabled
- OPENAI_API_KEY and ELEVENLABS_API_KEY available

## Subtasks & Detailed Guidance

### Subtask T015 – Deploy to GCP Cloud Run

- **Purpose**: Get the backend running in production
- **Steps**:
  1. Ensure gcloud is authenticated:
     ```bash
     gcloud auth login
     gcloud config set project YOUR_PROJECT_ID
     ```
  2. Enable Cloud Run API (if not already):
     ```bash
     gcloud services enable run.googleapis.com
     ```
  3. Deploy from source:
     ```bash
     cd backend
     gcloud run deploy audio-guide-api \
       --source . \
       --region us-central1 \
       --allow-unauthenticated \
       --memory 256Mi \
       --timeout 120 \
       --max-instances 1
     ```
  4. Note the deployed URL from output (e.g., `https://audio-guide-api-xxx-uc.a.run.app`)
- **Files**:
  - No file changes
- **Parallel?**: No (sequential deployment)
- **Notes**:
  - First deploy may take a few minutes for container build
  - `--source .` builds the Dockerfile automatically
  - `--allow-unauthenticated` makes it public (matches current frontend behavior)

### Subtask T016 – Configure environment variables

- **Purpose**: Securely set API keys in Cloud Run
- **Steps**:
  1. Set environment variables:
     ```bash
     gcloud run services update audio-guide-api \
       --region us-central1 \
       --set-env-vars "OPENAI_API_KEY=$OPENAI_API_KEY,ELEVENLABS_API_KEY=$ELEVENLABS_API_KEY"
     ```
  2. Alternatively, combine with initial deploy:
     ```bash
     gcloud run deploy audio-guide-api \
       --source . \
       --region us-central1 \
       --allow-unauthenticated \
       --set-env-vars "OPENAI_API_KEY=$OPENAI_API_KEY,ELEVENLABS_API_KEY=$ELEVENLABS_API_KEY" \
       --memory 256Mi \
       --timeout 120 \
       --max-instances 1
     ```
  3. Verify variables are set (without showing values):
     ```bash
     gcloud run services describe audio-guide-api --region us-central1 --format='value(spec.template.spec.containers[0].env)'
     ```
- **Files**:
  - No file changes
- **Parallel?**: No (must follow T015)
- **Notes**:
  - API keys are stored securely in Cloud Run, not in code
  - For enhanced security, consider using Secret Manager (optional)
  - Be careful not to commit API keys to shell history

### Subtask T017 – Verify deployed endpoint works

- **Purpose**: Confirm production deployment is functional
- **Steps**:
  1. Get deployed URL:
     ```bash
     gcloud run services describe audio-guide-api --region us-central1 --format 'value(status.url)'
     ```
  2. Test health endpoint:
     ```bash
     curl https://[deployed-url]/health
     # Expected: {"status":"ok"}
     ```
  3. Test audio generation:
     ```bash
     curl -X POST https://[deployed-url]/generate-audio \
       -H "Content-Type: application/json" \
       -d '{"name":"Eiffel Tower","category":"landmark","latitude":48.8584,"longitude":2.2945}' \
       --output test.mp3
     ```
  4. Verify test.mp3:
     - Check file size is > 0 bytes
     - Play audio file to confirm content
  5. Record the deployed URL for WP05 (frontend integration)
- **Files**:
  - No file changes
- **Parallel?**: No (must follow T015, T016)
- **Notes**:
  - First request may be slow (cold start, up to 90s)
  - Subsequent requests should be faster
  - If audio generation fails, check Cloud Run logs:
    ```bash
    gcloud run services logs read audio-guide-api --region us-central1
    ```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| GCP billing not enabled | Enable billing before deployment |
| API keys exposed in logs | Never log API keys; check gcloud command history |
| Cold start timeout | 120s timeout should be sufficient; monitor logs |
| Exceeded free tier | Max 1 instance limits costs |

## Definition of Done Checklist

- [ ] Backend deployed to Cloud Run
- [ ] API keys configured as environment variables
- [ ] Health endpoint responds with `{"status":"ok"}`
- [ ] Audio generation produces valid MP3
- [ ] Deployed URL recorded for WP05
- [ ] `tasks.md` updated with completion status

## Review Guidance

- Verify service is publicly accessible (--allow-unauthenticated)
- Verify API keys are set but not visible in logs
- Test from different network to confirm public access
- Check Cloud Run logs for any startup errors
- Verify cold start completes within acceptable time

## Activity Log

- 2025-11-25T00:00:00Z – system – lane=planned – Prompt created.
