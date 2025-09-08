#!/usr/bin/env bash
set -euo pipefail
for vol in $(zfs list -H -o name | grep '^vg1/client-' || true); do
  cname=$(basename "$vol")
  sum=0; for (( i=0; i<${#cname}; i++ )); do sum=$((sum + $(printf "%d" "'${cname:$i:1}'"))); done
  TID=$((100 + sum % 800))
  IQN="iqn.2025-09.local.lab:${cname}"
  tgtadm --lld iscsi --op new --mode target --tid $TID -T $IQN || true
  tgtadm --lld iscsi --op new --mode logicalunit --tid $TID --lun 1 -b /dev/zvol/${vol} || true
  echo "Registered ${IQN} (tid=${TID})"
done
