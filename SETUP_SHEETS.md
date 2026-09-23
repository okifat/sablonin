# Setup: nyambungin ke Google Sheets + Drive (gratis)

Ini bikin data order beneran ke-share ke satu tempat (Google Sheet) dan file (desain + bukti bayar)
kesimpen di Google Drive — jadi order dari HP customer bisa langsung kelihatan di admin dari device
manapun. Semua gratis, cuma butuh akun Google.

Butuh waktu sekitar 10 menit, sekali aja.

## 1. Bikin Google Sheet

1. Buka [sheets.google.com](https://sheets.google.com), bikin spreadsheet baru.
2. Kasih nama terserah, misal **"Sablonin Orders"**.
3. Biarkan kosong — sheet "Orders" dan "Views" bakal dibikin otomatis sama script pas pertama kali dipanggil.

## 2. Pasang Apps Script

1. Di spreadsheet tadi, klik **Extensions → Apps Script**.
2. Hapus semua kode default di editor yang kebuka.
3. Copy-paste seluruh isi file [`apps-script/Code.gs`](apps-script/Code.gs) dari folder proyek ini ke situ.
4. Klik ikon **Save** (atau Ctrl+S).

## 3. Deploy sebagai Web App

1. Klik tombol **Deploy → New deployment**.
2. Klik ikon gear di sebelah "Select type", pilih **Web app**.
3. Isi:
   - **Execute as:** Me (email kamu)
   - **Who has access:** Anyone
4. Klik **Deploy**.
5. Google bakal minta izin akses (ke Sheet & Drive kamu sendiri) — klik **Authorize access**, pilih akun,
   klik **Advanced → Go to (nama project) (unsafe)** kalau muncul warning (ini normal, karena scriptnya
   belum di-review Google, tapi ini punya kamu sendiri jadi aman), lalu **Allow**.
6. Setelah deploy selesai, **copy URL Web App**-nya (bentuknya `https://script.google.com/macros/s/.../exec`).

## 4. Tempel URL-nya ke situs

Buka dua file ini, cari baris `var API_URL = "";` di bagian paling atas, dan isi di antara tanda kutip:

- `app.js` (situs utama)
- `admin/app.js` (halaman admin)

```js
var API_URL = "https://script.google.com/macros/s/xxxxxxxxxxxxx/exec";
```

Simpan kedua file. Selesai — sekarang:

- Order baru dari `index.html` otomatis nambah baris di tab **Orders** sheet-nya, plus file desain
  ke-upload ke folder Drive **"Sablonin Uploads"**.
- Bukti bayar yang diupload juga ke-upload ke Drive & link-nya ke-isi di kolom `proofFileUrl`.
- Halaman `/admin` otomatis ambil data dari Sheet ini (bukan localStorage lagi), dan ubah status di
  admin langsung update ke Sheet-nya.

## Catatan

- Tombol **"Muat Data Contoh"** dan **"Hapus Semua Data"** di admin cuma jalan ke localStorage — begitu
  `API_URL` diisi, keduanya otomatis disembunyikan karena datanya udah beneran, bukan demo lagi.
- Kalau `API_URL` dikosongin lagi, situs balik ke mode lama (localStorage, per-browser) — gak ada yang rusak.
- Web App ini publik (siapa aja yang tau URL-nya bisa kirim data) tapi cuma bisa **nulis order baru**,
  gak bisa baca/hapus data lain lewat endpoint ini kecuali lewat `doGet` yang nge-return semua order —
  jangan sebar URL `API_URL` ini ke publik/taro di tempat yang gampang ketauan orang luar tim kamu, karena
  isinya bisa dipakai buat lihat semua data order (nama, WA, email pelanggan).
- Kalau mau lebih aman lagi ke depannya, tambahin semacam kode rahasia (`secret`) yang dicek di `doPost`/`doGet`
  sebelum diproses — bilang aja kalau mau saya tambahin.
