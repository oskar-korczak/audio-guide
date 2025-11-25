---
work_package_id: "WP09"
subtasks:
  - "T068"
  - "T069"
  - "T070"
  - "T071"
  - "T072"
  - "T073"
  - "T074"
  - "T075"
  - "T076"
  - "T077"
title: "Polish & Validation"
phase: "Phase 4 - Validation"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-11-25T18:30:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP09 – Polish & Validation

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

- Validate all success criteria from spec.md
- Verify quickstart.md testing checklist
- Performance and memory audits
- Final code cleanup

**Success**: All success criteria (SC-001 through SC-010) pass, quickstart.md manual testing checklist complete, app performs well on iOS Chrome.

## Context & Constraints

- **Spec Reference**: [spec.md](../../spec.md) - Success Criteria section
- **Quickstart Reference**: [quickstart.md](../../quickstart.md) - Testing Checklist
- **Dependencies**: All previous work packages complete

**Validation Environment**:
- Primary: Chrome on iOS (real device)
- Secondary: Chrome on desktop for development
- Use lighthouse/devtools for performance metrics

## Subtasks & Detailed Guidance

### Subtask T068 – Validate SC-001: Location appears within 5 seconds

- **Purpose**: Verify location performance requirement.
- **Steps**:
  1. Test procedure:
     - Clear site data / use incognito
     - Open app on iOS Chrome
     - Grant location permission when prompted
     - Start timer when permission granted
     - Stop timer when arrow marker appears
  2. Expected: ≤ 5 seconds from permission grant to marker
  3. If failing:
     - Check `enableHighAccuracy` isn't causing delays
     - Consider using first position even with low accuracy
     - Add loading indicator while waiting
  4. Document result:
     ```
     SC-001: Location Display
     - Test date: YYYY-MM-DD
     - Device: iPhone XX, iOS XX
     - Result: PASS/FAIL (Xs)
     - Notes: ...
     ```
- **Files**: Test documentation
- **Parallel?**: Yes - independent validation
- **Notes**: Cold start is worst case; subsequent loads may be faster

### Subtask T069 – Validate SC-002: Attractions load within 3 seconds

- **Purpose**: Verify attraction loading performance.
- **Steps**:
  1. Test procedure:
     - Pan map to new area (clear previous markers)
     - Start timer when map stops moving
     - Stop timer when speaker icons appear
  2. Expected: ≤ 3 seconds from map settle to icons visible
  3. If failing:
     - Check network latency to Overpass API
     - Verify debounce isn't adding too much delay (500ms is fine)
     - Consider parallel fetching or caching
  4. Test in different areas:
     - Dense tourist area (Paris, London)
     - Sparse area (suburbs)
     - Very dense area (central Rome)
- **Files**: Test documentation
- **Parallel?**: Yes - independent validation
- **Notes**: Network conditions vary; test on good wifi

### Subtask T070 – Validate SC-003: Audio generation under 20 seconds

- **Purpose**: Verify end-to-end generation performance.
- **Steps**:
  1. Test procedure:
     - Click on attraction speaker icon
     - Start timer when icon clicked
     - Stop timer when play button appears
  2. Expected: ≤ 20 seconds total for facts + script + audio
  3. Typical breakdown:
     - Facts generation: 2-5 seconds
     - Script generation: 2-5 seconds
     - Audio synthesis: 5-15 seconds
  4. If failing:
     - Check API response times individually
     - Consider shorter scripts (fewer words = faster TTS)
     - Ensure no unnecessary delays between steps
  5. Test multiple attractions to get average
- **Files**: Test documentation
- **Parallel?**: Yes - independent validation
- **Notes**: ElevenLabs is usually the slowest step

### Subtask T071 – Validate SC-004: Map interactions are immediate

- **Purpose**: Verify map responsiveness.
- **Steps**:
  1. Test procedure:
     - Pan map with finger drag
     - Pinch to zoom
     - Check for lag or stuttering
  2. Expected: No perceptible lag, smooth 60fps interactions
  3. If failing:
     - Reduce marker count (< 100)
     - Check for expensive re-renders
     - Verify GestureHandling plugin is working
     - Try `L_DISABLE_3D=true` if rendering issues
  4. Test with many markers visible (~50-100)
- **Files**: Test documentation
- **Parallel?**: Yes - independent validation
- **Notes**: Most important on iOS where performance can vary

### Subtask T072 – Validate SC-005: Audio playback starts within 1 second

- **Purpose**: Verify audio start latency.
- **Steps**:
  1. Test procedure:
     - After generation complete, click play button
     - Start timer when play clicked
     - Stop timer when audio audibly starts
  2. Expected: ≤ 1 second from click to audio
  3. If failing:
     - Ensure audio is unlocked before generation
     - Check blob URL is created correctly
     - Verify no additional processing on play
  4. Test replay as well (should be instant)
- **Files**: Test documentation
- **Parallel?**: Yes - independent validation
- **Notes**: iOS audio unlock must happen first

### Subtask T073 – Test on actual iOS Chrome device (not simulator)

- **Purpose**: Real device validation is critical.
- **Steps**:
  1. Setup:
     - iPhone with Chrome installed
     - Same wifi network as dev machine
     - Run `npm run dev -- --host`
  2. Access via network URL shown in terminal
  3. Test all features:
     - [ ] Location permission prompt
     - [ ] Map pan/zoom
     - [ ] Compass heading (rotate device)
     - [ ] Attraction markers appear
     - [ ] Click marker triggers generation
     - [ ] Progress indicator shows
     - [ ] Audio plays through speakers
     - [ ] Pause/resume works
  4. Note any iOS-specific issues
  5. Test with silent mode on/off
- **Files**: Test documentation
- **Parallel?**: No - requires dedicated test session
- **Notes**: Real device testing is mandatory for this project

### Subtask T074 – Verify all quickstart.md manual testing checklist items

- **Purpose**: Complete systematic testing.
- **Steps**:
  1. Follow quickstart.md testing checklist exactly:
     ```
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
     ```
  2. Mark each item as tested
  3. Document any failures with reproduction steps
- **Files**: Checklist completion in quickstart.md or test report
- **Parallel?**: No - systematic testing
- **Notes**: Every checkbox should be verified

### Subtask T075 – Performance audit: ensure <100 markers, efficient re-renders

- **Purpose**: Verify performance optimizations.
- **Steps**:
  1. Check marker limiting:
     ```javascript
     // In browser console
     console.log(document.querySelectorAll('.attraction-marker').length);
     // Should be ≤ 100
     ```
  2. Profile with Chrome DevTools:
     - Open Performance tab
     - Record while panning map
     - Check for long frames (> 16ms)
     - Look for excessive layout thrashing
  3. Check React/DOM updates:
     - Use Performance monitor for DOM nodes
     - Verify markers aren't being recreated on every update
  4. If issues found:
     - Implement marker clustering for dense areas
     - Optimize update logic (diff, not replace)
     - Reduce CSS animations if causing jank
- **Files**: Performance report
- **Parallel?**: Yes - independent audit
- **Notes**: Mobile performance is more constrained

### Subtask T076 – Memory audit: verify Blob URL cleanup

- **Purpose**: Prevent memory leaks.
- **Steps**:
  1. Test procedure:
     - Open Chrome DevTools Memory tab
     - Take initial heap snapshot
     - Generate audio for 5+ different attractions
     - Take another snapshot
     - Compare for blob URL accumulation
  2. Check for leaks:
     ```javascript
     // In console, search for detached elements
     // Should not see growing list of Audio elements or Blob URLs
     ```
  3. Verify cleanup:
     - Select new attraction → previous blob should be revoked
     - Page unload → all blobs cleaned
  4. If leaks found:
     - Ensure `URL.revokeObjectURL()` called
     - Check for retained references
     - Verify audio element cleanup
- **Files**: Memory report
- **Parallel?**: Yes - independent audit
- **Notes**: iOS has limited memory; leaks cause crashes

### Subtask T077 – Final code cleanup and unused import removal

- **Purpose**: Clean, maintainable codebase.
- **Steps**:
  1. Remove unused imports:
     ```bash
     # Check for unused exports
     npx eslint --no-eslintrc --rule 'no-unused-vars: warn' src/
     ```
  2. Remove console.log statements (except errors):
     ```javascript
     // Keep: console.error, console.warn
     // Remove: console.log (unless debugging)
     ```
  3. Check for commented-out code - remove it
  4. Verify consistent formatting:
     ```bash
     npx prettier --check src/
     ```
  5. Review file structure matches plan.md
  6. Remove any TODO comments that are complete
  7. Ensure all files have appropriate headers/comments
- **Files**: All source files
- **Parallel?**: No - final pass
- **Notes**: Clean code for maintainability

## Validation Summary Template

Create a validation report:

```markdown
# Validation Report: Interactive Audio Tour Guide
Date: YYYY-MM-DD
Tester: [Name]
Device: iPhone [model], iOS [version], Chrome [version]

## Success Criteria Results

| Criteria | Target | Actual | Status |
|----------|--------|--------|--------|
| SC-001 | ≤5s location | Xs | PASS/FAIL |
| SC-002 | ≤3s attractions | Xs | PASS/FAIL |
| SC-003 | ≤20s generation | Xs | PASS/FAIL |
| SC-004 | Immediate interactions | Y/N | PASS/FAIL |
| SC-005 | ≤1s audio start | Xs | PASS/FAIL |
| SC-006 | Continuous playback | Y/N | PASS/FAIL |
| SC-007 | Chrome iOS works | Y/N | PASS/FAIL |
| SC-008 | 10+ attractions/session | Y/N | PASS/FAIL |
| SC-009 | ≤2s heading update | Xs | PASS/FAIL |
| SC-010 | First-time success 90% | Est% | PASS/FAIL |

## Quickstart Checklist

[Include completed checklist]

## Performance Metrics

- Max marker count observed: XX
- Heap memory after 5 generations: XX MB
- Any memory leaks: Y/N

## Issues Found

1. [Issue description, severity, fix status]

## Recommendations

- [Any suggestions for future improvements]
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| iOS device not available | Use BrowserStack or similar |
| API quotas during testing | Use test keys with limits |
| Flaky timing tests | Run multiple times, take average |
| Performance varies by device | Test on target iPhone model |

## Definition of Done Checklist

- [ ] SC-001 through SC-010 validated and documented
- [ ] Quickstart checklist 100% complete
- [ ] Tested on real iOS Chrome device
- [ ] Performance audit shows no major issues
- [ ] Memory audit shows no leaks
- [ ] Code cleanup complete
- [ ] Validation report created
- [ ] All blocking issues resolved

## Review Guidance

- Verify validation was done on real iOS device
- Check timing measurements are realistic
- Confirm all quickstart items marked
- Review validation report for completeness
- Spot-check a few features yourself

## Activity Log

- 2025-11-25T18:30:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
