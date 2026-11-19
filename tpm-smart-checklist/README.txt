TPM Smart Checklist v1.4.0
==========================

Ekstensi Chrome Manifest V3 untuk otomasi checklist web TPM pada Operator 1, Operator 2, dan Operator 3 (berbasis Vue.js).

Fitur Utama:
- Engine Toggle 3-State web TPM (`Unset` → `Executed` → `Not Executed`) secara idempoten dengan deteksi status via class/label dan jeda klik aman 100ms untuk reaktivitas Vue.js.
- Dry Run Berkode Warna + Clear Preview: sorotan hijau untuk target `Executed` dan oranye untuk target `Not Executed`, dengan tombol Clear dan pembersihan otomatis saat ganti Operator/Shift.
- Live Progress Bar & Auto-Jump Sisa Unset: menampilkan progres eksekusi real-time dan otomatis scroll + pulse ke baris aktif (`RUNNING`/`STANDBY`) yang masih `Unset`.
- Tombol Quick-Swap ikon ringkas di gutter kiri (28px) dan routing langsung ke tab Operator aktif saat membuka Pengaturan.
- Database Equipment Modular (`equipment-db.js`) untuk 56 unit Operator 1–3.
- Auto-Detect Shift Sesuai Jam dan Auto-Tampilkan Semua Baris (300+) sebelum pemindaian.
- Aturan pengecualian tugas kondisional global (`Putar poros` saat `RUNNING`, `Kelainan suara` saat `STANDBY`).

Cara Pasang (Load Unpacked):
1. Buka chrome://extensions dan aktifkan Developer mode.
2. Klik "Load unpacked" lalu pilih folder "tpm-smart-checklist".

© 2026 — Developed by FIKRI
