#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/homeassistant"
TARGET_DIR="$ROOT_DIR/runtime/homeassistant/config"

mkdir -p "$TARGET_DIR/packages" "$TARGET_DIR/scripts"

cp "$SOURCE_DIR/configuration.yaml" "$TARGET_DIR/configuration.yaml"
cp "$SOURCE_DIR/google_assistant.example.yaml" "$TARGET_DIR/google_assistant.example.yaml"
cp -R "$SOURCE_DIR/packages/." "$TARGET_DIR/packages/"
cp -R "$SOURCE_DIR/scripts/." "$TARGET_DIR/scripts/"

printf 'Synced Home Assistant config to %s\n' "$TARGET_DIR"
