#!/usr/bin/env bash

set -e

cd "$(dirname "$0")/.."
./scripts/generate_package_version.py > version.txt
ARTIFACTS_DIR="src/marionette_predeployed/artifacts/"
cp -v "../artifacts/contracts/Marionette.sol/Marionette.json" "$ARTIFACTS_DIR"
python3 -m build
