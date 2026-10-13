(function () {
  "use strict";

  const STORAGE_KEY = "ruangku-unimed-demo-v1";
  const TODAY = new Date();
  const dateISO = (date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };
  const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  };
  const todayISO = dateISO(TODAY);
  const roomSeed = [
    { id: "R-01", name: "Aula FMIPA", type: "Aula", building: "Gedung 2 · Lantai 1", capacity: 120, status: "Aktif", equipment: "Proyektor, sound system" },
    { id: "R-02", name: "Laboratorium Komputer 1", type: "Laboratorium", building: "Gedung 1 · Lantai 2", capacity: 40, status: "Aktif", equipment: "40 komputer, proyektor" },
    { id: "R-03", name: "Ruang Seminar", type: "Ruang seminar", building: "Gedung 3 · Lantai 1", capacity: 60, status: "Aktif", equipment: "Proyektor, papan tulis" },
    { id: "R-04", name: "Auditorium UNIMED", type: "Auditorium", building: "Gedung Pusat", capacity: 300, status: "Aktif", equipment: "Sound system, proyektor" },
    { id: "R-05", name: "Ruang Rapat A2", type: "Ruang rapat", building: "Gedung A · Lantai 2", capacity: 25, status: "Aktif", equipment: "Layar presentasi, papan tulis" },
    { id: "R-06", name: "Proyektor Portabel", type: "Peralatan", building: "Peminjaman melalui pengelola", capacity: 1, status: "Aktif", equipment: "HDMI, tas pembawa" }
  ];
  const initialData = () => ({
    users: [{ id: "U-ADMIN", name: "Admin RuangKu", email: "admin@ruangku.id", password: "demo123", role: "admin" },
      { id: "U-DEMO", name: "Dwiki Rahmat Purba", email: "mahasiswa@ruangku.id", password: "demo123", role: "user" }],
    rooms: roomSeed,
    bookings: [
      { id: "RK-1001", userId: "U-DEMO", roomId: "R-01", activity: "Seminar Proposal", purpose: "Presentasi proposal penelitian.", date: dateISO(addDays(TODAY, 2)), start: "09:00", end: "12:00", participants: 55, status: "Disetujui", note: "Silakan menghubungi pengelola sebelum kegiatan." },
      { id: "RK-1002", userId: "U-DEMO", roomId: "R-02", activity: "Pelatihan Web Dasar", purpose: "Pelatihan pengembangan web untuk anggota organisasi.", date: dateISO(addDays(TODAY, 3)), start: "13:00", end: "15:00", participants: 30, status: "Menunggu", note: "" },
      { id: "RK-1003", userId: "U-DEMO", roomId: "R-05", activity: "Rapat Himpunan", purpose: "Rapat koordinasi bulanan.", date: dateISO(addDays(TODAY, -4)), start: "10:00", end: "11:30", participants: 18, status: "Ditolak", note: "Ruang sedang dalam pemeliharaan." },
      { id: "RK-1004", userId: "U-DEMO", roomId: "R-03", activity: "Diskusi Kelompok", purpose: "Diskusi persiapan kegiatan akademik.", date: dateISO(addDays(TODAY, 6)), start: "10:00", end: "12:00", participants: 20, status: "Menunggu", note: "" }
    ]
  });
  let db;
  try {
    db = JSON.parse(localStorage.getItem(STORAGE_KEY)) || initialData();
  } catch (error) {
    console.error("Data demo RuangKu tidak dapat dibaca dari penyimpanan browser.", error);
    db = initialData();
    notify("Penyimpanan lokal tidak dapat dibaca. Data contoh sementara digunakan.", true);
  }
  if (!db.users || !db.rooms || !db.bookings) db = initialData();

  let currentUser = null;
  let currentPage = "home";
  let adminTab = "dashboard";
  let roomSearch = "";
  let roomTypeFilter = "Semua jenis";
  let bookingFilter = "Semua status";
  let scheduleWeekStart = weekStart(TODAY);
  let scheduleRoomId = "Semua ruang";

  const app = document.getElementById("app");
  const topbarActions = document.getElementById("topbar-actions");
  const modalRoot = document.getElementById("modal-root");
  const toastRegion = document.getElementById("toast-region");

  function weekStart(date) {
    const copy = new Date(date);
    const day = (copy.getDay() + 6) % 7;
    copy.setDate(copy.getDate() - day);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (error) {
      console.error("Data RuangKu gagal disimpan ke penyimpanan browser.", error);
      notify("Data gagal disimpan. Periksa ruang penyimpanan browser.", true);
    }
  }
  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }
  function formatDate(value, options) {
    if (!value) return "—";
    const date = new Date(value + "T12:00:00");
    return new Intl.DateTimeFormat("id-ID", options || { day: "numeric", month: "short", year: "numeric" }).format(date);
  }
  function notify(message, isError) {
    const toast = document.createElement("div");
    toast.className = "toast" + (isError ? " error" : "");
    toast.textContent = message;
    toastRegion.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3600);
  }
  function roomById(id) {
    return db.rooms.find((room) => room.id === id);
  }
  function userById(id) {
    return db.users.find((user) => user.id === id);
  }
  function statusClass(status) {
    return "status-" + String(status).toLowerCase().replace(/\s+/g, "-");
  }
  function statusBadge(status) {
    return `<span class="status ${statusClass(status)}">${escapeHTML(status)}</span>`;
  }
  function overlaps(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && bStart < aEnd;
  }
  function bookingConflicts(roomId, date, start, end, excludeId, onlyApproved) {
    return db.bookings.some((booking) =>
      booking.id !== excludeId &&
      booking.roomId === roomId &&
      booking.date === date &&
      (onlyApproved ? booking.status === "Disetujui" : ["Menunggu", "Disetujui"].includes(booking.status)) &&
      overlaps(start, end, booking.start, booking.end)
    );
  }
  function navButton(label, page, extraClass) {
    return `<button class="button ${extraClass || "button-light"}" data-page="${page}">${label}</button>`;
  }
  function updateTopbar() {
    if (!currentUser) {
      topbarActions.innerHTML = `<button class="button button-quiet" data-action="auth" data-mode="login">Masuk</button><button class="button button-primary" data-action="auth" data-mode="register">Buat akun</button>`;
    } else {
      const initial = escapeHTML(currentUser.name.trim().charAt(0).toUpperCase());
      topbarActions.innerHTML = `<button class="user-pill" data-page="${currentUser.role === "admin" ? "admin" : "dashboard"}"><span class="avatar">${initial}</span><span class="user-name">${escapeHTML(currentUser.name)}</span></button><button class="button button-quiet" data-action="logout">Keluar</button>`;
    }
  }
  function renderHome() {
    const activeRooms = db.rooms.filter((room) => room.status === "Aktif");
    const futureBookings = db.bookings.filter((booking) => booking.date >= todayISO && booking.status === "Disetujui").length;
    const pendingCount = db.bookings.filter((booking) => booking.status === "Menunggu").length;
    const featured = activeRooms.slice(0, 3);
    return `<section class="hero">
      <div class="hero-content">
        <span class="eyebrow">Layanan fasilitas kampus</span>
        <h1>Ruang untuk ide besar <em>dimulai di sini.</em></h1>
        <p class="hero-copy">Temukan ruang yang tepat, periksa jadwalnya, dan ajukan peminjaman kampus dengan lebih mudah dan tertib.</p>
        <div class="hero-buttons"><button class="button button-primary" data-action="book">Ajukan peminjaman <span aria-hidden="true">↗</span></button><button class="button button-light" data-page="schedule">Lihat jadwal</button></div>
      </div>
      <div class="hero-art" aria-hidden="true"><div class="art-chip art-chip-top"><span class="chip-icon">⌂</span><span>Fasilitas kampus<strong>${activeRooms.length} ruang terdaftar</strong></span></div><div class="building"><div class="window-grid">${Array.from({ length: 8 }, () => '<span class="window"></span>').join("")}</div></div><div class="art-chip art-chip-bottom"><span class="online-dot"></span><span>Jadwal terkelola<strong>${futureBookings} peminjaman disetujui</strong></span></div></div>
    </section>
    <div class="stats-row">
      <div class="stat-card"><span class="stat-icon">⌂</span><div><strong>${activeRooms.length}</strong><span>Ruang & fasilitas aktif</span></div></div>
      <div class="stat-card"><span class="stat-icon">▦</span><div><strong>${futureBookings}</strong><span>Jadwal terkonfirmasi</span></div></div>
      <div class="stat-card"><span class="stat-icon">◷</span><div><strong>${pendingCount}</strong><span>Pengajuan menunggu</span></div></div>
    </div>
    <section class="section">
      <div class="section-heading"><div><h2>Temukan ruang yang sesuai</h2><p>Beberapa ruang dan fasilitas yang dapat dipinjam.</p></div><button class="button button-quiet" data-page="rooms">Lihat semua ruang →</button></div>
      <div class="room-grid">${featured.map((room) => roomCard(room)).join("")}</div>
    </section>
    <section class="section">
      <div class="section-heading"><div><h2>Semudah tiga langkah</h2><p>Ajukan dan pantau peminjaman tanpa proses yang berbelit.</p></div></div>
      <div class="how-grid"><article class="how-item"><span class="how-number">01</span><div><h3>Pilih ruang & jadwal</h3><p>Jelajahi fasilitas kampus dan pastikan waktu yang kamu inginkan tersedia.</p></div></article><article class="how-item"><span class="how-number">02</span><div><h3>Kirim pengajuan</h3><p>Lengkapi informasi kegiatan. Sistem membantu memeriksa bentrok jadwal.</p></div></article><article class="how-item"><span class="how-number">03</span><div><h3>Pantau persetujuan</h3><p>Lihat status pengajuan dan catatan pengelola langsung dari akunmu.</p></div></article></div>
    </section>
    <div class="notice"><span>ⓘ</span><span><strong>Prototipe demo:</strong> Data contoh disimpan di browser pada perangkat ini. Jangan gunakan informasi pribadi atau mengunggah berkas sensitif.</span></div>`;
  }
  function roomCard(room) {
    const index = Math.max(0, db.rooms.findIndex((item) => item.id === room.id)) % 6 + 1;
    const busyToday = bookingConflicts(room.id, todayISO, "00:00", "23:59", null, true);
    const active = room.status === "Aktif";
    return `<article class="room-card"><div class="room-visual visual-${index}"><span class="availability ${busyToday ? "busy" : ""}">${!active ? "Tidak tersedia" : busyToday ? "Terjadwal hari ini" : "Lihat jadwal"}</span></div><div class="room-body"><span class="room-type">${escapeHTML(room.type)}</span><h3>${escapeHTML(room.name)}</h3><div class="room-meta"><span>⌖ ${escapeHTML(room.building)}</span><span>♙ ${Number(room.capacity)} ${room.type === "Peralatan" ? "unit" : "orang"}</span></div><div class="room-footer"><span>${escapeHTML(room.equipment)}</span><button class="button button-light button-small" data-action="book" data-room="${escapeHTML(room.id)}" ${!active ? "disabled" : ""}>Ajukan →</button></div></div></article>`;
  }
  function renderRooms() {
    const types = ["Semua jenis", ...new Set(db.rooms.map((room) => room.type))];
    const search = roomSearch.trim().toLowerCase();
    const shown = db.rooms.filter((room) => (roomTypeFilter === "Semua jenis" || room.type === roomTypeFilter) &&
      (!search || [room.name, room.type, room.building, room.equipment].join(" ").toLowerCase().includes(search)));
    return `<div class="page-content"><div class="page-heading"><div><h1>Jelajahi ruang</h1><p>Temukan fasilitas kampus untuk mendukung kegiatanmu.</p></div><button class="button button-primary" data-action="book">＋ Ajukan peminjaman</button></div>
      <div class="filter-bar"><label class="search-field"><input class="field-control" id="room-search" type="search" placeholder="Cari nama ruang, lokasi, fasilitas..." value="${escapeHTML(roomSearch)}"></label><select class="field-control" id="room-type-filter" aria-label="Filter jenis ruang">${types.map((type) => `<option ${roomTypeFilter === type ? "selected" : ""}>${escapeHTML(type)}</option>`).join("")}</select></div>
      ${shown.length ? `<div class="room-grid">${shown.map((room) => roomCard(room)).join("")}</div>` : `<div class="panel empty-state"><span class="empty-symbol">⌕</span><strong>Ruang tidak ditemukan</strong><span>Coba kata kunci atau jenis fasilitas yang lain.</span></div>`}
      <div class="notice"><span>ⓘ</span><span>Jadwal yang terlihat menunjukkan peminjaman berstatus disetujui. Pilih tanggal dan waktu pada formulir untuk mengecek ketersediaan.</span></div></div>`;
  }
  function renderSchedule() {
    const days = Array.from({ length: 7 }, (_, index) => addDays(scheduleWeekStart, index));
    const times = ["08:00", "10:00", "12:00", "14:00", "16:00"];
    const roomBookings = db.bookings.filter((booking) => booking.status === "Disetujui" || booking.status === "Menunggu")
      .filter((booking) => scheduleRoomId === "Semua ruang" || booking.roomId === scheduleRoomId)
      .filter((booking) => booking.date >= dateISO(days[0]) && booking.date <= dateISO(days[6]));
    const bookingCards = (date, slotStart, slotEnd) => {
      const found = roomBookings.filter((booking) => booking.date === date && overlaps(slotStart, slotEnd, booking.start, booking.end));
      if (!found.length) return '<span class="empty-cell">—</span>';
      return found.map((booking) => `<span class="schedule-booking ${booking.status === "Menunggu" ? "pending" : ""}">${escapeHTML(booking.activity)}<small>${escapeHTML(booking.start)}–${escapeHTML(booking.end)} · ${escapeHTML(roomById(booking.roomId)?.name || "Ruang")}</small></span>`).join("");
    };
    const weekText = `${formatDate(dateISO(days[0]), { day: "numeric", month: "short" })} – ${formatDate(dateISO(days[6]), { day: "numeric", month: "short", year: "numeric" })}`;
    return `<div class="page-content"><div class="page-heading"><div><h1>Jadwal ruang</h1><p>Cek jadwal mingguan sebelum mengajukan peminjaman.</p></div></div>
      <section class="panel"><div class="panel-head"><div class="schedule-controls"><button class="button button-light button-small" data-action="week-prev" aria-label="Minggu sebelumnya">←</button><span class="week-label">${weekText}</span><button class="button button-light button-small" data-action="week-next" aria-label="Minggu selanjutnya">→</button><button class="button button-quiet button-small" data-action="week-today">Hari ini</button></div><select class="field-control" id="schedule-room"><option>Semua ruang</option>${db.rooms.map((room) => `<option value="${escapeHTML(room.id)}" ${scheduleRoomId === room.id ? "selected" : ""}>${escapeHTML(room.name)}</option>`).join("")}</select></div>
      <div class="panel-body"><div class="schedule-table-wrap"><table class="schedule-table"><thead><tr><th>Waktu</th>${days.map((day) => `<th>${new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(day)}<strong>${formatDate(dateISO(day), { day: "numeric", month: "short" })}</strong></th>`).join("")}</tr></thead><tbody>${times.slice(0, -1).map((time, index) => { const next = times[index + 1]; return `<tr><td>${time}<br>${next}</td>${days.map((day) => `<td>${bookingCards(dateISO(day), time, next)}</td>`).join("")}</tr>`; }).join("")}</tbody></table></div><div class="legend"><span><i></i> Disetujui</span><span><i class="pending-dot"></i> Menunggu</span><span>Jadwal berdasarkan data pada prototipe ini</span></div></div></section></div>`;
  }
  function bookingRows(bookings, isAdmin) {
    if (!bookings.length) return `<tr><td colspan="${isAdmin ? 6 : 5}"><div class="empty-state"><span class="empty-symbol">▦</span><strong>Belum ada pengajuan</strong><span>Pengajuan peminjamanmu akan ditampilkan di sini.</span></div></td></tr>`;
    return bookings.map((booking) => {
      const room = roomById(booking.roomId);
      const user = userById(booking.userId);
      return `<tr><td><strong>${escapeHTML(booking.id)}</strong><br><span class="room-type">${formatDate(booking.date)}</span></td>${isAdmin ? `<td><strong>${escapeHTML(user?.name || "Pengguna")}</strong><br><span class="room-type">${escapeHTML(user?.email || "")}</span></td>` : ""}<td><strong>${escapeHTML(booking.activity)}</strong><br><span class="room-type">${escapeHTML(booking.start)}–${escapeHTML(booking.end)} · ${Number(booking.participants)} orang</span></td><td>${escapeHTML(room?.name || "Ruang dihapus")}</td><td>${statusBadge(booking.status)}</td><td><div class="table-actions">${isAdmin && booking.status === "Menunggu" ? `<button class="button button-primary button-small" data-action="booking-approve" data-id="${escapeHTML(booking.id)}">Setujui</button><button class="button button-danger button-small" data-action="booking-reject" data-id="${escapeHTML(booking.id)}">Tolak</button>` : `<button class="button button-light button-small" data-action="booking-detail" data-id="${escapeHTML(booking.id)}">Detail</button>`}</div></td></tr>`;
    }).join("");
  }
  function renderUserDashboard() {
    if (!currentUser) return renderHome();
    const bookings = db.bookings.filter((item) => item.userId === currentUser.id).sort((a, b) => b.date.localeCompare(a.date));
    const pending = bookings.filter((item) => item.status === "Menunggu").length;
    const approved = bookings.filter((item) => item.status === "Disetujui").length;
    return `<div class="page-content"><div class="page-heading"><div><h1>Dashboard pengguna</h1><p>Pantau status dan riwayat peminjamanmu.</p></div><button class="button button-primary" data-action="book">＋ Ajukan peminjaman</button></div>
      <div class="dashboard-grid"><aside class="panel side-menu"><button class="selected" data-page="dashboard"><span class="menu-icon">▦</span>Ringkasan</button><button data-page="rooms"><span class="menu-icon">⌂</span>Jelajahi ruang</button><button data-page="schedule"><span class="menu-icon">▤</span>Jadwal ruang</button><button data-action="auth" data-mode="profile"><span class="menu-icon">◉</span>Profil saya</button></aside>
      <div class="dash-main"><div class="welcome-strip"><div><h2>Halo, ${escapeHTML(currentUser.name.split(" ")[0])} 👋</h2><p>Ini ringkasan aktivitas peminjamanmu.</p></div></div><div class="metric-grid"><div class="metric"><span>Total pengajuan</span><strong>${bookings.length}</strong></div><div class="metric"><span>Menunggu</span><strong>${pending}</strong></div><div class="metric"><span>Disetujui</span><strong>${approved}</strong></div><div class="metric"><span>Ditolak / selesai</span><strong>${bookings.filter((item) => ["Ditolak", "Selesai"].includes(item.status)).length}</strong></div></div>
      <section class="panel"><div class="panel-head"><h2>Riwayat peminjaman</h2><span class="room-type">${bookings.length} pengajuan</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>ID / tanggal</th><th>Kegiatan</th><th>Ruang</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${bookingRows(bookings, false)}</tbody></table></div></section></div></div></div>`;
  }
  function renderAdmin() {
    if (!currentUser || currentUser.role !== "admin") return renderHome();
    const allBookings = [...db.bookings].sort((a, b) => b.date.localeCompare(a.date));
    const counts = {
      total: db.bookings.length,
      waiting: db.bookings.filter((item) => item.status === "Menunggu").length,
      approved: db.bookings.filter((item) => item.status === "Disetujui").length,
      rejected: db.bookings.filter((item) => item.status === "Ditolak").length
    };
    const visible = bookingFilter === "Semua status" ? allBookings : allBookings.filter((item) => item.status === bookingFilter);
    const tabs = [["dashboard", "▦", "Ringkasan"], ["bookings", "▤", "Data peminjaman"], ["rooms", "⌂", "Data ruang"], ["users", "◉", "Data pengguna"], ["schedule", "▧", "Jadwal ruang"]];
    let content;
    if (adminTab === "dashboard") {
      const recent = allBookings.slice(0, 5);
      const totalRooms = db.rooms.filter((room) => room.status === "Aktif").length;
      content = `<div class="welcome-strip"><div><h2>Dashboard admin</h2><p>Ringkasan aktivitas fasilitas kampus.</p></div><button class="button button-primary" data-admin-tab="bookings">Lihat pengajuan →</button></div><div class="metric-grid"><div class="metric"><span>Total pengajuan</span><strong>${counts.total}</strong></div><div class="metric"><span>Menunggu persetujuan</span><strong>${counts.waiting}</strong></div><div class="metric"><span>Disetujui</span><strong>${counts.approved}</strong></div><div class="metric"><span>Ruang aktif</span><strong>${totalRooms}</strong></div></div><section class="panel"><div class="panel-head"><h2>Pengajuan terbaru</h2><button class="button button-quiet button-small" data-admin-tab="bookings">Semua pengajuan →</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>ID / tanggal</th><th>Pemohon</th><th>Kegiatan</th><th>Ruang</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${bookingRows(recent, true)}</tbody></table></div></section>`;
    } else if (adminTab === "bookings") {
      content = `<div class="welcome-strip"><div><h2>Data peminjaman</h2><p>Periksa permintaan dan berikan keputusan.</p></div></div><div class="filter-bar"><select class="field-control" id="booking-filter" aria-label="Filter status"><option>Semua status</option>${["Menunggu", "Disetujui", "Ditolak", "Selesai"].map((status) => `<option ${bookingFilter === status ? "selected" : ""}>${status}</option>`).join("")}</select></div><section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>ID / tanggal</th><th>Pemohon</th><th>Kegiatan</th><th>Ruang</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${bookingRows(visible, true)}</tbody></table></div></section>`;
    } else if (adminTab === "rooms") {
      content = `<div class="welcome-strip"><div><h2>Data ruang & fasilitas</h2><p>Kelola ruang yang tersedia untuk dipinjam.</p></div><button class="button button-primary" data-action="room-add">＋ Tambah ruang</button></div><section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Nama ruang</th><th>Jenis</th><th>Lokasi</th><th>Kapasitas</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${db.rooms.map((room) => `<tr><td><strong>${escapeHTML(room.name)}</strong><br><span class="room-type">${escapeHTML(room.equipment)}</span></td><td>${escapeHTML(room.type)}</td><td>${escapeHTML(room.building)}</td><td>${Number(room.capacity)}</td><td><span class="status ${room.status === "Aktif" ? "status-disetujui" : "status-ditolak"}">${room.status === "Aktif" ? "Aktif" : "Tidak tersedia"}</span></td><td><div class="table-actions"><button class="button button-light button-small" data-action="room-toggle" data-id="${escapeHTML(room.id)}">${room.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"}</button></div></td></tr>`).join("")}</tbody></table></div></section>`;
    } else if (adminTab === "users") {
      content = `<div class="welcome-strip"><div><h2>Data pengguna</h2><p>Pengguna yang terdaftar pada prototipe ini.</p></div><span class="room-type">${db.users.length} akun</span></div><section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th>Jumlah pengajuan</th></tr></thead><tbody>${db.users.map((user) => `<tr><td><strong>${escapeHTML(user.name)}</strong></td><td>${escapeHTML(user.email)}</td><td>${user.role === "admin" ? "Admin" : "Pengguna"}</td><td>${db.bookings.filter((item) => item.userId === user.id).length}</td></tr>`).join("")}</tbody></table></div></section><div class="notice"><span>ⓘ</span><span>Data pengguna ini tersimpan hanya di browser yang sedang digunakan dan tidak dibagikan ke perangkat lain.</span></div>`;
    } else {
      content = `<div class="welcome-strip"><div><h2>Jadwal ruang</h2><p>Lihat seluruh jadwal peminjaman yang tercatat.</p></div><button class="button button-light" data-page="schedule">Buka kalender mingguan →</button></div><div class="metric-grid"><div class="metric"><span>Menunggu</span><strong>${counts.waiting}</strong></div><div class="metric"><span>Disetujui</span><strong>${counts.approved}</strong></div><div class="metric"><span>Ditolak</span><strong>${counts.rejected}</strong></div><div class="metric"><span>Ruang terdaftar</span><strong>${db.rooms.length}</strong></div></div><section class="panel"><div class="panel-head"><h2>Peminjaman mendatang</h2></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Tanggal</th><th>Kegiatan</th><th>Ruang</th><th>Waktu</th><th>Status</th></tr></thead><tbody>${allBookings.filter((item) => item.date >= todayISO).slice(0, 8).map((item) => `<tr><td>${formatDate(item.date)}</td><td>${escapeHTML(item.activity)}</td><td>${escapeHTML(roomById(item.roomId)?.name || "—")}</td><td>${escapeHTML(item.start)}–${escapeHTML(item.end)}</td><td>${statusBadge(item.status)}</td></tr>`).join("") || `<tr><td colspan="5"><div class="empty-state">Belum ada jadwal mendatang.</div></td></tr>`}</tbody></table></div></section>`;
    }
    return `<div class="page-content"><div class="page-heading"><div><h1>Panel pengelola</h1><p>Kelola pengajuan dan fasilitas RuangKu UNIMED.</p></div></div><div class="dashboard-grid"><aside class="panel side-menu">${tabs.map(([key, icon, label]) => `<button class="${adminTab === key ? "selected" : ""}" data-admin-tab="${key}"><span class="menu-icon">${icon}</span>${label}</button>`).join("")}</aside><div class="dash-main">${content}</div></div></div>`;
  }
  function render() {
    updateTopbar();
    document.querySelectorAll(".nav-link").forEach((button) => {
      button.classList.toggle("active", button.dataset.page === currentPage || (currentPage === "admin" && button.dataset.page === "home") || (currentPage === "dashboard" && button.dataset.page === "home"));
    });
    if (currentPage === "rooms") app.innerHTML = renderRooms();
    else if (currentPage === "schedule") app.innerHTML = renderSchedule();
    else if (currentPage === "dashboard") app.innerHTML = renderUserDashboard();
    else if (currentPage === "admin") app.innerHTML = renderAdmin();
    else app.innerHTML = renderHome();
  }
  function navigate(page) {
    if (page === "dashboard" && !currentUser) { openAuth("login"); return; }
    if (page === "admin" && (!currentUser || currentUser.role !== "admin")) { openAuth("login"); notify("Masuk sebagai admin untuk membuka panel pengelola."); return; }
    currentPage = page;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function openModal(title, subtitle, content) {
    modalRoot.innerHTML = `<div class="modal-backdrop" data-action="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-header"><div><h2 id="modal-title">${title}</h2><p>${subtitle || ""}</p></div><button class="modal-close" data-action="modal-close" aria-label="Tutup">×</button></header><div class="modal-content">${content}</div></section></div>`;
    const firstInput = modalRoot.querySelector("input,select,textarea");
    if (firstInput) firstInput.focus();
  }
  function closeModal() {
    modalRoot.innerHTML = "";
  }
  function openAuth(mode) {
    if (mode === "profile" && currentUser) {
      openModal("Profil saya", "Informasi akun pada prototipe ini.", `<p><strong>${escapeHTML(currentUser.name)}</strong><br>${escapeHTML(currentUser.email)}<br>Peran: ${currentUser.role === "admin" ? "Admin" : "Pengguna"}</p><div class="notice"><span>ⓘ</span><span>Data profil tersimpan lokal. Autentikasi ini hanya simulasi untuk demo.</span></div>`);
      return;
    }
    const isRegister = mode === "register";
    openModal(isRegister ? "Buat akun RuangKu" : "Selamat datang kembali", isRegister ? "Daftar untuk mengajukan peminjaman ruang." : "Masuk ke akun pengguna atau pengelola.", `<div class="auth-tabs"><button class="${isRegister ? "" : "active"}" data-action="auth" data-mode="login">Masuk</button><button class="${isRegister ? "active" : ""}" data-action="auth" data-mode="register">Daftar</button></div><form id="auth-form"><div class="form-grid">${isRegister ? `<div class="form-group full"><label for="auth-name">Nama lengkap</label><input class="field-control" id="auth-name" name="name" required maxlength="80" autocomplete="name"></div>` : ""}<div class="form-group full"><label for="auth-email">Email</label><input class="field-control" id="auth-email" name="email" type="email" required autocomplete="email" placeholder="nama@email.com"></div><div class="form-group full"><label for="auth-password">Password</label><input class="field-control" id="auth-password" name="password" type="password" required minlength="6" autocomplete="${isRegister ? "new-password" : "current-password"}"></div></div><div class="form-actions"><button type="button" class="button button-light" data-action="modal-close">Batal</button><button class="button button-primary" type="submit">${isRegister ? "Buat akun" : "Masuk"}</button></div></form>${!isRegister ? `<div class="demo-credentials"><strong>Akun demo</strong><br>Pengguna: mahasiswa@ruangku.id / demo123<br>Admin: admin@ruangku.id / demo123</div>` : `<div class="notice"><span>ⓘ</span><span>Akun demo disimpan di browser ini saja. Jangan gunakan kata sandi yang dipakai pada layanan lain.</span></div>`}`);
    const form = document.getElementById("auth-form");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const email = String(formData.get("email")).trim().toLowerCase();
      const password = String(formData.get("password"));
      if (isRegister) {
        const name = String(formData.get("name")).trim();
        if (name.length < 2) { notify("Masukkan nama lengkap.", true); return; }
        if (db.users.some((user) => user.email.toLowerCase() === email)) { notify("Email tersebut sudah terdaftar.", true); return; }
        const user = { id: "U-" + Date.now(), name, email, password, role: "user" };
        db.users.push(user);
        persist();
        currentUser = user;
        closeModal();
        navigate("dashboard");
        notify("Akun berhasil dibuat. Selamat datang di RuangKu!");
      } else {
        const user = db.users.find((item) => item.email.toLowerCase() === email && item.password === password);
        if (!user) { notify("Email atau password tidak cocok.", true); return; }
        currentUser = user;
        closeModal();
        navigate(user.role === "admin" ? "admin" : "dashboard");
        notify("Berhasil masuk. Halo, " + user.name.split(" ")[0] + "!");
      }
    });
  }
  function openBooking(roomId) {
    if (!currentUser) { openAuth("login"); notify("Masuk atau buat akun sebelum mengajukan peminjaman."); return; }
    const activeRooms = db.rooms.filter((room) => room.status === "Aktif");
    if (!activeRooms.length) { notify("Belum ada ruang yang aktif untuk dipinjam.", true); return; }
    const selected = activeRooms.find((room) => room.id === roomId) || activeRooms[0];
    openModal("Ajukan peminjaman", "Lengkapi detail kegiatanmu. Waktu akan diperiksa dari jadwal yang tercatat.", `<form id="booking-form"><div class="form-grid"><div class="form-group full"><label for="booking-room">Ruang / fasilitas</label><select class="field-control" name="roomId" id="booking-room" required>${activeRooms.map((room) => `<option value="${escapeHTML(room.id)}" ${room.id === selected.id ? "selected" : ""}>${escapeHTML(room.name)} · kapasitas ${Number(room.capacity)}</option>`).join("")}</select></div><div class="form-group"><label for="booking-date">Tanggal</label><input class="field-control" type="date" id="booking-date" name="date" min="${todayISO}" value="${todayISO}" required></div><div class="form-group"><label for="booking-participants">Jumlah peserta</label><input class="field-control" type="number" id="booking-participants" name="participants" min="1" max="${Number(selected.capacity)}" value="10" required></div><div class="form-group"><label for="booking-start">Jam mulai</label><input class="field-control" type="time" id="booking-start" name="start" value="09:00" required></div><div class="form-group"><label for="booking-end">Jam selesai</label><input class="field-control" type="time" id="booking-end" name="end" value="11:00" required></div><div class="form-group full"><label for="booking-activity">Nama kegiatan</label><input class="field-control" id="booking-activity" name="activity" maxlength="100" placeholder="Contoh: Seminar Proposal" required></div><div class="form-group full"><label for="booking-purpose">Keperluan</label><textarea class="field-control" id="booking-purpose" name="purpose" maxlength="500" placeholder="Jelaskan keperluan penggunaan ruang..." required></textarea></div><div class="form-group full"><span class="hint">Surat permohonan: unggah berkas belum diaktifkan pada prototipe ini.</span></div></div><div id="conflict-message"></div><div class="form-actions"><button type="button" class="button button-light" data-action="modal-close">Batal</button><button class="button button-primary" type="submit">Kirim pengajuan</button></div></form>`);
    const roomSelect = document.getElementById("booking-room");
    const capacity = document.getElementById("booking-participants");
    roomSelect.addEventListener("change", () => { capacity.max = String(roomById(roomSelect.value)?.capacity || 1); });
    document.getElementById("booking-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const values = Object.fromEntries(data.entries());
      const room = roomById(values.roomId);
      if (!room || room.status !== "Aktif") { notify("Pilih ruang yang masih aktif.", true); return; }
      if (values.end <= values.start) { notify("Jam selesai harus lebih akhir dari jam mulai.", true); return; }
      if (Number(values.participants) > Number(room.capacity)) { notify("Jumlah peserta melebihi kapasitas ruang.", true); return; }
      if (bookingConflicts(values.roomId, values.date, values.start, values.end, null, false)) {
        document.getElementById("conflict-message").innerHTML = `<div class="notice" style="border-color:#eed3cc;background:#fff6f3;color:#974d42"><span>!</span><span>Jadwal ini bentrok dengan pengajuan lain. Silakan pilih waktu yang berbeda.</span></div>`;
        return;
      }
      const booking = { id: "RK-" + (1000 + Date.now().toString().slice(-5)), userId: currentUser.id, roomId: room.id, activity: String(values.activity).trim(), purpose: String(values.purpose).trim(), date: values.date, start: values.start, end: values.end, participants: Number(values.participants), status: "Menunggu", note: "" };
      db.bookings.push(booking);
      persist();
      closeModal();
      currentPage = currentUser.role === "admin" ? "admin" : "dashboard";
      if (currentUser.role === "admin") adminTab = "bookings";
      render();
      notify("Pengajuan terkirim dan menunggu persetujuan admin.");
    });
  }
  function approveBooking(id) {
    const booking = db.bookings.find((item) => item.id === id);
    if (!booking || booking.status !== "Menunggu") return;
    if (bookingConflicts(booking.roomId, booking.date, booking.start, booking.end, booking.id, true)) {
      notify("Tidak dapat disetujui: sudah ada peminjaman disetujui pada waktu tersebut.", true);
      return;
    }
    booking.status = "Disetujui";
    booking.note = "Pengajuan disetujui. Harap menggunakan ruang sesuai jadwal.";
    persist();
    render();
    notify("Pengajuan " + booking.id + " disetujui.");
  }
  function rejectBooking(id) {
    const booking = db.bookings.find((item) => item.id === id);
    if (!booking || booking.status !== "Menunggu") return;
    openModal("Tolak pengajuan", `Berikan catatan untuk pengajuan ${escapeHTML(id)}.`, `<form id="reject-form"><div class="form-group"><label for="reject-note">Catatan admin</label><textarea class="field-control" id="reject-note" name="note" maxlength="300" placeholder="Jelaskan alasan penolakan..." required></textarea></div><div class="form-actions"><button type="button" class="button button-light" data-action="modal-close">Batal</button><button type="submit" class="button button-danger">Tolak pengajuan</button></div></form>`);
    document.getElementById("reject-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const note = String(new FormData(event.currentTarget).get("note")).trim();
      if (!note) return;
      booking.status = "Ditolak";
      booking.note = note;
      persist();
      closeModal();
      render();
      notify("Pengajuan " + booking.id + " ditolak.");
    });
  }
  function showBookingDetail(id) {
    const booking = db.bookings.find((item) => item.id === id);
    if (!booking) return;
    const room = roomById(booking.roomId);
    openModal(`Detail pengajuan ${escapeHTML(booking.id)}`, `${escapeHTML(booking.activity)} · ${statusBadge(booking.status)}`, `<div class="form-grid"><div class="form-group"><label>Ruang</label><span>${escapeHTML(room?.name || "Ruang dihapus")}</span></div><div class="form-group"><label>Tanggal</label><span>${formatDate(booking.date)}</span></div><div class="form-group"><label>Waktu</label><span>${escapeHTML(booking.start)}–${escapeHTML(booking.end)}</span></div><div class="form-group"><label>Jumlah peserta</label><span>${Number(booking.participants)} orang</span></div><div class="form-group full"><label>Keperluan</label><span>${escapeHTML(booking.purpose)}</span></div><div class="form-group full"><label>Catatan admin</label><span>${escapeHTML(booking.note || "Belum ada catatan.")}</span></div></div>`);
  }
  function addRoom() {
    openModal("Tambah ruang / fasilitas", "Masukkan data fasilitas kampus yang akan ditampilkan.", `<form id="room-form"><div class="form-grid"><div class="form-group full"><label for="room-name">Nama</label><input class="field-control" id="room-name" name="name" maxlength="80" required></div><div class="form-group"><label for="room-kind">Jenis</label><input class="field-control" id="room-kind" name="type" maxlength="50" placeholder="Contoh: Aula" required></div><div class="form-group"><label for="room-capacity">Kapasitas / unit</label><input class="field-control" id="room-capacity" name="capacity" type="number" min="1" max="10000" value="30" required></div><div class="form-group full"><label for="room-building">Lokasi</label><input class="field-control" id="room-building" name="building" maxlength="100" required></div><div class="form-group full"><label for="room-equipment">Fasilitas</label><input class="field-control" id="room-equipment" name="equipment" maxlength="120" placeholder="Proyektor, papan tulis..." required></div></div><div class="form-actions"><button type="button" class="button button-light" data-action="modal-close">Batal</button><button type="submit" class="button button-primary">Simpan ruang</button></div></form>`);
    document.getElementById("room-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      db.rooms.push({ id: "R-" + Date.now().toString().slice(-6), name: String(data.name).trim(), type: String(data.type).trim(), building: String(data.building).trim(), capacity: Number(data.capacity), status: "Aktif", equipment: String(data.equipment).trim() });
      persist();
      closeModal();
      render();
      notify("Ruang baru berhasil ditambahkan.");
    });
  }
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-page], [data-action], [data-admin-tab]");
    if (!target) return;
    if (target.dataset.page) { event.preventDefault(); navigate(target.dataset.page); return; }
    if (target.dataset.adminTab) { adminTab = target.dataset.adminTab; render(); return; }
    const action = target.dataset.action;
    if (action === "auth") openAuth(target.dataset.mode || "login");
    else if (action === "logout") { currentUser = null; currentPage = "home"; render(); notify("Kamu sudah keluar."); }
    else if (action === "book") openBooking(target.dataset.room);
    else if (action === "modal-close") closeModal();
    else if (action === "modal-backdrop" && event.target === target) closeModal();
    else if (action === "week-prev") { scheduleWeekStart = addDays(scheduleWeekStart, -7); render(); }
    else if (action === "week-next") { scheduleWeekStart = addDays(scheduleWeekStart, 7); render(); }
    else if (action === "week-today") { scheduleWeekStart = weekStart(TODAY); render(); }
    else if (action === "booking-approve") approveBooking(target.dataset.id);
    else if (action === "booking-reject") rejectBooking(target.dataset.id);
    else if (action === "booking-detail") showBookingDetail(target.dataset.id);
    else if (action === "room-add") addRoom();
    else if (action === "room-toggle") {
      const room = roomById(target.dataset.id);
      if (room) { room.status = room.status === "Aktif" ? "Tidak tersedia" : "Aktif"; persist(); render(); notify("Status " + room.name + " diperbarui."); }
    }
  });
  document.addEventListener("input", (event) => {
    if (event.target.id === "room-search") {
      const start = event.target.selectionStart;
      roomSearch = event.target.value;
      const cursor = start;
      render();
      const input = document.getElementById("room-search");
      input.focus();
      input.setSelectionRange(cursor, cursor);
    }
  });
  document.addEventListener("change", (event) => {
    if (event.target.id === "room-type-filter") { roomTypeFilter = event.target.value; render(); }
    else if (event.target.id === "booking-filter") { bookingFilter = event.target.value; render(); }
    else if (event.target.id === "schedule-room") { scheduleRoomId = event.target.value; render(); }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modalRoot.firstElementChild) closeModal();
  });
  render();
})();
