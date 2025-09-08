ggRock Replica - Full package (backend, frontend, scripts, services, configs)

Quick start:
1) Transfer this package to a Debian 12/13 server.
2) Edit install.sh if you want to auto-create ZFS pool (disabled by default).
3) Run: sudo bash install.sh
4) Create ZFS pool 'vg1' manually if not created:
   sudo zpool create vg1 mirror /dev/sdb /dev/sdc
5) Create base volume for Windows:
   sudo zfs create -V 80G vg1/win11_base
6) Create snapshot of base after you customize and install Windows in a VM:
   sudo zfs snapshot vg1/win11_base@clean
7) From Web UI (http://<server-ip>/) create disks and clients.

Notes:
- Secure Boot: place signed ipxe.efi in /srv/ggrock/tftp/
- Windows Licensing: you must have valid licenses (KMS/MAK)
- This package is a starting point for a DIY diskless system. Test in lab before production.
