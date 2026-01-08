#!/bin/bash
# Quick start script for RAG vectorization pipeline

set -e  # Exit on error

echo "=========================================="
echo "RAG Vectorization Pipeline - Quick Start"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp env_template.txt .env
    echo "OK Created .env file"
    echo "  Please review and update if needed"
    echo ""
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR Python 3 is not installed"
    exit 1
fi

echo "Step 1: Installing Python dependencies..."
pip install -r requirements.txt
echo "OK Dependencies installed"
echo ""

echo "Step 2: Setting up database..."
echo "Running SQL setup script..."
psql -h localhost -U postgres -d MJ_TesisYJurisprudencias -f setup_database.sql
echo "OK Database setup complete"
echo ""

echo "Step 3: Vectorizing documents..."
python3 vectorize_tesis.py
echo ""

echo "=========================================="
echo "DONE Setup Complete!"
echo "=========================================="
echo ""
echo "Try querying the database:"
echo "  python3 query_tesis.py"
echo ""
echo "Or run a single query:"
echo "  python3 query_tesis.py \"¿Qué dice sobre el amparo indirecto?\""
echo ""
