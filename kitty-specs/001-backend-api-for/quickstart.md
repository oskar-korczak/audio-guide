# Quickstart: Backend API for Audio Generation

## Prerequisites

- Go 1.23+
- GCP account with billing enabled
- `gcloud` CLI installed and authenticated
- OpenAI API key
- ElevenLabs API key

## Local Development

### 1. Clone and navigate to backend

```bash
cd /Users/oskar/git/audio-guide/.worktrees/001-backend-api-for
mkdir -p backend
cd backend
```

### 2. Initialize Go module

```bash
go mod init audio-guide-api
```

### 3. Set environment variables

```bash
export OPENAI_API_KEY="sk-..."
export ELEVENLABS_API_KEY="..."
```

### 4. Run locally

```bash
go run main.go
```

Server starts at `http://localhost:8080`

### 5. Test the endpoint

```bash
curl -X POST http://localhost:8080/generate-audio \
  -H "Content-Type: application/json" \
  -d '{"name":"Eiffel Tower","category":"landmark","latitude":48.8584,"longitude":2.2945}' \
  --output test.mp3
```

## GCP Cloud Run Deployment

### 1. Enable Cloud Run API

```bash
gcloud services enable run.googleapis.com
```

### 2. Deploy

```bash
cd backend

gcloud run deploy audio-guide-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "OPENAI_API_KEY=$OPENAI_API_KEY,ELEVENLABS_API_KEY=$ELEVENLABS_API_KEY" \
  --memory 256Mi \
  --timeout 120 \
  --max-instances 1
```

### 3. Get the deployed URL

```bash
gcloud run services describe audio-guide-api --region us-central1 --format 'value(status.url)'
```

### 4. Test deployed endpoint

```bash
curl -X POST https://audio-guide-api-xxx-uc.a.run.app/generate-audio \
  -H "Content-Type: application/json" \
  -d '{"name":"Eiffel Tower","category":"landmark","latitude":48.8584,"longitude":2.2945}' \
  --output test.mp3
```

## Frontend Integration

### 1. Update frontend environment

Add to `.env`:
```
VITE_BACKEND_URL=https://audio-guide-api-xxx-uc.a.run.app
```

### 2. Remove old API keys

Remove from `.env`:
```
# DELETE THESE LINES
VITE_OPENAI_API_KEY=...
VITE_ELEVENLABS_API_KEY=...
```

### 3. Update service calls

Replace `src/services/openai.js` and `src/services/elevenlabs.js` with single `src/services/audioApi.js`:

```javascript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export async function generateAudioGuide(attraction, signal) {
  const response = await fetch(`${BACKEND_URL}/generate-audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: attraction.name,
      category: attraction.category,
      latitude: attraction.latitude,
      longitude: attraction.longitude
    }),
    signal
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate audio');
  }

  return response.blob();
}
```

## Verification Checklist

- [ ] Backend runs locally and returns audio
- [ ] Backend deployed to Cloud Run
- [ ] Frontend calls backend instead of direct APIs
- [ ] No API keys in browser network tab
- [ ] No API keys in frontend source code
- [ ] Audio plays correctly in browser
