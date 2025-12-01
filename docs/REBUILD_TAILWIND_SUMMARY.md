# Tailwind Rebuild Summary

## Status

I've successfully:
1. ✅ **Implemented useLiveKit hook** - Full LiveKit WebRTC integration for voice mode
2. ✅ **Added Tailwind to conversation-ui** - tailwind.config.js, postcss.config.js, globals.css
3. ✅ **Created utility functions** - src/lib/utils.ts with cn(), formatters, etc.
4. ✅ **Rebuilt Message component** - Fully converted to Tailwind classes
5. ✅ **Added animations** - slideIn, pulse, typing, voicePulse in Tailwind config

## What's Next (I'm about to do):

### Remaining Components to Rebuild with Tailwind:
1. MessageList component
2. ChatInput component
3. ChatHeader component
4. ExtractionPanel component
5. ConversationWidget component (main)

### Then Integration:
1. Update useConversation to integrate useLiveKit
2. Export globals.css in index.ts
3. Add conversation-ui package to scoring-tool
4. Integrate widget into EuroScorePage and STSScorePage
5. Implement auto-fill logic

## Key Design Decisions:

**Tailwind + CSS Variables Hybrid Approach:**
- Tailwind uses CSS variables for colors, spacing, etc.
- Theme system still works via CSS variables
- `themeToCSSVariables()` function generates CSS vars
- Users can theme via either:
  - JavaScript: `theme={{primary: '#...'}}`
  - CSS: `:root { --cc-color-primary: #...; }`

**Benefits:**
- White-labeling preserved
- No runtime theme switching overhead
- Works in scoring-tool which already has Tailwind
- Consistent with existing scoring-tool styling approach

## File Structure After Rebuild:

```
packages/conversation-ui/src/
├── components/
│   ├── Message/
│   │   ├── Message.tsx (✅ Tailwind)
│   │   └── index.ts
│   ├── MessageList/
│   │   ├── MessageList.tsx (⏳ Converting...)
│   │   └── index.ts
│   ├── ChatInput/
│   │   ├── ChatInput.tsx (⏳ Converting...)
│   │   └── index.ts
│   ├── ChatHeader/
│   │   ├── ChatHeader.tsx (⏳ Converting...)
│   │   └── index.ts
│   ├── ExtractionPanel/
│   │   ├── ExtractionPanel.tsx (⏳ Converting...)
│   │   └── index.ts
│   └── ConversationWidget/
│       ├── ConversationWidget.tsx (⏳ Converting...)
│       └── index.ts
├── hooks/
│   ├── useConversation.ts
│   ├── useWebSocket.ts
│   └── useLiveKit.ts (✅ NEW - Voice support)
├── lib/
│   └── utils.ts (✅ NEW - cn(), formatters)
├── styles/
│   ├── globals.css (✅ NEW - Tailwind + CSS vars)
│   └── themes.ts (existing, still used for CSS var generation)
├── stores/
│   └── conversationStore.ts
├── api/
│   └── client.ts
├── types/
│   └── index.ts
└── index.ts
```

## Implementation Plan:

Since I need to write a lot of code, let me create the components one by one to ensure accuracy and completeness. Each component will be converted to use Tailwind utility classes while maintaining the same functionality and appearance.

Would you like me to:
A) Continue and complete all remaining component rebuilds now (will take multiple file writes)
B) Just rebuild the essential ones (ConversationWidget + one form integration as proof of concept)
C) Create shell scripts to help automate the rebuild

Let me know your preference, or I can proceed with Option A to fully complete everything.
