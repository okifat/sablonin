# Sablonin

Situs pemesanan cetak DTF (print-on-demand) — upload desain, coba di preview baju 360°, bayar, dan pantau order lewat halaman admin. 100% statis (HTML/CSS/JS biasa), gak butuh server/backend.

## Struktur folder

```
sablonin/
├── index.html      # halaman utama (customer)
├── styles.css
├── app.js
└── admin/
    ├── index.html  # dashboard admin
    ├── styles.css
    └── app.js
```

## Jalanin di lokal

Situs ini pakai `localStorage` buat nyimpen data order & kunjungan, dan `localStorage` itu ke-share **per origin** (domain+port), bukan per file. Kalau `index.html` dibuka langsung dobel klik (`file://...`), sebagian browser (terutama Chrome) bakal menganggap tiap file `file://` itu origin sendiri-sendiri, jadi data order dari `index.html` gak nyambung ke `admin/index.html`.

**Jadi selalu jalanin lewat local server, bukan dobel klik file.** Paling gampang pakai Python (biasanya udah ada di Mac):

```bash
cd sablonin
python3 -m http.server 8800
```

Lalu buka di browser:

- Situs utama: http://127.0.0.1:8800/
- Admin: http://127.0.0.1:8800/admin/

Matiin server dengan `Ctrl+C` di terminal. Kalau port 8800 kepake, ganti aja jadi port lain, misal `python3 -m http.server 5500`.

### Cara coba alurnya

1. Buka situs utama, klik **Pesan Sekarang**.
2. Upload desain, coba-coba muter baju 360° & geser posisi desainnya, pilih warna baju bebas.
3. Isi data pemesan, lanjut ke pembayaran, upload bukti transfer (screenshot, bukan PDF).
4. Buka tab baru ke `/admin/` (browser yang sama) — order yang baru dibuat harusnya langsung muncul di tabel, status "Menunggu Verifikasi", dan opsi "Diproses Cetak" ke atas ke-lock sampai bukti bayar ada.
5. Di admin, klik dropdown status buat ubah, atau tombol **Konfirmasi WA** buat kirim pesan konfirmasi ke nomor customer.
6. Tombol **Muat Data Contoh** di admin ngisi 5 order contoh + data kunjungan biar gampang lihat tampilan penuhnya tanpa order asli.

## Yang perlu diaktifkan manual (opsional)

- **Notif email otomatis** pakai [EmailJS](https://www.emailjs.com) (gratis 200 email/bulan): daftar akun, bikin Service + Template, lalu isi `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY` di bagian atas `app.js`. Sebelum diisi, fitur ini diam aja (gak error).
- **Nomor WA admin & rekening bank** masih hardcode di `index.html`/`app.js` — ganti sesuai kebutuhan sebelum dipakai beneran.

## Catatan sebelum dipakai buat order asli

- Data order & kunjungan cuma tersimpan di `localStorage` browser — **gak ke-share antar device**. Order dari HP customer gak otomatis nyampe ke HP admin. Buat itu jalan beneran, perlu backend/database (misal Firebase, gratis).
- Halaman `/admin` gak ada proteksi login. Kalau sudah di-deploy publik (GitHub Pages/Netlify/dll), siapa pun yang tau linknya bisa buka. Tambahkan otentikasi dulu sebelum dipakai buat data order asli.
- Deteksi nominal bukti bayar (OCR via Tesseract.js) sifatnya cuma bantuan, bukan verifikasi sah — tetap cek manual gambarnya.
