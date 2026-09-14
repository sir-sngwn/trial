#!/usr/bin/env bash
# StudyNotion Start Script
# Runs local lightweight Python server and opens default web browser

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=================================================="
echo "  📚 StudyNotion을 시작합니다..."
echo "=================================================="

# Check python3
if ! command -v python3 &> /dev/null; then
    echo "❌ 오류: python3가 설치되어 있지 않습니다."
    exit 1
fi

# Run python server (automatically opens default browser)
python3 app.py

