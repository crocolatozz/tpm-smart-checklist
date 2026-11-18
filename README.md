# Chrome Extension Studio Template (MV3 Workbench)

Universal live-preview simulator untuk merancang dan men-debug Chrome/Edge Extension (**Manifest V3**) secara visual di Google AI Studio menggunakan **100% Vanilla HTML, CSS, dan JavaScript** tanpa bundler.

## Struktur Arsitektur Dua Lapis

    /
    ├── index.html          # Universal Live Preview Simulator & Mock Chrome API
    ├── package.json        # Minimal server config untuk preview AI Studio & GitHub import
    ├── AI_RULES.md         # Standar koding, CSP Manifest V3, dan aturan hemat token AI
    ├── CHANGELOG.md        # Catatan riwayat perubahan template
    ├── README.md           # Dokumentasi utama repository
    ├── sample-ext/         # Contoh ekstensi bawaan untuk tes simulator
    └── <nama-ekstensi>/    # Folder inti ekstensi target (siap Load Unpacked ke Chrome)

## Alur Kerja Multi-Project (1 Repo, Beda Branch)

1. **Jaga Branch `main` Tetap Bersih:** Gunakan `main` khusus sebagai master template kosong.
2. **Buat Branch Baru per Project:** Saat mulai ekstensi baru, buat branch baru dari `main` (misal: `pmr-web-runner`), lalu hubungkan ke workspace baru di AI Studio.
3. **Isolasi File Ekstensi:** Simpan seluruh file ekstensi (`manifest.json`, `popup.html`, `options.html`, aset ikon, dan script) di dalam satu subfolder khusus `/<nama-ekstensi>/`.
4. **Live Preview:** Ketik nama subfolder ekstensi pada input toolbar di `index.html` untuk menguji tampilan popup, halaman options, `chrome.storage.local`, dan simulasi pesan tab secara langsung.

## Cara Pasang ke Browser (Load Unpacked)

1. Unduh file ZIP project dari AI Studio lalu ekstrak.
2. Buka `chrome://extensions` atau `edge://extensions` dan aktifkan **Developer mode**.
3. Klik **Load unpacked** dan pilih **hanya subfolder `/<nama-ekstensi>/`** (jangan pilih folder root `/`).

---

© 2026 — Developed by FIKRI
