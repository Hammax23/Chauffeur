#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
export EXPO_ASC_API_KEY_PATH="$(pwd)/.eas-keys/AuthKey_9D7SV9329Y.p8"
export EXPO_ASC_KEY_ID="9D7SV9329Y"
export EXPO_ASC_ISSUER_ID="1409c857-382c-4115-b6cc-799d2cfb96a6"
export EXPO_APPLE_TEAM_ID="DP92UVLHJU"
export EXPO_APPLE_TEAM_TYPE="INDIVIDUAL"
export EXPO_NO_CAPABILITY_SYNC=1
unset CI

# Allocate a PTY so eas-cli accepts interactive answers
script -q -c 'printf "y\ny\ny\n" | npx eas credentials:configure-build -p ios -e production' /tmp/eas-cred.log
echo "----- log -----"
tail -100 /tmp/eas-cred.log || true
