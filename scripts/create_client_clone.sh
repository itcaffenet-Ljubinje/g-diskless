#!/usr/bin/env bash
set -euo pipefail
if [ $# -lt 1 ]; then
  echo "Usage: $0 <client-label> [--initiator-iqn IQN] [--chap-user USER] [--chap-pass PASS]"
  exit 2
fi
CLIENT="$1"
shift || true
INITIQN=""
CHAP_USER=""
CHAP_PASS=""
while (( "$#" )); do
  case "$1" in
    --initiator-iqn) INITIQN="$2"; shift 2;;
    --chap-user) CHAP_USER="$2"; shift 2;;
    --chap-pass) CHAP_PASS="$2"; shift 2;;
    *) shift;;
  esac
done
BASE="vg1/win11_base"
SNAP="clean"
CLONE="vg1/${CLIENT}"
if ! zfs list -t snapshot ${BASE}@${SNAP} >/dev/null 2>&1; then
  echo "Snapshot ${BASE}@${SNAP} missing. Create the snapshot of base first."
  zfs snapshot ${BASE}@${SNAP}
fi
if zfs list ${CLONE} >/dev/null 2>&1; then
  echo "Clone already exists: ${CLONE}"
  exit 1
fi
echo "Creating ZFS clone ${CLONE} from ${BASE}@${SNAP}"
zfs clone ${BASE}@${SNAP} ${CLONE}
# compute deterministic TID
sum=0; for (( i=0; i<${#CLIENT}; i++ )); do sum=$((sum + $(printf "%d" "'${CLIENT:$i:1}'"))); done
TID=$((100 + sum % 800))
IQN="iqn.2025-09.local.lab:${CLIENT}"
tgtadm --lld iscsi --op new --mode target --tid ${TID} -T ${IQN}
tgtadm --lld iscsi --op new --mode logicalunit --tid ${TID} --lun 1 -b /dev/zvol/${CLONE}
# If initiator IQN provided, bind ACL
if [ -n "${INITIQN}" ]; then
  echo "Binding initiator IQN ${INITIQN} to target ${TID}..."
  tgtadm --lld iscsi --op bind --mode target --tid ${TID} -I "${INITIQN}" || true
fi
# If CHAP provided, create account (tgtadm supports account mode)
if [ -n "${CHAP_USER}" ] && [ -n "${CHAP_PASS}" ]; then
  echo "Creating CHAP account user=${CHAP_USER}..."
  tgtadm --lld iscsi --op new --mode account --user ${CHAP_USER} --password ${CHAP_PASS} || true
fi
echo "Created target ${IQN} (tid=${TID})"
