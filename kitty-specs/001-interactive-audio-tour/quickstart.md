# Quickstart Guide: Interactive Audio Tour Guide
*Path: kitty-specs/001-interactive-audio-tour/quickstart.md*

## Prerequisites

- Node.js 18+ installed
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))
- ElevenLabs API key ([get one here](https://elevenlabs.io/))
- Modern browser (Chrome on iOS for testing target)

## Quick Setup

### 1. Clone and Install

```bash
cd /Users/oskar/git/audio-guide/.worktrees/001-interactive-audio-tour
npm install
```

### 2. Configure Environment Variables

Create `.env` file in project root:

```bash
# .env (do not commit this file)
VITE_OPENAI_API_KEY=sk-your-openai-key-here
VITE_ELEVENLABS_API_KEY=your-elevenlabs-key-here
```

### 3. Start Development Server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### 4. Test on iOS

For iOS Chrome testing:
1. Ensure your dev machine and iPhone are on the same network
2. Run `npm run dev -- --host`
3. Open the displayed network URL on your iPhone's Chrome browser
4. Grant location permissions when prompted

---

## Project Structure

```
/
├── src/
│   ├── index.html         # Main HTML
│   ├── main.js            # Entry point
│   ├── style.css          # Styles
│   ├── components/        # UI components
│   ├── services/          # API integrations
│   └── utils/             # Helpers
├── tests/
│   └── e2e/               # Playwright tests
├── .env                   # API keys (gitignored)
├── package.json
└── vite.config.js
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run Playwright E2E tests |
| `npm run test:ui` | Run tests with Playwright UI |

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_OPENAI_API_KEY` | Yes | OpenAI API key for content generation |
| `VITE_ELEVENLABS_API_KEY` | Yes | ElevenLabs API key for TTS |

Access in code:
```javascript
const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
const elevenlabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
```

---

## Testing Checklist

### Manual Testing

1. **Location Permission**
   - [ ] App requests location permission on load
   - [ ] User marker appears at current location
   - [ ] Arrow shows compass heading (if available)

2. **Map Interaction**
   - [ ] Map pans smoothly
   - [ ] Pinch-to-zoom works on iOS Chrome
   - [ ] Attractions load when map stops moving

3. **Audio Generation**
   - [ ] Click attraction shows loading state
   - [ ] Audio generates and play button appears
   - [ ] Play/pause controls work
   - [ ] Audio plays through device speakers

### Playwright Tests

```bash
# Run all tests
npm run test

# Run specific test file
npx playwright test tests/e2e/map.spec.js

# Run with headed browser
npx playwright test --headed

# Debug mode
npx playwright test --debug
```

---

## Common Issues

### Location not working
- Ensure HTTPS (or localhost)
- Check browser location permissions
- Try refreshing the page

### Audio not playing on iOS
- Audio requires user interaction first
- Click any attraction to unlock audio
- Check silent mode is off

### API errors
- Verify API keys in `.env`
- Check API key quotas/limits
- Look at browser console for details

### Map not loading
- Check network connectivity
- Verify OpenStreetMap tiles are accessible
- Clear browser cache

---

## API Usage Costs

**OpenAI (gpt-4o-mini):**
- ~$0.0002 per attraction (negligible)

**ElevenLabs:**
- ~$0.18 per attraction
- Free tier: ~16 audio guides/month

---

## Next Steps

1. Read [spec.md](spec.md) for full requirements
2. Review [research.md](research.md) for technical decisions
3. Check [data-model.md](data-model.md) for entity definitions
4. See `contracts/` for API integration details
