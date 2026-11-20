TPM Smart Checklist v2.2.1
==========================

Ekstensi Chrome Manifest V3 untuk otomasi checklist web TPM pada Operator 1, Operator 2, dan Operator 3 (berbasis Vue.js) dengan sinkronisasi Cloud Firestore (`urea1b-running-status`), deteksi web otomatis, dan tampilan ringkas bebas konfigurasi manual.

Fitur Utama:
- Konfigurasi Terpusat Terkunci: Project ID (`urea1b-running-status`), `autoPullOnOpen`, `autoDetectShift`, `autoShowAllRows`, dan `clickDelayMs` (`150ms`) dikelola otomatis di belakang layar tanpa form konfigurasi teknis.
- Sinkronisasi Cloud Firestore & Pengaman PATCH Keywords: Otomatis menarik status unit (`RUNNING`, `STANDBY`, `IGNORE`) dan `skipKeywords` saat Popup/Options dibuka, serta menyimpan perubahan Kata Kunci Pengecualian ke dokumen Firestore `config/tpm_settings` dengan `?updateMask.fieldPaths=skipKeywords` saat Dev Mode aktif agar field lain tetap aman.
- Popup Ringkas 3 Shift & Status Otomatis: Dropdown shift dibatasi ketat ke `Morning Shift`, `Afternoon Shift`, dan `Night Shift` dengan fallback jam aktif, 3 pill status equipment (`RUNNING`, `STANDBY`, `IGNORE`) otomatis mengikuti operator web aktif (`0` redup saat di luar web TPM), serta seragam memakai istilah "Web".
- Halaman Options Equal-Width Semi-Transparan: Pencarian tag lebar penuh, tab operator & 4 pill filter selebar sama (`ALL`, `RUNNING`, `STANDBY`, `IGNORE`) dengan warna aktif semi-transparan bertepi tipis, jarak tegas antar grup equipment, serta auto-refresh via `chrome.storage.onChanged`.
- Modal Shadow DOM & Audit Sisa Unset Akurat: Mengecualikan shift lain saat menghitung Sisa Unset dan tetap mengaudit tugas berkala (`Daily`, `Weekly`, `Monthly`, `Optional`) berstatus `RUNNING`/`STANDBY` yang masih `Unset`.

Cara Pasang (Load Unpacked):
1. Buka chrome://extensions dan aktifkan Developer mode.
2. Klik "Load unpacked" lalu pilih folder "tpm-smart-checklist".
3. Status unit otomatis tersinkronkan dari Cloud Firestore (`urea1b-running-status`) atau dapat dikelola melalui tombol "Buka Running Status Checker" di Halaman Options.

© 2026 — Developed by FIKRI
