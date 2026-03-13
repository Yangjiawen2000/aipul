#!/bin/bash

# AI Pulse 2025 Desktop Launcher
# This script opens the dashboard in a compact, widget-like Chrome-based app window.
# Note: Requires Google Chrome or Microsoft Edge installed.

APP_URL="file:///Users/yangjiawen/Desktop/ai-pulse-2025/index.html?mode=widget"
WINDOW_SIZE="400,600"

# Try Chrome
if [ -d "/Applications/Google Chrome.app" ]; then
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --app="$APP_URL" --window-size="$WINDOW_SIZE" --user-data-dir="/tmp/ai-pulse-widget"
# Try Edge
elif [ -d "/Applications/Microsoft Edge.app" ]; then
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" --app="$APP_URL" --window-size="$WINDOW_SIZE" --user-data-dir="/tmp/ai-pulse-widget"
else
    echo "No compatible browser found. Opening in default browser..."
    open "$APP_URL"
fi
