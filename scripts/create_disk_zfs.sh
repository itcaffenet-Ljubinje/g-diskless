#!/usr/bin/env bash
set -euo pipefail
if [ $# -lt 2 ]; then
  echo "Usage: $0 <disk-name> <size-gb>"
  exit 2
fi
NAME="$1"
SIZE="$2"
zfs create -V ${SIZE}G vg1/${NAME}
echo "Created zvol: /dev/zvol/vg1/${NAME}"
