TPM Smart Checklist v2.0.0
==========================

Ekstensi Chrome Manifest V3 untuk otomasi checklist web TPM pada Operator 1, Operator 2, dan Operator 3 (berbasis Vue.js) dengan deteksi halaman otomatis, database terpusat Google Sheets, dan desain Emerald PMR Web Runner.

Fitur Utama:
- Auto-Detect Halaman & Tanggal Aktif: Otomatis mendeteksi halaman Operator 1/2/3 (`LAPANGAN 1/2/3`) beserta tanggal checklist dari header web TPM, menyinkronkan preset aktif, serta mengunci tombol Execute bila di luar halaman operator (Mode Operasional).
- Arsitektur Hibrid Local-First + Cloud Master (`backend/Code.gs`): Sinkronisasi master 56 unit & Skip Task Keywords dengan Google Sheets melalui Google Apps Script Web App (`Pull dari DB`, `Push ke DB`, dan `Auto-Pull saat dibuka`), dengan cache lokal offline di `chrome.storage.local`.
- Smart DOM Stability Wait (300+ Baris): Memuat ulang dropdown entri tabel secara aman dengan polling stabilitas DOM hingga `8000ms` tanpa race condition sebelum menampilkan Konfirmasi Pra-Eksekusi.
- Skip Task Keywords Berbasis Template & Pill Box: Dropdown kata kunci dari template + pill box Emerald yang mudah ditambah/hapus (mendukung migrasi otomatis format string lama).
- Modal Shadow DOM Pure Cursor & Floating Toasts: Interaksi klik murni (tanpa shortcut keyboard), ikon tukar vertikal (`↕`), dan notifikasi Floating Toast tanpa pergeseran tata letak.
- Engine Toggle 3-State (`Unset` → `Executed` → `Not Executed`) secara idempoten dengan jeda klik aman untuk reaktivitas Vue.js.

Cara Pasang (Load Unpacked):
1. Buka chrome://extensions dan aktifkan Developer mode.
2. Klik "Load unpacked" lalu pilih folder "tpm-smart-checklist".
3. (Opsional Cloud Sync) Tempel `backend/Code.gs` ke Google Apps Script, ubah `SECRET_TOKEN`, deploy sebagai Web App, lalu masukkan URL & token pada Debug Mode di Options.

© 2026 — Developed by FIKRI
