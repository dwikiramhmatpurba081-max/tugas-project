# RuangKu UNIMED

Prototipe web responsif untuk menjelajahi ruang kampus, melihat jadwal mingguan, mengajukan peminjaman, dan mengelola permintaan sebagai admin.

## Menjalankan

Buka `index.html` langsung di browser. Tidak perlu menginstal paket atau menjalankan server untuk mencoba prototipe.

## Akun demo

- Pengguna: `mahasiswa@ruangku.id` / `demo123`
- Admin: `admin@ruangku.id` / `demo123`

Pengguna juga dapat membuat akun melalui tombol **Buat akun**.

## Fitur prototipe

- Daftar ruang dan fasilitas dengan pencarian dan filter.
- Kalender jadwal mingguan.
- Form pengajuan dengan validasi jam, kapasitas, dan bentrok waktu.
- Riwayat dan status pengajuan untuk pengguna.
- Dashboard admin, persetujuan atau penolakan dengan catatan, serta pengelolaan ruang dan pengguna.
- Data contoh dan perubahan disimpan pada `localStorage` browser yang digunakan.

## Batasan dan kebutuhan untuk penggunaan nyata

Ini adalah prototipe sisi browser, bukan sistem layanan kampus yang siap dipublikasikan. Data tidak dibagikan antarperangkat, dan akun/password demo hanya simulasi yang disimpan di browser. Jangan memasukkan data pribadi atau mengandalkan prototipe ini untuk mengamankan akun maupun mencegah bentrok di lingkungan produksi.

Agar dapat dipakai oleh banyak pengguna secara nyata, diperlukan backend PHP dan basis data MySQL, hosting/server (misalnya XAMPP atau Laragon untuk pengembangan), autentikasi dan otorisasi server-side, password hashing, validasi bentrok secara transaksional, serta aturan resmi penggunaan ruang. Unggah surat permohonan dan notifikasi juga belum diaktifkan.
