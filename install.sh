#!/usr/bin/env bash
set -euo pipefail
echo "[*] ggRock-replica FULL installer starting..."
export DEBIAN_FRONTEND=noninteractive

echo "[*] Update system and install packages..."
apt update && apt upgrade -y
apt install -y zfsutils-linux isc-dhcp-server tftpd-hpa ipxe tgt nginx curl git nodejs npm postgresql postgresql-contrib

echo "[*] Create ZFS pool placeholder (manual step)"
echo "NOTE: This installer does NOT create ZFS pools automatically unless you edit the script."
echo "If you have spare disks (e.g. /dev/sdb /dev/sdc) you can create a pool like:"
echo "  zpool create vg1 mirror /dev/sdb /dev/sdc"
echo

echo "[*] Create application directories..."\n
# create dedicated non-root user
if ! id -u ggrock >/dev/null 2>&1; then
  useradd -m -s /bin/bash ggrock
  echo "Created user ggrock"
fi

mkdir -p /opt/ggrock-replica/backend
mkdir -p /opt/ggrock-replica/frontend
mkdir -p /srv/ggrock/{storage,disks,gamedisks,tftp}

echo "[*] Copy sample configs..."
cp -r ./config/* /etc/ggrock-replica || true
chown -R ggrock:ggrock /opt/ggrock-replica || true
chown -R ggrock:ggrock /etc/ggrock-replica || true

cp -r ./tftp/* /srv/ggrock/tftp || true
chown -R root:root /etc/ggrock-replica || true

echo "[*] Setup PostgreSQL database and user..."
sudo -u postgres psql -v ON_ERROR_STOP=1 <<'PSQL'
CREATE DATABASE IF NOT EXISTS ggrock;
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ggrock_user') THEN
    CREATE USER ggrock_user WITH ENCRYPTED PASSWORD 'StrongPassword';
  END IF;
END $$;
GRANT ALL PRIVILEGES ON DATABASE ggrock TO ggrock_user;
PSQL

echo "[*] Install backend dependencies..."
cd /opt/ggrock-replica/backend
if [ -f package.json ]; then
  npm install --no-audit --no-fund
fi

echo "[*] Install frontend dependencies and build..."
cd /opt/ggrock-replica/frontend
if [ -f package.json ]; then
  npm install --no-audit --no-fund
  npm run build || true
  cp -r dist/* /var/www/html/ || true
fi

echo "[*] Setup systemd services..."
cp ./services/ggrock-backend.service /etc/systemd/system/ || true
cp ./services/iscsi-autostart.service /etc/systemd/system/ || true
chmod 644 /etc/systemd/system/ggrock-backend.service || true
systemctl daemon-reload || true
systemctl enable --now ggrock-backend.service || true
systemctl enable --now iscsi-autostart.service || true

echo "[*] Enable and restart DHCP/TFTP/NGINX/tgt..."
systemctl enable --now isc-dhcp-server || true
systemctl enable --now tftpd-hpa || true
systemctl enable --now nginx || true
systemctl enable --now tgt || true

echo "[*] Installation finished. Next steps:"
echo " - Create ZFS pool 'vg1' (if not already) and optionally create base images with zfs volumes."
echo " - Place signed ipxe.efi in /srv/ggrock/tftp/ and ensure DHCP points to it."
echo " - Visit the web UI (http://<server-ip>/) and create disks via Disk Manager."
echo
echo "Backend logs: journalctl -u ggrock-backend -f"

# Create default users file for backend auth
mkdir -p /etc/ggrock-replica
cat >/etc/ggrock-replica/users.json <<'JSON'
{"users":[{"username":"admin","password":"$2a$10$u1N9ZzWq8JtY9rK8j9v2fuK5yJ8Jp9Q7Fv1e9Yb5G6b2a1c3d4e5"}]}
JSON
chown ggrock:ggrock /etc/ggrock-replica/users.json || true

# Copy scripts to /usr/local/bin and make executable
cp -r ./scripts/* /usr/local/bin/ || true
chmod +x /usr/local/bin/*.sh || true
chown -R ggrock:ggrock /usr/local/bin || true
