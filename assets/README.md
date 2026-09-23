# assets/

Taruh file QRIS asli kamu di sini dengan nama persis `qris.png` (boleh `.jpg`/`.jpeg` juga, tinggal sesuaikan nama file `src` di `index.html`, cari `id="qrImage"`).

- Pakai screenshot/export QRIS **statis** dari e-wallet atau mobile banking kamu (DANA, OVO, ShopeePay Merchant, QRIS BCA/bank lain, dll).
- QRIS statis **tidak menyimpan nominal** di dalam kodenya — makanya di halaman pembayaran ada instruksi "masukkan nominal manual" di sebelah gambar QR. Ini normal untuk QRIS gratisan tanpa payment gateway berbayar (Midtrans/Xendit dkk).
- Selama file `qris.png` belum ada di folder ini, halaman pembayaran otomatis nampilin kotak "Taruh file QRIS asli di assets/qris.png" — jadi gampang ketahuan kalau lupa isi.
