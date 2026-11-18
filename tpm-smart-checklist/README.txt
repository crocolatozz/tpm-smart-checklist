TPM Smart Checklist v1.3.0
==========================

Ekstensi Chrome Manifest V3 untuk otomasi checklist DILOC pada Operator 1, Operator 2, dan Operator 3 (berbasis Vue.js).

Fitur Utama:
- Engine Toggle 3-State DILOC (`Unset` → `Executed` → `Not Executed`) secara idempoten dengan deteksi status via class/label dan jeda klik aman untuk reaktivitas Vue.js.
- Dry Run Berkode Warna: sorotan hijau untuk target `Executed` dan oranye untuk target `Not Executed` beserta badge pratinjau.
- Tombol Quick-Swap `Swap A↔B` di sisi kiri daftar equipment untuk menukar status duty/standby dengan pergerakan kursor minimal.
- Database Equipment Modular (`equipment-db.js`) untuk 56 unit Operator 1–3.
- Auto-Detect Shift Sesuai Jam dan Auto-Tampilkan Semua Baris (300+) sebelum pemindaian.
- Aturan pengecualian tugas kondisional global (`Putar poros` saat `RUNNING`, `Kelainan suara` saat `STANDBY`).

Cara Pasang (Load Unpacked):
1. Buka chrome://extensions dan aktifkan Developer mode.
2. Klik "Load unpacked" lalu pilih folder "tpm-smart-checklist".

© 2026 — Developed by FIKRI
