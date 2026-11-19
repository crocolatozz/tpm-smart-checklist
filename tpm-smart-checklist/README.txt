TPM Smart Checklist v2.1.0
==========================

Ekstensi Chrome Manifest V3 untuk otomasi checklist web TPM pada Operator 1, Operator 2, dan Operator 3 (berbasis Vue.js) dengan sinkronisasi Cloud Firestore (`urea1b-running-status`), deteksi halaman otomatis, dan mode operasional terkunci.

Fitur Utama:
- Sinkronisasi Cloud Firestore (`urea1b-running-status`): Mengambil status unit (`RUNNING`, `STANDBY`, `IGNORE`) dan Skip Task Keywords langsung dari Firestore REST API tanpa library eksternal atau API key hardcoded, terintegrasi dengan Running Status Checker (`https://crocolatozz.github.io/running-status-checker/`) serta cache offline di `chrome.storage.local`.
- Dev Mode & Penguncian Operasional (Read-Only Guard): Secara default (Dev Mode OFF), seluruh pengubahan status equipment, swap A↔B, dan aturan skip task terkunci read-only agar sinkron dengan Running Status Checker, sekaligus menyembunyikan panel sinkronisasi teknis. Aktifkan Dev Mode untuk membuka kontrol edit manual dan sinkronisasi Pull/Push Firestore.
- Tautan Cepat Running Status Checker: Tombol akses langsung di Halaman Options untuk membuka `https://crocolatozz.github.io/running-status-checker/`.
- Auto-Detect Halaman & Tanggal Aktif: Otomatis mendeteksi halaman Operator 1/2/3 (`LAPANGAN 1/2/3`) beserta tanggal checklist dari header web TPM, menyinkronkan preset aktif, dan mengunci tombol Execute bila dibuka di luar halaman operator.
- Penanganan Ketat Status `IGNORE` & DOM Stability Wait (300+ Baris): Menjamin 100% baris berstatus `IGNORE` dilewati serta melaporkan jumlah unit dan baris yang diabaikan secara akurat di Konfirmasi Pra-Eksekusi maupun Ringkasan Selesai.
- Engine Toggle 3-State (`Unset` → `Executed` → `Not Executed`): Eksekusi idempoten dengan jeda klik aman untuk reaktivitas Vue.js dan modal Shadow DOM pure-cursor.

Cara Pasang (Load Unpacked):
1. Buka chrome://extensions dan aktifkan Developer mode.
2. Klik "Load unpacked" lalu pilih folder "tpm-smart-checklist".
3. Status unit akan otomatis disinkronkan dari Cloud Firestore (`urea1b-running-status`) saat Popup dibuka, atau kelola via tombol "Buka Running Status Checker" di Halaman Options.

© 2026 — Developed by FIKRI
