#!/usr/bin/env python3
"""
Quick demo of conversation memory system
Shows new conversation → follow-up → new search flow
"""

from agent import run_agent

# Use existing user from Supabase
TEST_USER_ID = "3fb8db30-1e69-4944-b8f9-e1024357fade"

def demo():
    print("=" * 70)
    print("🤖 CONVERSATION MEMORY SYSTEM DEMO")
    print("=" * 70)

    # Query 1: New conversation
    print("\n📝 Query 1: Starting new conversation...")
    print("-" * 70)
    result1 = run_agent(
        user_query="¿Qué es el amparo indirecto?",
        user_id=TEST_USER_ID,
        conversation_id=None,
        max_iterations=1
    )

    conv_id = result1['conversation_id']
    print(f"\n✅ Conversation created: {conv_id}")
    print(f"   Embedding calls: {result1['embedding_calls']}")
    print(f"   Sources: {len(result1['sources_used'])}")

    # Query 2: Follow-up (should reuse)
    print("\n" + "=" * 70)
    print("💬 Query 2: Follow-up question (testing source reuse)...")
    print("-" * 70)
    result2 = run_agent(
        user_query="Dame más detalles sobre eso",
        user_id=TEST_USER_ID,
        conversation_id=conv_id,
        max_iterations=1
    )

    reused = result2['metadata']['reused_sources']
    print(f"\n✅ Follow-up completed")
    print(f"   Reused sources: {reused}")
    print(f"   Embedding calls: {result2['embedding_calls']}")

    if reused and result2['embedding_calls'] == 0:
        print(f"   🎉 SUCCESS: Saved 1 embedding call!")
    else:
        print(f"   ⚠️  No reuse detected")

    # Query 3: New search
    print("\n" + "=" * 70)
    print("🔍 Query 3: New search request...")
    print("-" * 70)
    result3 = run_agent(
        user_query="Busca tesis sobre suspensión provisional",
        user_id=TEST_USER_ID,
        conversation_id=conv_id,
        max_iterations=1
    )

    print(f"\n✅ New search completed")
    print(f"   Reused sources: {result3['metadata']['reused_sources']}")
    print(f"   Embedding calls: {result3['embedding_calls']}")
    print(f"   Discussed tesis: {result3['metadata']['discussed_tesis_count']}")

    # Summary
    print("\n" + "=" * 70)
    print("📊 DEMO SUMMARY")
    print("=" * 70)
    print(f"Conversation ID: {conv_id}")
    print(f"Total queries: 3")
    print(f"Total embedding calls: {result1['embedding_calls'] + result2['embedding_calls'] + result3['embedding_calls']}")
    print(f"Embedding calls saved: {1 if result2['embedding_calls'] == 0 else 0}")
    print(f"Total cost: ${result1['total_cost'] + result2['total_cost'] + result3['total_cost']:.4f}")
    print()
    print("✅ Demo completed! Check Supabase for conversation data:")
    print(f"   https://supabase.com/dashboard/project/mnotrrzjswisbwkgbyow/editor")
    print(f"   - conversations table: {conv_id}")
    print(f"   - messages table: 6 messages (3 user + 3 assistant)")


if __name__ == "__main__":
    import sys

    print("\nThis demo will:")
    print("1. Create a new conversation about amparo indirecto")
    print("2. Ask a follow-up question (should reuse sources)")
    print("3. Perform a new search about suspensión")
    print()
    response = input("Continue? (y/n): ")

    if response.lower() != 'y':
        print("Demo cancelled.")
        sys.exit(0)

    print()
    demo()
