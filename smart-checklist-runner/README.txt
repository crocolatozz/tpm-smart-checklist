Smart Checklist Runner v1.0.0
================================

Ekstensi Chrome Manifest V3 untuk otomasi checklist Operator 1 pada aplikasi web berbasis Vue.js.

Fitur Utama:
- Preset Operator 1 dengan 30 tag equipment default (RUNNING / STANDBY / IGNORE).
- Aturan pengecualian tugas kondisional berdasarkan status RUNNING ("Putar poros") dan STANDBY ("Kelainan suara").
- Filter jadwal / shift (Semua Jadwal, Pagi, Sore, Malam, Daily, Weekly, Monthly).
- Mode Dry Run (sorotan kuning + gulir otomatis) dan Execute aman dengan jeda klik (default 150ms).
- Pemindaian ketat hanya pada checkbox input[type="checkbox"][id^="is_executed_"] (mengabaikan need_maintenance_).
- Halaman Options lengkap dengan pencarian, ambil tag dari tab aktif, bulk paste, ekspor/impor JSON, dan riwayat 20 eksekusi terakhir.

Cara Pasang (Load Unpacked):
1. Buka chrome://extensions dan aktifkan Developer mode.
2. Klik "Load unpacked" lalu pilih folder "smart-checklist-runner".

© 2026 — Developed by FIKRI
