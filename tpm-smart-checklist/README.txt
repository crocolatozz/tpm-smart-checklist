TPM Smart Checklist v1.5.0
==========================

Ekstensi Chrome Manifest V3 untuk otomasi checklist web TPM pada Operator 1, Operator 2, dan Operator 3 (berbasis Vue.js).

Fitur Utama:
- Ikon Kustom "Smart + Checklist" (`icons/icon.svg`) dan dukungan ikon manifest PNG (`16/48/128px`).
- Global Debug Mode (default OFF): Mode Operasional Harian menampilkan UI ringkas dengan tombol Execute full-width dan auto-expand 300+ baris otomatis; saat ON menampilkan Dry Run, Clear, metrik teknis, aturan pengecualian, serta badge `DEBUG`.
- Auto-Close Popup & Modal Shadow DOM 3-Tahap pada halaman web TPM: Konfirmasi Pra-Eksekusi (`Enter`/`Esc`), Live Progress Terkunci (`Memproses X / Y baris...`), dan Ringkasan Selesai + pengingat wajib menekan tombol "Save" + tombol kondisional `Loncat ke Sisa (X)` untuk unit aktif (`RUNNING`/`STANDBY`) yang masih `Unset`.
- Engine Toggle 3-State web TPM (`Unset` → `Executed` → `Not Executed`) secara idempoten dengan jeda klik aman 100ms untuk reaktivitas Vue.js.
- Tombol Quick-Swap ikon ringkas di gutter kiri (28px) dan routing langsung ke tab Operator aktif saat membuka Pengaturan.
- Database Equipment Modular (`equipment-db.js`) untuk 56 unit Operator 1–3.

Cara Pasang (Load Unpacked):
1. Buka chrome://extensions dan aktifkan Developer mode.
2. Klik "Load unpacked" lalu pilih folder "tpm-smart-checklist".

© 2026 — Developed by FIKRI
