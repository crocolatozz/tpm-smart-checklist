# Changelog

Semua perubahan penting pada **TPM Smart Checklist** dicatat dalam file ini.

## [1.3.0] - 2026-11-18

### Added
- **DILOC 3-State Toggle Engine (`content.js`)**: Mendukung siklus status 3-tahap `Unset` (`bg-dark`) → `Executed` (`bg-success`) → `Not Executed` (`bg-danger`) secara idempoten dengan jeda pengaman `100ms` untuk klik ganda agar reaktivitas Vue.js stabil, sambil tetap mengabaikan `input[id^="need_maintenance_"]` dan tag `IGNORE`.
- **Color-Coded Dry Run & 5 Counter Summary (`content.js`, `popup.html`, `popup.js`)**: Sorotan pratinjau hijau (`Dry Run → Executed`) dan oranye (`Dry Run → Not Executed`), ditambah 5 metrik ringkasan (`Total Discan`, `Set → Executed`, `Set → Not Executed`, `Sudah Sesuai`, `Tidak Tersentuh`).

### Changed
- **Relokasi Tombol Swap A↔B ke Sisi Kiri (`options.html`, `options.js`, `styles.css`)**: Tombol **Swap A↔B** pada daftar equipment berpasangan dipindahkan ke sisi kiri baris untuk meminimalkan pergerakan kursor operator.
- Pembaruan versi ekstensi ke `v1.3.0` pada `manifest.json`, `popup.html`, `options.html`, dan `README.txt`.

## [1.2.0] - 2026-11-18

### Added
- Database equipment modular (`tpm-smart-checklist/equipment-db.js`) berisi metadata area dan 56 unit default Operator 1–3 beserta relasi pasangan unit A/B (`pair`).
- Fitur **Auto-detect shift sesuai jam** pada Popup (07:00–14:59 Morning Shift, 15:00–22:59 Afternoon Shift, 23:00–06:59 Night Shift) dengan dukungan override manual kapan saja.
- Fitur **Auto-tampilkan semua baris (300+)** pada `content.js` & Popup untuk memperluas dropdown entri tabel (`300`, `500`, `All`, atau `-1`) dan menunggu 600ms sebelum pemindaian Dry Run / Execute.

### Changed
- Refactor `storage.js`, `icons.js`, `popup.js`, dan `options.js` menjadi ES Module (`type="module"`) yang sepenuhnya patuh CSP Manifest V3.
- Pembaruan versi ekstensi ke `v1.2.0` pada `manifest.json`, `popup.html`, `options.html`, dan `README.txt`.

## [1.0.0] - 2026-11-17

### Added
- Universal Chrome Extension MV3 Workbench di `index.html` dengan tema dark developer studio menggunakan 100% Vanilla HTML, CSS, dan JavaScript.
- Injeksi otomatis Mock Chrome API Shim (`chrome.storage.local`, `chrome.storage.onChanged` lintas iframe, `chrome.runtime.getURL`, `chrome.runtime.getManifest`, `chrome.tabs.query`, `chrome.tabs.sendMessage`, dan `chrome.tabs.create`).
- Panel Simulasi Halaman Web Target interaktif, Console Log real-time, Mock Storage Inspector, dan Reset Mock Storage ber-prefix per folder ekstensi.
- Ekstensi demo Manifest V3 di `sample-ext/` (`manifest.json`, `popup.html`, `options.html`).
- Dokumen tata kelola repository (`AI_RULES.md`, `README.md`, dan `CHANGELOG.md`).

### Changed
- Konfigurasi `package.json` minimalis (`chrome-ext-studio-template`) agar kompatibel dengan server preview AI Studio dan import GitHub tanpa dependensi eksternal.
