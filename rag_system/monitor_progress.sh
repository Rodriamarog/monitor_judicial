#!/bin/bash
# Monitor embedding generation progress

echo "=========================================="
echo "  Embedding Generation Progress Monitor"
echo "=========================================="
echo ""

TARGET=32288

while true; do
    # Get current count and last inserted time
    RESULT=$(psql -d legal_rag -t -c "SELECT COUNT(*), MAX(created_at) FROM tesis_embeddings;")
    COUNT=$(echo $RESULT | awk '{print $1}')
    LAST_TIME=$(echo $RESULT | awk '{print $2, $3}')

    # Calculate progress
    PERCENT=$(echo "scale=2; ($COUNT / $TARGET) * 100" | bc)
    REMAINING=$((TARGET - COUNT))

    # Clear line and print progress
    echo -ne "\r\033[K"
    echo -ne "📊 Progress: $COUNT / $TARGET ($PERCENT%) | Remaining: $REMAINING | Last: $LAST_TIME"

    # Check if done
    if [ $COUNT -ge $TARGET ]; then
        echo ""
        echo ""
        echo "✅ Complete! All $TARGET documents embedded!"
        break
    fi

    sleep 10
done
