"""
Test script for conversation memory system
Demonstrates creating conversations and handling follow-up queries
"""

from agent import run_agent
import uuid

print("=" * 70)
print("TESTING CONVERSATION MEMORY SYSTEM")
print("=" * 70)

# Generate a test user ID (in production, this would come from Supabase auth)
test_user_id = str(uuid.uuid4())
print(f"\nTest User ID: {test_user_id}")

# Test 1: Create new conversation
print("\n" + "=" * 70)
print("TEST 1: New Conversation")
print("=" * 70)

result1 = run_agent(
    user_query="¿Qué es el amparo indirecto?",
    user_id=test_user_id,
    conversation_id=None,  # New conversation
    max_iterations=2
)

conv_id = result1['conversation_id']
print(f"\n✓ Created conversation: {conv_id}")
print(f"  - Embedding calls: {result1['embedding_calls']}")
print(f"  - Sources used: {len(result1['sources_used'])}")
print(f"  - Cost: ${result1['total_cost']:.4f}")

# Test 2: Follow-up query (should reuse sources)
print("\n" + "=" * 70)
print("TEST 2: Follow-up Query (REUSE Intent)")
print("=" * 70)

result2 = run_agent(
    user_query="Explica más sobre eso",
    user_id=test_user_id,
    conversation_id=conv_id,  # Continue conversation
    max_iterations=2
)

print(f"\n✓ Continued conversation: {result2['conversation_id']}")
print(f"  - Embedding calls: {result2['embedding_calls']}")
print(f"  - Reused sources: {result2['metadata']['reused_sources']}")
print(f"  - Discussed tesis count: {result2['metadata']['discussed_tesis_count']}")
print(f"  - Total messages: {result2['metadata']['total_messages']}")
print(f"  - Cost: ${result2['total_cost']:.4f}")

if result2['metadata']['reused_sources']:
    print("\n  🎉 SUCCESS: Agent reused historical sources (0 embedding calls saved!)")
else:
    print("\n  ⚠️  Agent performed new search instead of reusing")

# Test 3: Explicit new search
print("\n" + "=" * 70)
print("TEST 3: Explicit New Search")
print("=" * 70)

result3 = run_agent(
    user_query="Busca tesis sobre suspensión provisional",
    user_id=test_user_id,
    conversation_id=conv_id,  # Same conversation
    max_iterations=2
)

print(f"\n✓ Continued conversation: {result3['conversation_id']}")
print(f"  - Embedding calls: {result3['embedding_calls']}")
print(f"  - Reused sources: {result3['metadata']['reused_sources']}")
print(f"  - New search performed: {not result3['metadata']['reused_sources']}")
print(f"  - Cost: ${result3['total_cost']:.4f}")

if not result3['metadata']['reused_sources']:
    print("\n  ✓ Correctly performed new search due to 'busca' keyword")

# Summary
print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
print(f"Conversation ID: {conv_id}")
print(f"Total queries: 3")
print(f"Total cost: ${result1['total_cost'] + result2['total_cost'] + result3['total_cost']:.4f}")
print(f"Total embedding calls: {result1['embedding_calls'] + result2['embedding_calls'] + result3['embedding_calls']}")
print("\nConversation saved to Supabase:")
print(f"  - Check conversations table for ID: {conv_id}")
print(f"  - Check messages table for conversation messages")
print(f"  - Sources saved in JSONB format")

print("\n" + "=" * 70)
print("✓ All tests completed!")
print("=" * 70)
