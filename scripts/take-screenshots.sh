#!/bin/bash

# App Store Screenshots Script
# This script takes screenshots on iPhone 15 Pro Max simulator

SIMULATOR_NAME="iPhone 15 Pro Max"
SIMULATOR_ID="50430158-947C-4908-B631-37E21072772D"
SCREENSHOT_DIR="$(dirname "$0")/../screenshots"
BUNDLE_ID="org.reactjs.native.example.subscription"

echo "📱 App Store Screenshot Generator"
echo "=================================="

# Create screenshot directory
mkdir -p "$SCREENSHOT_DIR"

# Boot simulator if not running
echo "🚀 Starting simulator: $SIMULATOR_NAME"
xcrun simctl boot "$SIMULATOR_ID" 2>/dev/null || true

# Wait for simulator to boot
echo "⏳ Waiting for simulator to boot..."
xcrun simctl bootstatus "$SIMULATOR_ID" -b

# Open Simulator app
open -a Simulator

echo "⏳ Waiting for Simulator window..."
sleep 3

# Check if app is installed
if ! xcrun simctl listapps "$SIMULATOR_ID" 2>/dev/null | grep -q "$BUNDLE_ID"; then
    echo "⚠️  App not installed. Please build and run the app first:"
    echo "   cd $(dirname "$0")/.."
    echo "   npx react-native run-ios --simulator=\"$SIMULATOR_NAME\""
    exit 1
fi

# Launch the app
echo "📲 Launching app..."
xcrun simctl launch "$SIMULATOR_ID" "$BUNDLE_ID"
sleep 3

# Function to take screenshot
take_screenshot() {
    local name=$1
    local filename="$SCREENSHOT_DIR/${name}.png"
    echo "📸 Taking screenshot: $name"
    xcrun simctl io "$SIMULATOR_ID" screenshot "$filename"
    echo "   Saved: $filename"
}

echo ""
echo "📸 Ready to take screenshots!"
echo "=================================="
echo ""
echo "Navigate to each screen in the simulator and press Enter to capture:"
echo ""

read -p "1. Dashboard screen ready? Press Enter to capture... "
take_screenshot "01_dashboard"

read -p "2. Subscription list ready? Press Enter to capture... "
take_screenshot "02_subscription_list"

read -p "3. Subscription detail ready? Press Enter to capture... "
take_screenshot "03_subscription_detail"

read -p "4. Insights screen ready? Press Enter to capture... "
take_screenshot "04_insights"

read -p "5. Add subscription screen ready? Press Enter to capture... "
take_screenshot "05_add_subscription"

echo ""
echo "✅ Screenshots saved to: $SCREENSHOT_DIR"
echo ""
echo "📐 App Store Screenshot Sizes:"
echo "   6.7\" display (required): 1290 x 2796 px"
echo "   6.5\" display (required): 1284 x 2778 px"
echo "   5.5\" display (optional): 1242 x 2208 px"
echo ""
ls -la "$SCREENSHOT_DIR"
