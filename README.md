# Nglipur Punakawan Virtual Learning Environment
Proyek LIDM 2026 – Divisi Microteaching Digital Pendidikan (MDP).

Struktur: `index.html` (pintu masuk), `Nglipur/`, `Media/`, `Asesmen/`, `Asesmen Presentasi/`, `shared/theme.css` (tema), `assets/` (logo & foto Punakawan).

## GitHub Pages
Settings → Pages → Deploy from branch → `main` / root. Buka `https://<username>.github.io/<repo>/`.
Modul Nglipur, Media, dan Asesmen Presentasi berjalan statis di GitHub Pages.

## Modul Asesmen (AI)
Modul ini memanggil `/api/analyze` pada `server.js` (Node + Gemini), sehingga **tidak bisa berjalan di GitHub Pages**.
Jalankan lokal: salin `.env.example` menjadi `.env`, isi `GEMINI_API_KEY`, lalu `cd Asesmen && npm install && npm start`.
Jangan pernah meng-commit file `.env`.

## Pembaruan terbaru (revisi KAWANSA)
- **Dashboard:** banner memakai satu gambar gabungan `assets/img/4-karakter-punakawan.png` (menggantikan empat gambar terpisah).
- **Asesmen of Learning:** tab dihapus. Bagian A (Uji Kompetensi Berpikir Kreatif) dan Bagian B (Kinerja Presentasi) tampil berurutan dalam satu halaman.
- **Kinerja Presentasi:** kelompok diisi mandiri (nama kelompok, kelas, 1-5 anggota; minimal 1). Data tidak lagi diambil dari The Challenge dan disimpan di `localStorage` (`kawansa_pres_groups_v1`). Alur: input kelompok -> pilih anggota -> isi penilaian -> simpan. Setiap anggota memiliki nilai sendiri.
- **Skala skor:** seluruh dropdown "Pilih skor" kini 0, 1, 2, 3, 4. Skor 0 dihitung sebagai nilai valid.
- Backup JSON berisi `{ records, groups, presGroups }`; CSV memiliki kolom tambahan "Kelompok Presentasi".
