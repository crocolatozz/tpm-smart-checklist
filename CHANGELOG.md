# Changelog

Semua perubahan penting pada **TPM Smart Checklist** dicatat dalam file ini.

## [2.1.0] - 2026-11-19

### Added
- **Integrasi Cloud Firestore REST API (`manifest.json`, `storage.js`, `options.html`, `options.js`, `popup.js`)**: Migrasi backend terpusat ke proyek Cloud Firestore `urea1b-running-status` melalui Firestore REST API (`GET` dengan `pageSize=200` + pagination `nextPageToken`, graceful fallback HTTP `404` untuk `config/tpm_settings`, dan `PATCH` terbatasi max 8 request paralel saat Push di Dev Mode), menyinkronkan status unit dan kata kunci pengecualian secara seamless dengan `https://crocolatozz.github.io/running-status-checker/` serta `Auto-Ambil saat Popup Dibuka` (timeout `2500ms` via `AbortController`).
- **Tombol Akses Cepat Running Status Checker (`options.html`, `options.js`, `icons.js`)**: Menambahkan tombol `Buka Running Status Checker` di Halaman Options yang tersedia pada mode operasional maupun Dev Mode.
- **Konfirmasi Inline Push Firestore (`options.html`, `options.js`, `styles.css`)**: Panel konfirmasi inline pengganti dialog bawaan browser saat akan menimpa database Firestore (`Simpan ke DB (Push)`).

### Changed
- **Penggantian Debug Mode → Dev Mode & Penguncian Operasional Read-Only (`storage.js`, `options.*`, `popup.*`, `styles.css`)**: Mengganti seluruh label dan badge `DEBUG` menjadi `DEV` (`devMode`), menyembunyikan panel **Sinkronisasi Firestore** saat Dev Mode OFF, serta mengunci daftar status equipment, swap `↕`, dan dropdown/pill kata kunci menjadi read-only agar operator menggunakan status terpusat dari Running Status Checker.
- **Penanganan Ketat Status `IGNORE` (`content.js`)**: Memastikan 100% baris berstatus `IGNORE` dilewati selama eksekusi maupun pemindaian sisa `Unset`, serta menampilkan jumlah unit & baris `IGNORE` yang dilewati pada Konfirmasi Pra-Eksekusi (Tahap 1) dan Ringkasan Selesai (Tahap 3).
- **Pembaruan Ikon Brand Checkmark Emerald + Sparkles (`icons/icon.svg`, `icon16/48/128.png`, `content.js`)**: Mengganti seluruh ikon bola lampu lama dengan ikon vektor centang Emerald (`#10B981`) dan dua kilau emas (`#FBBF24`), termasuk regenerasi aset PNG transparan (`16/48/128px`) dan SVG inline pada modal Shadow DOM.
- **Penyederhanaan Teks Guard & Pembaruan Versi (`popup.html`, `options.html`, `manifest.json`, `README.txt`)**: Mempersingkat teks panduan guard Execute di Popup menjadi `"Buka halaman Operator 1, 2, atau 3 dulu."` dan memperbarui versi ekstensi ke `v2.1.0`.

### Removed
- **Penghapusan Backend Google Sheets / Apps Script (`backend/Code.gs`)**: Menghapus folder `backend/` beserta seluruh logika Web App URL, Secret Token, dan `host_permissions` `script.google.com` / `script.googleusercontent.com`.

## [2.0.0] - 2026-11-19

### Added
- **Arsitektur Database Hibrid Google Sheets (`manifest.json`, `storage.js`, `options.html`, `options.js`, `backend/Code.gs`)**: Sinkronisasi dua arah (`Pull dari DB`, `Push ke DB`, dan `Auto-Pull saat dibuka`) untuk master unit & kata kunci pengecualian melalui Google Apps Script Web App (`doGet`/`doPost` dengan `Content-Type: text/plain;charset=utf-8` tanpa preflight CORS), tetap mengandalkan cache lokal `chrome.storage.local` untuk operasi offline tanpa error.
- **Auto-Detect Halaman Operator & Tanggal + Execute Guard (`content.js`, `popup.html`, `popup.js`)**: Deteksi otomatis halaman `LAPANGAN 1/2/3` (`Operator 1/2/3`) dan tanggal aktif web TPM via pesan `GET_PAGE_CONTEXT`, sinkronisasi otomatis preset operator aktif, serta penguncian tombol **Execute** (nonaktif/abu-abu) beserta panduan singkat jika dibuka di luar halaman operator.
- **Smart DOM Stability Wait 300+ Baris (`content.js`)**: Modal Shadow DOM langsung terbuka dalam status `"Memuat daftar baris TPM..."` saat perluasan baris berjalan, melakukan polling tiap `250ms` (maksimal `8000ms`) hingga jumlah baris stabil pada 2 pemeriksaan berurutan (`500ms`) sebelum menampilkan Konfirmasi Pra-Eksekusi.
- **Template Dropdown & Pill Box Kata Kunci + Floating Toasts (`equipment-db.js`, `options.html`, `options.js`, `styles.css`)**: Penggantian input teks koma menjadi dropdown template dengan kotak pill Emerald yang bisa dihapus (`×`) beserta migrasi otomatis data lama, serta sistem notifikasi **Floating Toast** bergaya PMR Web Runner.

### Changed
- **Bahasa Visual PMR Web Runner & Palet Emerald Green (`icons/icon.svg`, `styles.css`, `content.js`)**: Pembaruan ikon ekstensi ke vektor lampu-centang Emerald (`#10B981`), palet aksen Emerald (`#10B981` / `#059669` / `#D1FAE5`), ikon tukar vertikal (`↕`), header Options terkunci agar tidak turun baris saat badge `DEBUG` aktif, dan interaksi kursor murni pada modal (menghapus seluruh shortcut keyboard).
- **Penghapusan Backup JSON Lokal (`options.html`, `options.js`)**: Bagian ekspor/impor JSON lama pada Debug Mode digantikan sepenuhnya oleh panel **Centralized Database Sync**.
- Pembaruan versi ekstensi ke `v2.0.0` pada `manifest.json`, `popup.html`, `options.html`, dan `README.txt`.

## [1.5.0] - 2026-11-19

### Added
- **Ikon Kustom "Smart + Checklist" (`icons/icon.svg`, `manifest.json`, `popup.html`, `options.html`)**: Desain vektor lencana centang ber-sparkle di header Popup & Options serta konfigurasi `icons` dan `action.default_icon` untuk ukuran `16/48/128px`.
- **Global Debug Mode & Badge `DEBUG` (`storage.js`, `options.html`, `options.js`, `popup.html`, `popup.js`)**: Sakelar Debug Mode (default `OFF`) untuk memisahkan Mode Operasional Harian (tombol **Execute** lebar penuh 100%, auto-expand 300+ baris aktif otomatis di latar belakang, tanpa panel teknis) dengan Mode Debug (menampilkan Dry Run, Clear, metrik 6-kotak, aturan pengecualian, dan badge `DEBUG`).
- **Auto-Close Popup & Modal In-Page Shadow DOM (`popup.js`, `content.js`)**: Popup otomatis menutup secara aman di dalam callback sukses `chrome.tabs.sendMessage`, lalu menjalankan alur 3 tahap terisolasi di dalam `#shadow-root` (`z-index: 2147483647`) pada halaman web TPM:
  1. Konfirmasi Pra-Eksekusi (Operator, Shift, Every Shift; pintasan `Enter`/`Esc` + penjaga 0 baris & anti-duplikat).
  2. Progres Langsung Terkunci (`Memproses X / Y baris...`).
  3. Ringkasan Selesai ("Telah dilakukan Smart Checklist", jumlah unit Running/Standby, pengingat wajib tombol "Save" web TPM, serta tombol kondisional `Selesai` atau `Loncat ke Sisa (X)`).

### Changed
- **Penyeragaman Label Operator (`popup.html`, `popup.js`, `options.html`, `options.js`)**: Menghapus seluruh sub-label area (`Lapangan 1 (Ground)`, `Lapangan 2`, `Lapangan 3`) agar seragam menampilkan **Operator 1**, **Operator 2**, dan **Operator 3**.
- Pembaruan versi ekstensi ke `v1.5.0` pada `manifest.json`, `popup.html`, `options.html`, dan `README.txt`.

## [1.4.0] - 2026-11-18

### Added
- **Clear Preview Dry Run (`content.js`, `popup.html`, `popup.js`)**: Fungsi `clearDryRunPreview` untuk menghapus sorotan baris dan badge pratinjau Dry Run tanpa mengubah status checkbox Vue.js, dilengkapi tombol **Clear** di Popup serta pembersihan otomatis saat mengganti Operator atau Jadwal/Shift.
- **Live Progress Bar (`content.js`, `popup.html`, `popup.js`)**: Progress bar tipis dan teks status langsung (`Memproses X / Y baris...`) selama **Execute** berjalan dengan pengiriman progres ter-throttle via `chrome.runtime.sendMessage`.
- **Auto-Jump ke Sisa Baris `Unset` (`content.js`, `popup.html`, `popup.js`)**: Pemindaian otomatis setelah **Execute** selesai untuk mencari unit aktif (`RUNNING`/`STANDBY`) milik operator aktif yang masih `Unset` (`bg-dark`), scroll halus ke baris pertama yang ditemukan dengan efek pulse, serta menampilkan counter **Sisa Unset (Aktif)** di ringkasan Popup.

### Changed
- **Standardisasi Konteks web TPM (`manifest.json`, `popup.html`, `README.txt`)**: Menyeragamkan seluruh penamaan dan keterangan konteks menjadi **web TPM**.
- **Smart Options Tab Routing & Compact Swap Gutter (`popup.js`, `options.js`, `styles.css`)**: Membuka Halaman Options langsung pada tab Operator aktif (`?op=op1|op2|op3`) serta merapikan kontrol tukar pasangan ke gutter kiri tetap `28px` dengan tombol ikon ringkas (`Swap A ↔ B`) sehingga nama tag sejajar vertikal rapi.
- Pembaruan versi ekstensi ke `v1.4.0` pada `manifest.json`, `popup.html`, `options.html`, dan `README.txt`.

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
