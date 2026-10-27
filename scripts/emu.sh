#!/usr/bin/env bash
# scripts/emu.sh
# Android emulator helper scripts for SaHaay testing and demonstrations.
# Usage: ./scripts/emu.sh [command]

set -euo pipefail

COMMAND="${1:-help}"

case "$COMMAND" in
  # 1. Inject GPS fix for Ahmedabad
  geo)
    LAT="${2:-23.0225}"
    LON="${3:-72.5714}"
    echo "📍 Injecting GPS location: $LAT, $LON..."
    adb emu geo fix "$LON" "$LAT"
    ;;

  # 2. Simulate 3G vehicular crash impact on accelerometer (z-axis = 30 m/s^2 approx 3.06g)
  crash)
    echo "💥 Injecting 3G crash impact on accelerometer sensor..."
    adb emu sensor set acceleration 0:0:30
    sleep 0.2
    echo "🛑 Injecting post-impact stillness (1g resting gravity on z-axis)..."
    adb emu sensor set acceleration 0:0:9.81
    ;;

  # 3. Simulate phone drop (short spike, no stillness)
  drop)
    echo "📱 Simulating phone drop spike..."
    adb emu sensor set acceleration 0:0:35
    sleep 0.04
    adb emu sensor set acceleration 0:15:9.81
    ;;

  # 4. Simulate inbound SMS token
  sms)
    TOKEN="${2:-S1|k2m9x|77ov8|21v7k|1y3k9|0a|0|3f}"
    SENDER="${3:-+919876543210}"
    echo "📨 Sending simulated SMS from $SENDER..."
    adb emu sms send "$SENDER" "$TOKEN"
    ;;

  # 5. Capture screenshot from emulator
  screencap)
    OUT_FILE="${2:-/tmp/sahaay-screenshot.png}"
    echo "📸 Capturing emulator screenshot to $OUT_FILE..."
    adb exec-out screencap -p > "$OUT_FILE"
    echo "Screenshot saved: $OUT_FILE"
    ;;

  # 6. Stream React Native logs
  logcat)
    echo "📜 Streaming ReactNativeJS logcat output..."
    adb logcat -s ReactNativeJS
    ;;

  *)
    echo "SaHaay Emulator Test Helper"
    echo "Usage: $0 {geo [lat] [lon] | crash | drop | sms [token] [sender] | screencap [path] | logcat}"
    exit 1
    ;;
esac
