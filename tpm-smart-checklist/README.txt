TPM Smart Checklist v1.2.0
==========================

Ekstensi Chrome Manifest V3 untuk otomasi checklist DILOC pada Operator 1, Operator 2, dan Operator 3 (berbasis Vue.js).

Fitur Utama:
- Database Equipment Modular (`equipment-db.js`) untuk 56 unit:
  - Operator 1 — LAPANGAN 1 (GROUND): 30 tag equipment default
  - Operator 2 — LAPANGAN 2: 9 tag equipment default
  - Operator 3 — Lapangan 3: 17 tag equipment default
- Auto-Detect Shift Sesuai Jam (07:00–14:59 Morning, 15:00–22:59 Afternoon, 23:00–06:59 Night) di Popup.
- Auto-Tampilkan Semua Baris (300+) otomatis mengubah dropdown jumlah entri tabel sebelum pemindaian.
- Aturan pengecualian tugas kondisional global:
  - Skip saat RUNNING: "Putar poros"
  - Skip saat STANDBY: "Kelainan suara"
- Filter shift DILOC (Semua Jadwal, Morning Shift, Afternoon Shift, Night Shift, Every Shift, Weekly, Optional) + opsi "Sertakan task Every Shift".
- Quick-Swap A↔B 1 klik di halaman Options untuk menukar status RUNNING/STANDBY pasangan unit.
- Mode Dry Run (sorotan kuning + gulir otomatis) & Execute aman (target ketat input[id^="is_executed_"], mengabaikan need_maintenance_).

Cara Pasang (Load Unpacked):
1. Buka chrome://extensions dan aktifkan Developer mode.
2. Klik "Load unpacked" lalu pilih folder "tpm-smart-checklist".

© 2026 — Developed by FIKRI
