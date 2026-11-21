# Changelog

Semua perubahan penting pada **TPM Smart Checklist** dicatat dalam file ini.

## [2.3.0] - 2026-11-20

### Changed
- **Overhaul Palet Dark Mode: Dark Forest / Emerald (`styles.css`, `content.js`)**: Mengganti seluruh latar Dark Mode dari nuansa biru tua slate/navy menjadi hitam-kehijauan pekat agar menyatu dengan web APM sambil menjaga logo hijau-emas tetap tajam (`--bg-page: #060d0a`, `--bg-surface: #0c1713`, `--bg-subtle: #13221c`, `--border-color: #1d332a`, `--text-primary: #f8fafc`, `--text-muted: #94a3b8`), termasuk pada stylesheet terisolasi Shadow DOM untuk modal Pra-Eksekusi, Progres, dan Hasil Eksekusi di `content.js`.
- **Penyempurnaan Palet Light Mode Kontras Tinggi (`styles.css`, `content.js`)**: Mengatur Light Mode dengan latar putih bersih (`#ffffff`), permukaan kartu abu-abu kehijauan muda (`#f5f7f6`), border `#dce5e0`, serta emerald lebih gelap (`#059669` untuk tombol utama, `#047857` untuk teks dan ikon aksen) demi rasio kontras optimal.
- **Penyeragaman Aksen Interaktif & Highlight Emerald (`styles.css`, `content.js`)**: Mengubah tombol utama (`Execute`, `Ya, Jalankan`, `Loncat ke Sisa (X)`), tab aktif `OPERATOR 1/2/3`, focus ring pencarian & dropdown shift, badge versi/DEV, ikon aksen header, serta highlight baris & pulse target pada web APM menjadi emerald (`#10b981` / `#059669`), sambil **mempertahankan 100%** warna 4 tab filter status (`ALL` biru, `RUNNING` emerald, `STANDBY` amber, `IGNORE` slate) dan badge status equipment.
- Pembaruan versi ekstensi ke `v2.3.0` pada `manifest.json`, `popup.html`, `options.html`, `README.md`, dan `README.txt`.

## [2.2.1] - 2026-11-20

### Changed
- **Pengaman PATCH Firestore `skipKeywords` (`storage.js`)**: Menambahkan parameter query `?updateMask.fieldPaths=skipKeywords` pada request `PATCH` auto-push kata kunci ke dokumen `config/tpm_settings` agar field lain pada dokumen Firestore tersebut tidak ikut tertimpa.
- **Filter Shift Ketat & Guard Anti-All (`popup.html`, `popup.js`, `storage.js`, `content.js`)**: Membatasi dropdown `#schedule-filter` hanya ke 3 shift utama (`Morning Shift`, `Afternoon Shift`, `Night Shift`), menghapus `Semua Jadwal` dan opsi berkala dari dropdown, serta mengamankan fallback di `storage.js`, `popup.js`, dan `content.js` agar tidak pernah bernilai `'all'` atau string kosong sambil tetap mengaudit tugas berkala (`Daily`, `Weekly`, `Monthly`, `Optional`) pada pemindaian `Sisa Unset`.
- **Popup Tanpa Tab Operator & Penyeragaman Teks "Web" (`popup.html`, `popup.js`, `styles.css`, `content.js`)**: Menghapus 3 tab operator di Popup sehingga ringkasan 3 pill (`RUNNING`, `STANDBY`, `IGNORE`) otomatis mengikuti operator yang terdeteksi dari web aktif (menampilkan `0` redup saat di luar web TPM), menyeragamkan istilah `"Halaman"` menjadi `"Web"` (termasuk `"Web Aktif"`, `"Di luar web TPM Op. 1–3"`, dan `"Web Operator"`), serta memastikan panduan `"Buka web checklist TPM Op. 1, 2, atau 3 dulu."` rapi dalam 1 baris.
- **Tab Filter Options Equal-Width Semi-Transparan (`styles.css`)**: Mengatur 4 tombol filter (`ALL`, `RUNNING`, `STANDBY`, `IGNORE`) pada Halaman Options dengan grid 4 kolom sama lebar (`repeat(4, 1fr)`) dan teks rata tengah ber-`tabular-nums`, serta mengganti warna aktif solid menjadi fill semi-transparan dengan border tipis `1px` yang kontras di Dark Mode maupun Light Mode.
- Pembaruan versi ekstensi ke `v2.2.1` pada `manifest.json`, `popup.html`, `options.html`, `README.md`, dan `README.txt`.

### Removed
- Menghapus opsi filter `Semua Jadwal`, `Daily`, `Weekly`, `Monthly`, `Optional` dan 3 tab manual Operator (`Operator 1–3`) dari Popup beserta referensi DOM/listener terkait.

## [2.2.0] - 2026-11-20

### Added
- **Auto-Push Kata Kunci Pengecualian ke Firestore (`storage.js`, `options.js`)**: Penambahan dan penghapusan *Skip Task Keywords* di Halaman Options saat **Dev Mode** aktif kini langsung menyimpan perubahan via `PATCH` ke dokumen Firestore `config/tpm_settings` secara otomatis tanpa tombol Push manual.
- **Auto-Refresh Real-Time Halaman Options (`options.js`)**: Listener `chrome.storage.onChanged` memastikan daftar equipment dan penghitung tab di Options otomatis ter-refresh saat Popup menarik pembaruan dari Firestore di latar belakang.

### Changed
- **Konfigurasi Terpusat Terkunci & Penghapusan `includeEveryShift` (`storage.js`, `content.js`, `popup.html`, `popup.js`)**: Mengunci permanen `projectId` (`urea1b-running-status`), `autoPullOnOpen`, `targetUrlPattern` (`*`), `clickDelayMs` (`150`), `autoDetectShift`, dan `autoShowAllRows`; mengganti opsi `Every Shift` dengan interval `Daily` dan `Monthly` sesuai web APM; serta menghapus total logika `includeEveryShift` dan `executionHistory` beserta pembersihan kunci lama dari storage.
- **Perampingan Popup (`popup.html`, `popup.js`, `styles.css`)**: Memperbarui teks Execute Guard (`"Di luar halaman TPM Op. 1–3"` dan `"Buka halaman checklist TPM Op. 1, 2, atau 3 dulu."`), menampilkan 3 pill status uppercase (`RUNNING`, `STANDBY`, `IGNORE`) tanpa pengulangan label operator, menjalankan auto-detect shift satu kali saat dibuka tanpa checkbox, menyembunyikan tombol **Dry Run** di mode normal agar **Execute** melebar penuh, serta menghapus tombol **Clear**, 3 checkbox, dan grid 6 kotak statistik.
- **Penyederhanaan Halaman Options & Warna Filter RSC (`options.html`, `options.js`, `styles.css`)**: Menghapus kartu **Sinkronisasi Firestore**, panel **Execution History**, 3 tombol utilitas kanan pencarian, serta modal **Bulk Paste Tag**; melebarkan input pencarian ke `100%`; menyeragamkan label tab operator & filter ke huruf kapital dengan warna aktif Running Status Checker (`ALL` `#3B82F6`, `RUNNING` `#10B981`, `STANDBY` `#F59E0B`, `IGNORE` `#64748B`); serta memberi jarak pemisah vertikal yang tegas antar grup equipment.
- **Penyempurnaan Modal In-Page & Filter Audit Sisa Unset (`content.js`)**: Menghapus baris `Task Every Shift`, menyeragamkan format uppercase `RUNNING • STANDBY • IGNORE`, mengubah judul hasil menjadi `"Smart Checklist Selesai"`, memadatkan kotak peringatan Save, dan mengecualikan shift lain saat menghitung **Sisa Unset** (hanya menghitung shift terpilih atau tugas berkala `Daily`/`Weekly`/`Monthly`/`Optional` yang berstatus `RUNNING`/`STANDBY`, `Unset`, dan tidak cocok `skipKeywords`).
- **Audit Ikon SVG (`icons.js`, `popup.js`, `options.js`)**: Mengganti ikon serangga (`bug`) menjadi ikon kurung kode (`</>`), memperbarui ikon swap vertikal menjadi dua panah terpisah kiri-atas dan kanan-bawah yang tajam, serta membersihkan definisi SVG yang tidak terpakai.
- Pembaruan versi ekstensi ke `v2.2.0` pada `manifest.json`, `popup.html`, `options.html`, `README.md`, dan `README.txt`.

### Removed
- Menghapus panel manual Sinkronisasi Firestore, Riwayat Eksekusi (`executionHistory`), fitur `includeEveryShift`, tombol **Clear**, dan utilitas Bulk Paste / Scrape Tag.

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
