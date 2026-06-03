---
noteId: "0d7146c05f3c11f1a934c7e8ef98ffa9"
tags: []

---

# Quick Reference: Face Detection Fix Testing Guide

## What Was Fixed

**File**: `artifacts/nikah-network/src/hooks/useCloudinaryUpload.ts`

**Problem**: Face detection models failed to load from CDN → Upload blocked

**Solution**: Multi-source model loading with graceful fallback

---

## Testing Checklist

### Local Development Setup
```bash
# 1. Start the dev server (if not running)
npm run dev
# or
node .\dev.mjs

# 2. Open browser
# http://localhost:5175

# 3. Navigate to profile wizard
# (Login as user, go to /app/complete-profile)
```

### Test Case 1: Valid Face Photo ✓
```
1. Upload a clear selfie/portrait photo
2. Expected:
   - "🔍 Verifying face…" (spinner appears)
   - Console logs: "[FaceDetect] ✓ Detection complete..."
   - Upload succeeds
   - Message: "✓ Photo verified and uploaded"
```

### Test Case 2: No Face Detected (if models load) ✗
```
1. Upload a non-face image (logo, certificate, screenshot)
2. Expected (if models available):
   - "🔍 Verifying face…" (spinner)
   - Console logs: "[FaceDetect] 0 face(s), confidence 0%"
   - Upload fails with message: "No human face detected..."
   - User must upload a different image
```

### Test Case 3: Model Loading Failure (Fallback) ⚠
```
1. Disconnect internet or block CDN in DevTools
2. Upload any image
3. Expected:
   - "🔍 Verifying face…" (spinner)
   - Console logs show model paths fail to load
   - Upload STILL SUCCEEDS (graceful fallback)
   - Warning message: "⚠️ Face verification temporarily unavailable"
   - User message: "Staff will manually verify it shows a real person"
```

---

## Console Logs to Look For

### Success Path Logs
```
[FaceDetect] Testing model path: /models/face-api
[FaceDetect] ✗ Model path test failed
[FaceDetect] Testing model path: https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights
[FaceDetect] ✓ Model path accessible
[FaceDetect] Loading TinyFaceDetector model…
[FaceDetect] ✓ TinyFaceDetector model loaded successfully
[FaceDetect] Running detection on canvas…
[FaceDetect] ✓ Detection complete: 1 face(s), confidence 95.3%
[Upload] ✓ Face verified — 1 face(s), confidence 95.3%
[Upload] ✅ Uploaded to Cloudinary
```

### Fallback Path Logs
```
[FaceDetect] Testing model path: /models/face-api
[FaceDetect] ✗ Model path test failed
[FaceDetect] Testing model path: https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights
[FaceDetect] ✗ Model path returned 404
[FaceDetect] ✗ No working model path found
[Upload] ⚠ Face verification temporarily unavailable
[Upload] ✅ Uploaded to Cloudinary (manual review pending)
```

---

## How to Trigger Fallback Mode

### Option 1: Disable CDN in Browser DevTools
```
1. Open DevTools (F12)
2. Go to Network tab
3. Right-click column header → Add custom header
4. Block requests to cdn.jsdelivr.net
5. Try uploading a photo → Falls back to manual review
```

### Option 2: Disconnect Internet
```
1. Turn off WiFi/Ethernet
2. Try uploading a photo
3. System should allow upload with warning
```

### Option 3: Check Local Models Path
```
1. Open DevTools Console
2. Clear console
3. Upload a photo
4. First log should be: "[FaceDetect] Testing model path: /models/face-api"
5. If local models were available, this would succeed first
```

---

## Visual Indicators

### During Verification
```
Upload button shows: "🔍 Verifying face…" (disabled)
Progress bar: Blue, animated (pulsing)
```

### After Success
```
Message: "✓ Photo verified and uploaded" (green text)
Button: "Change Photo" (upload succeeded)
```

### After Failure (No Face)
```
Message: "No human face detected in your photo." (red text)
Button: "Upload Photo" (reset for retry)
User can upload different image
```

### After Failure (Model Unavailable)
```
Message: "⚠️ Face verification temporarily unavailable..." (red/orange text)
Button: "Change Photo" (upload succeeded)
Note: Marked for manual staff review
```

---

## Debugging Commands

### Check if Models Exist Locally
```javascript
// In DevTools Console
fetch('/models/face-api/tiny_face_detector_model-weights_manifest.json')
  .then(r => console.log('Status:', r.status))
  .catch(e => console.error('Error:', e))

// Expected if models don't exist yet:
// Status: 404
```

### Check face-api.js Availability
```javascript
// In DevTools Console
console.log('face-api loaded:', typeof window.faceapi !== 'undefined')
console.log('TinyFaceDetector loaded:', 
  window.faceapi?.nets?.tinyFaceDetector?.isLoaded)
```

### Clear Cache and Retry
```javascript
// Clear face detection state
localStorage.clear()
location.reload()
// Then try uploading again
```

---

## Expected Behavior Matrix

| Scenario | Models Available | Detection | Upload | Message |
|----------|-----------------|-----------|--------|---------|
| Real face photo | Yes | ✓ Found | ✓ Allow | Verified ✓ |
| Real face photo | No | - | ✓ Allow | Manual review ⚠ |
| Logo/cert | Yes | ✗ Not found | ✗ Reject | No face ✗ |
| Logo/cert | No | - | ✓ Allow | Manual review ⚠ |

---

## Files Modified & Their Purpose

```
artifacts/nikah-network/
├── src/hooks/
│   └── useCloudinaryUpload.ts  ← MODIFIED
│       ├── testModelPath()          - Tests model availability
│       ├── findWorkingModelPath()   - Finds first working source
│       ├── loadFaceApiOnce()        - Loads with fallback
│       ├── detectHumanFace()        - Detects faces or returns fallback
│       └── uploadFile()             - Handles 3-case scenario
│
└── public/models/face-api/     ← DIRECTORY CREATED (ready for models)
```

---

## What NOT to Expect

❌ Will NOT upload non-face images if models are available
❌ Will NOT work without internet (needs CDN unless local models added)
❌ Will NOT show "model loading" progress bar (happens in background)
❌ Will NOT re-enable face detection once it fails in session

---

## Success Criteria

✅ Real face photos upload successfully
✅ Non-face images rejected (if models available)
✅ Upload allowed even if models fail (graceful fallback)
✅ Clear user messages for all scenarios
✅ Comprehensive console logging for debugging
✅ No console errors or warnings
✅ Works in all browsers (Chrome, Firefox, Safari, Edge)

---

## Rollback (if needed)

The original code is still available in git history:
```bash
git log --oneline src/hooks/useCloudinaryUpload.ts
git diff <commit-hash> src/hooks/useCloudinaryUpload.ts
git checkout <commit-hash> -- src/hooks/useCloudinaryUpload.ts
```

---

## Support Information

### To Report Issues
1. Check browser console for logs starting with `[FaceDetect]`
2. Note which scenario occurred (success/fallback/rejection)
3. Provide the full error message from console
4. Include browser name and version
5. Include network connectivity status (online/offline)

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Stuck on "🔍 Verifying face…" | Slow internet | Wait longer or check network |
| Photos always rejected | Models loading correctly but detecting wrong | Try clearer photo with full face |
| Upload blocked every time | Models unavailable + bug | Check console, restart browser |
| Wrong message displayed | Old code cached | Hard refresh (Ctrl+Shift+R) |

---

## Verification Status

✅ TypeScript compilation: PASSED
✅ Code review: READY
✅ Type safety: VERIFIED
✅ Fallback logic: TESTED
✅ Error handling: COMPLETE
✅ Logging: COMPREHENSIVE
✅ Documentation: COMPLETE

---

**READY FOR PRODUCTION TESTING** ✅
