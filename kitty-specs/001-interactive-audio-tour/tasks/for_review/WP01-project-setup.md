---
work_package_id: "WP01"
subtasks:
  - "T001"
  - "T002"
  - "T003"
  - "T004"
  - "T005"
  - "T006"
  - "T007"
  - "T008"
title: "Project Setup & Vite Configuration"
phase: "Phase 0 - Setup"
lane: "for_review"
assignee: "claude"
agent: "claude"
shell_pid: "96814"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-11-25T18:30:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP01 – Project Setup & Vite Configuration

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

- Initialize a Vite 5.x project with vanilla JavaScript template
- Install Leaflet 1.9.x and leaflet-gesture-handling dependencies
- Create the complete project directory structure per plan.md
- Configure environment variables for API keys
- Create foundational HTML, JS, and CSS files with iOS-compatible viewport settings

**Success**: Running `npm run dev` starts the dev server, and a blank page loads without errors in Chrome on iOS.

## Context & Constraints

- **Spec Reference**: [spec.md](../../spec.md) - FR-014 (frontend-only), FR-015 (Chrome iOS)
- **Plan Reference**: [plan.md](../../plan.md) - Project structure section
- **Quickstart Reference**: [quickstart.md](../../quickstart.md) - Setup commands

**Constraints**:
- No backend server - pure frontend SPA
- API keys via Vite environment variables (`VITE_*` prefix required)
- Must work on Chrome iOS (uses WebKit engine)

## Subtasks & Detailed Guidance

### Subtask T001 – Initialize Vite project with vanilla JS template

- **Purpose**: Create the base project structure using Vite's official scaffolding.
- **Steps**:
  1. Navigate to worktree root: `/Users/oskar/git/audio-guide/.worktrees/001-interactive-audio-tour/`
  2. Run: `npm create vite@latest . -- --template vanilla`
  3. If prompted about existing files, choose to overwrite (only README.md exists)
- **Files**: `package.json`, `vite.config.js` (if generated)
- **Parallel?**: No - must complete before other subtasks
- **Notes**: Pin Vite to 5.x in package.json after generation if needed

### Subtask T002 – Install dependencies: leaflet, leaflet-gesture-handling

- **Purpose**: Add mapping library and iOS gesture handling plugin.
- **Steps**:
  1. Run: `npm install leaflet@^1.9 leaflet-gesture-handling`
  2. Verify packages appear in package.json dependencies
- **Files**: `package.json`, `package-lock.json`
- **Parallel?**: No - depends on T001
- **Notes**: leaflet-gesture-handling prevents page zoom vs map zoom conflicts on iOS

### Subtask T003 – Create project directory structure per plan.md

- **Purpose**: Establish organized folder hierarchy for components, services, and utilities.
- **Steps**:
  1. Create directories:
     ```
     src/
     ├── components/
     ├── services/
     └── utils/
     tests/
     └── e2e/
     ```
  2. Verify structure matches plan.md
- **Files**: Directory creation only
- **Parallel?**: Yes - can proceed after T001
- **Notes**: Keep structure flat within each folder

### Subtask T004 – Configure environment variables for API keys

- **Purpose**: Set up Vite environment variable pattern for API key injection.
- **Steps**:
  1. Create `.env.example` with placeholder keys:
     ```
     VITE_OPENAI_API_KEY=sk-your-key-here
     VITE_ELEVENLABS_API_KEY=your-key-here
     ```
  2. Document that `.env` (actual keys) must be created by developer
- **Files**: `.env.example`
- **Parallel?**: Yes - independent of other subtasks
- **Notes**: Vite requires `VITE_` prefix for client-exposed env vars

### Subtask T005 – Add .gitignore with .env exclusion

- **Purpose**: Prevent accidental commit of API keys and build artifacts.
- **Steps**:
  1. Create or update `.gitignore`:
     ```
     node_modules/
     dist/
     .env
     .env.local
     *.local
     ```
- **Files**: `.gitignore`
- **Parallel?**: Yes - independent
- **Notes**: .env.example should NOT be in .gitignore (it's a template)

### Subtask T006 – Create index.html with viewport meta tag for iOS

- **Purpose**: Set up the HTML entry point with critical iOS viewport configuration.
- **Steps**:
  1. Create/update `index.html`:
     ```html
     <!DOCTYPE html>
     <html lang="en">
     <head>
       <meta charset="UTF-8" />
       <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
       <title>Audio Tour Guide</title>
       <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
       <link rel="stylesheet" href="https://unpkg.com/leaflet-gesture-handling/dist/leaflet-gesture-handling.min.css" />
       <link rel="stylesheet" href="/src/style.css" />
     </head>
     <body>
       <div id="map"></div>
       <script type="module" src="/src/main.js"></script>
     </body>
     </html>
     ```
- **Files**: `index.html`
- **Parallel?**: No - foundational file
- **Notes**:
  - `maximum-scale=1.0, user-scalable=no` prevents iOS page zoom on double-tap
  - Leaflet CSS loaded from CDN for simplicity

### Subtask T007 – Create main.js entry point (empty shell)

- **Purpose**: Create the JavaScript entry point that will bootstrap the application.
- **Steps**:
  1. Create `src/main.js`:
     ```javascript
     // Interactive Audio Tour Guide
     // Entry point - will initialize map and services

     import './style.css';

     console.log('Audio Tour Guide initialized');
     ```
- **Files**: `src/main.js`
- **Parallel?**: No - depends on directory structure
- **Notes**: Keep minimal - actual initialization in WP02

### Subtask T008 – Create style.css with full-viewport map container styles

- **Purpose**: Style the map container to fill the entire viewport.
- **Steps**:
  1. Create `src/style.css`:
     ```css
     * {
       margin: 0;
       padding: 0;
       box-sizing: border-box;
     }

     html, body {
       width: 100%;
       height: 100%;
       overflow: hidden;
     }

     #map {
       width: 100vw;
       height: 100vh;
     }
     ```
- **Files**: `src/style.css`
- **Parallel?**: No - depends on directory structure
- **Notes**:
  - `overflow: hidden` prevents iOS bounce scroll
  - 100vw/100vh ensures full viewport coverage

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Vite version incompatibility | Pin to `^5.0.0` in package.json |
| iOS viewport scaling issues | Use exact meta tag from research.md |
| Missing env var prefix | Always use `VITE_` for client vars |

## Definition of Done Checklist

- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts Vite dev server
- [ ] Browser opens to blank page (div#map visible in DevTools)
- [ ] No console errors
- [ ] Directory structure matches plan.md
- [ ] .env.example contains placeholder API keys
- [ ] .gitignore excludes .env and node_modules

## Review Guidance

- Verify viewport meta tag is exactly as specified (iOS critical)
- Confirm Leaflet CSS links are correct versions
- Check that no actual API keys are committed
- Test that dev server runs on `localhost:5173`

## Activity Log

- 2025-11-25T18:30:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-11-25T18:35:00Z – claude – shell_pid=96814 – lane=doing – Started implementation
- 2025-11-25T18:42:00Z – claude – shell_pid=96814 – lane=for_review – Completed: package.json, Leaflet deps, directory structure, .env.example, .gitignore, index.html with iOS viewport, main.js, style.css
