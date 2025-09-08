#!/usr/bin/env bash
set -euo pipefail
SNAP='clean'
zfs rollback -r vg1/win11_base@${SNAP}
echo 'Rolled back win11_base to @clean'
