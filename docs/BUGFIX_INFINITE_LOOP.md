# Bug Fix: Infinite Loop in ConversationWidget

## Issue

**Error**: `Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate.`

**Symptoms**:
- App crashes when navigating to pages with ConversationWidget
- Infinite re-render loop
- Browser becomes unresponsive

## Root Cause

**File**: `packages/conversation-ui/src/hooks/useWebSocket.ts`

**Problem**: Circular dependency in `useEffect` hook (lines 201-209)

```typescript
// BEFORE (BUGGY CODE)
useEffect(() => {
  if (enabled && url) {
    connect();
  }

  return () => {
    disconnect();
  };
}, [enabled, url, connect, disconnect]); // ❌ connect and disconnect in dependencies
```

**Why This Causes Infinite Loop**:

1. `useEffect` runs and calls `connect()`
2. `connect()` has `setConnected` in its dependencies (line 150)
3. When WebSocket connects, it calls `setConnected(true)` (line 62)
4. `setConnected` updates Zustand store, triggering re-render
5. Re-render creates new `connect` function (because `setConnected` changed)
6. New `connect` function triggers `useEffect` again (dependency changed)
7. **INFINITE LOOP!**

**Dependency Chain**:
```
useEffect depends on → connect
connect depends on → setConnected
setConnected changes → triggers re-render
re-render creates new → connect
new connect triggers → useEffect
→ LOOP FOREVER
```

## Solution

**File**: `packages/conversation-ui/src/hooks/useWebSocket.ts` (lines 201-210)

```typescript
// AFTER (FIXED CODE)
useEffect(() => {
  if (enabled && url) {
    connect();
  }

  return () => {
    disconnect();
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [enabled, url]); // ✅ Removed connect/disconnect from dependencies
```

**Why This Works**:

- `useEffect` only re-runs when `enabled` or `url` changes (which is correct)
- `connect` and `disconnect` are created with `useCallback` and use refs, so they're safe to call
- Breaking the circular dependency stops the infinite loop
- The functions still work correctly because they use `socketRef` which persists

## Changes Made

1. **File Modified**: `packages/conversation-ui/src/hooks/useWebSocket.ts`
   - Line 209: Added ESLint disable comment
   - Line 210: Removed `connect` and `disconnect` from dependencies
   - Added explanatory comment

2. **Package Rebuilt**:
   ```bash
   cd packages/conversation-ui
   npm run build
   ```

3. **Workaround Added** (scoring-tool): Created `SafeConversationWidget.tsx` error boundary (can be removed now)

## Testing

### Before Fix:
```
❌ Navigate to Patient Detail → Crash
❌ Navigate to EuroScore Page → Infinite loop
❌ Navigate to STS Page → Infinite loop
```

### After Fix:
```
✅ Navigate to Patient Detail → Works
✅ Navigate to EuroScore Page → Widget loads
✅ Navigate to STS Page → Widget loads
✅ No infinite loop errors
✅ WebSocket connects normally
```

## Related Files

**Bug Fixed In**:
- `/packages/conversation-ui/src/hooks/useWebSocket.ts`

**Workaround (Can Remove)**:
- `/scoring-tool/frontend/src/components/SafeConversationWidget.tsx`
- `/scoring-tool/frontend/src/pages/EuroScorePage.tsx` (SafeConversationWidget wrapper)
- `/scoring-tool/frontend/src/pages/STSScorePage.tsx` (SafeConversationWidget wrapper)

## Future Prevention

To prevent similar issues:

1. **Be Careful with useEffect Dependencies**:
   - Avoid including functions in dependencies if they depend on state
   - Use `useCallback` with stable dependencies
   - Consider using refs for functions that don't need to change

2. **Watch for Circular Dependencies**:
   ```
   useEffect → calls function
   function → updates state
   state update → changes function
   function change → triggers useEffect
   → LOOP!
   ```

3. **Use ESLint Suppressions Carefully**:
   - Only suppress exhaustive-deps when you understand the implications
   - Always add a comment explaining why
   - Document the expected behavior

4. **Test Route Navigation**:
   - Always test navigating between routes
   - Check for infinite loops in React DevTools
   - Watch browser console for warnings

## Rollback Plan

If issues occur, revert with:

```bash
cd packages/conversation-ui
git checkout HEAD~1 src/hooks/useWebSocket.ts
npm run build
```

Or temporarily re-comment the widget in scoring-tool pages.

## Documentation Updates

- Added this bug fix document
- Updated QUICK_REFERENCE.md with troubleshooting
- Will update release notes

---

**Date Fixed**: 2025-11-20
**Fixed By**: Claude Code
**Severity**: Critical (app crash)
**Impact**: All pages using ConversationWidget
**Resolution Time**: ~2 hours (including investigation)
