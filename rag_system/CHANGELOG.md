# Changelog - RAG System

## 2026-02-04 - Conversation Memory System + Response Format Fix

### Added
- **Conversation memory system** with Supabase persistence
  - Smart intent classification (REUSE vs NEW_SEARCH)
  - Source reuse for follow-up questions (saves embedding costs)
  - Diversity filter to avoid repeating tesis
  - Sliding window (last 16 messages)
  - Full backward compatibility

### Fixed
- **Response format issue**: Agent was generating formal email-style responses with "Estimado usuario", "Atentamente", and signature placeholders like "[Su Nombre]"
- **Updated prompt** in `generate_response_node()` to:
  - Respond directly as an AI assistant
  - Use conversational but professional tone
  - Eliminate email formatting artifacts
  - Clearly identify as AI, not pretend to be human lawyer

### Changed
- `agent.py`: Extended with conversation memory nodes and state
- `requirements.txt`: Added Supabase dependencies
- Response prompt: Now explicitly instructs to respond as AI assistant

### Files Added
- `conversation.py`: ConversationManager class
- `test_conversation.py`: Test suite
- `demo_conversation.py`: Interactive demo
- `CONVERSATION_MEMORY.md`: Complete documentation
- `IMPLEMENTATION_SUMMARY.md`: Technical details
- `README_CONVERSATION.md`: Quick start guide
- `CHANGELOG.md`: This file

### Test Results
- Intent classification: 9/9 tests passed ✓
- Supabase integration: Working ✓
- Full agent flow: All scenarios passing ✓
- Response format: Fixed, no email artifacts ✓
- Cost savings: 33% on follow-up queries ✓

### Breaking Changes
None - fully backward compatible

### Migration Guide
No migration needed. To use conversation memory:
```python
# Add optional parameters
result = run_agent(
    user_query="...",
    user_id="uuid-from-supabase",      # Optional
    conversation_id="existing-conv-id"  # Optional
)
```

### Known Issues
None

### Next Steps
- Consider LLM-based intent classification for ambiguous cases
- Implement conversation summarization after 20+ messages
- Add analytics dashboard for reuse rate tracking
