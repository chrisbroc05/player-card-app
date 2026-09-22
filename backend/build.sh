#!/usr/bin/env bash
set -euo pipefail

if command -v apt-get >/dev/null 2>&1; then
  apt-get update
  apt-get install -y fonts-dejavu-core fonts-liberation
fi

pip install -r requirements.txt
