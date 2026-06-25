/**
 * js/manajemen/absensi.js
 * Absensi Harian Karyawan (Check-in / Check-out & Manual Input)
 */

window.AppManajemenAbsensi = {
    data: [],
    karyawanList: [],
    todayStr: new Date().toISOString().split('T')[0],

    render: function() {
        var role = window.currentRole || 'apotek';
        var isStaff = (role === 'klinik' || role === 'apotek');
        var isAdmin = (role === 'admin');

        var html = '<div class="page-enter max-w-5xl">';
        html += '  <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-1">Absensi Karyawan</h2>';
        html += '  <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Rekap kehadiran tanggal ' + new Date(this.todayStr).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</p>';
        
        // Kartu Absensi Diri (Untuk Klinik & Apotek)
        if (isStaff) {
            html += '<div id="my-absensi-card" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">';
            html += '<div class="text-center sm:text-left"><h3 class="font-semibold text-gray-800 dark:text-white">Absensi Kamu Hari Ini</h3><p class="text-xs text-slate-400 mt-1" id="my-status">Memuat status...</p></div>';
            html += '<div id="my-absensi-btn" class="flex gap-2"><!-- Tombol akan diisi via JS --></div>';
            html += '</div>';
        }

        // Tombol Input Manual (Untuk Admin)
        if (isAdmin) {
            html += '<div class="flex justify-end mb-4">';
            html += '<button onclick="AppManajemenAbsensi.openManualForm()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2"><i data-lucide="user-plus" class="w-4 h-4"></i> Input Manual Absen</button>';
        html += '</div>';
        }

        html += '  <div id="absensi-list"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        var pKaryawan = db.collection('karyawan').where('status', '==', 'aktif').get();
        var pAbsensi = db.collection('absensi').where('tanggal', '==', self.todayStr).get();

        Promise.all([pKaryawan, pAbsensi]).then(function(results) {
            self.karyawanList = [];
            results[0].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.karyawanList.push(d); });

            self.data = [];
            results[1].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.data.push(d); });

            // Urutkan list berdasarkan nama
            self.data.sort(function(a, b) { return (a.namaKaryawan || '').localeCompare(b.namaKaryawan || ''); });

            self.renderList();
            
            // Render tombol absensi diri jika staff
            if (window.currentRole === 'klinik' || window.currentRole === 'apotek') {
                self.renderMyAbsensi();
            }
        }).catch(err => Utils.toast('Gagal memuat: ' + err.message, 'error'));
    },

    // ===== LOGIC ABSENSI DIRI (STAFF) =====
    renderMyAbsensi: function() {
        var myUid = firebase.auth().currentUser.uid;
        var myAbsen = this.data.find(function(d) { return d.userId === myUid; });
        
        var btnContainer = document.getElementById('my-absensi-btn');
        var statusEl = document.getElementById('my-status');
        if(!btnContainer || !statusEl) return;

        if (!myAbsen) {
            // Belum absen sama sekali
            statusEl.innerHTML = 'Status: <span class="text-red-500 font-semibold">Belum Check-In</span>';
            btnContainer.innerHTML = '<button onclick="AppManajemenAbsensi.selfCheckIn()" class="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm flex items-center gap-2"><i data-lucide="log-in" class="w-4 h-4"></i> Check-In</button>';
        } else if (myAbsen.checkIn && !myAbsen.checkOut) {
            // Sudah check-in, belum check-out
            var jamMasuk = myAbsen.checkIn.toDate().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            statusEl.innerHTML = 'Status: Masuk pukul <span class="text-green-600 font-semibold">' + jamMasuk + '</span>';
            btnContainer.innerHTML = '<button onclick="AppManajemenAbsensi.selfCheckOut(\'' + myAbsen.id + '\')" class="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm flex items-center gap-2"><i data-lucide="log-out" class="w-4 h-4"></i> Check-Out</button>';
        } else {
            // Sudah check-out
            var jamMasuk2 = myAbsen.checkIn.toDate().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            var jamPulang = myAbsen.checkOut.toDate().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            statusEl.innerHTML = 'Status: Selesai (Masuk ' + jamMasuk2 + ' - Pulang ' + jamPulang + ')';
            btnContainer.innerHTML = '<span class="text-xs text-slate-400 italic">Absensi hari ini selesai.</span>';
        }
        lucide.createIcons();
    },

    selfCheckIn: function() {
        var myUid = firebase.auth().currentUser.uid;
        var myName = window.currentUserName || 'Karyawan';
        
        db.collection('absensi').add({
            tanggal: this.todayStr,
            userId: myUid,
            namaKaryawan: myName,
            checkIn: firebase.firestore.FieldValue.serverTimestamp(),
            checkOut: null,
            inputOleh: 'Self-Check',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            Utils.toast('Berhasil Check-In!', 'success');
            AppManajemenAbsensi.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    },

    selfCheckOut: function(id) {
        db.collection('absensi').doc(id).update({
            checkOut: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            Utils.toast('Berhasil Check-Out. Hati-hati di jalan!', 'success');
            AppManajemenAbsensi.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    },

    // ===== TABEL REKAP (ADMIN & KEUANGAN) =====
    renderList: function() {
        var container = document.getElementById('absensi-list');
        if (!container) return;

        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<table class="w-full text-sm">';
        html += '<thead><tr class="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase tracking-wider">';
        html += '<th class="px-4 py-3 text-left">Nama Karyawan</th>';
        html += '<th class="px-4 py-3 text-center">Jam Masuk</th>';
        html += '<th class="px-4 py-3 text-center">Jam Pulang</th>';
        html += '<th class="px-4 py-3 text-center">Status</th>';
        if (window.currentRole === 'admin') html += '<th class="px-4 py-3 text-right">Aksi</th>';
        html += '</tr></thead><tbody>';
        
        // Gabungkan list karyawan dengan data absensi
        var karyawanHadirIds = this.data.map(d => d.userId);
        
        // Tampilkan yang sudah absen
        if (this.data.length === 0 && this.karyawanList.length === 0) {
            html += '<tr><td colspan="4" class="text-center py-6 text-slate-400">Tidak ada data.</td></tr>';
        } else {
            // Tampilkan karyawan yang SUDAH absen
            this.data.forEach(function(a) {
                var jamMasuk = a.checkIn ? a.checkIn.toDate().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
                var jamPulang = a.checkOut ? a.checkOut.toDate().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
                var statusBadge = a.checkOut ? '<span class="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">Selesai</span>' : '<span class="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">Bertugas</span>';
                
                html += '<tr class="border-t border-slate-100 dark:border-slate-700">';
                html += '<td class="px-4 py-3 font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(a.namaKaryawan) + '</td>';
                html += '<td class="px-4 py-3 text-center text-slate-600 dark:text-slate-300">' + jamMasuk + '</td>';
                html += '<td class="px-4 py-3 text-center text-slate-600 dark:text-slate-300">' + jamPulang + '</td>';
                html += '<td class="px-4 py-3 text-center">' + statusBadge + '</td>';
                if (window.currentRole === 'admin') {
                    html += '<td class="px-4 py-3 text-right"><button onclick="AppManajemenAbsensi.hapusAbsen(\'' + a.id + '\')" class="text-xs text-red-500 hover:underline">Hapus</button></td>';
                }
                html += '</tr>';
            });

            // Tampilkan karyawan yang BELUM absen (hanya untuk admin)
            if (window.currentRole === 'admin') {
                this.karyawanList.forEach(function(k) {
                    if (!karyawanHadirIds.includes(k.id) && !k.userId) { // Asumsi karyawan tanpa userId adalah non-app user, atau cek manual
                        // Sebenarnya untuk akurasi, absensi app ini dipakai oleh users. 
                        // Jadi kita tampilkan karyawan yang belum ada datanya di hari ini.
                    }
                });
            }
        }

        html += '</tbody></table></div>';
        container.innerHTML = html;
        lucide.createIcons();
    },

    // ===== INPUT MANUAL OLEH ADMIN =====
    openManualForm: function() {
        var html = '<div class="p-6">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">Input Manual Absen</h3><button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';
        html += '<form id="form-manual" class="space-y-4">';
        
        html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Pilih Karyawan *</label><select id="man-kary" required class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Pilih --</option>';
        this.karyawanList.forEach(k => {
            html += '<option value="' + k.id + '" data-nama="' + Utils.escapeHtml(k.nama) + '">' + Utils.escapeHtml(k.nama) + ' (' + Utils.escapeHtml(k.departemen || '-') + ')</option>';
        });
        html += '</select></div>';

        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Jam Masuk</label><input type="time" id="man-masuk" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Jam Pulang</label><input type="time" id="man-pulang" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        html += '</div>';

        html += '<div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-6 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg">Simpan</button>';
        html += '</div></form></div>';

        Utils.openModal(html);
        setTimeout(() => {
            document.getElementById('form-manual').addEventListener('submit', function(e) {
                e.preventDefault();
                AppManajemenAbsensi.simpanManual();
            });
        }, 100);
    },

    simpanManual: function() {
        var select = document.getElementById('man-kary');
        var karyId = select.value;
        var namaKary = select.options[select.selectedIndex].getAttribute('data-nama');
        var jamMasuk = document.getElementById('man-masuk').value;
        var jamPulang = document.getElementById('man-pulang').value;

        if (!karyId) { Utils.toast('Pilih karyawan', 'error'); return; }

        // Konversi jam string ke Firestore Timestamp
        var checkInTs = jamMasuk ? firebase.firestore.Timestamp.fromDate(new Date(this.todayStr + 'T' + jamMasuk + ':00')) : null;
        var checkOutTs = jamPulang ? firebase.firestore.Timestamp.fromDate(new Date(this.todayStr + 'T' + jamPulang + ':00')) : null;

        db.collection('absensi').add({
            tanggal: this.todayStr,
            userId: karyId, // Diisi ID karyawan (bisa diupdate jika karyawan punya akun login)
            namaKaryawan: namaKary,
            checkIn: checkInTs,
            checkOut: checkOutTs,
            inputOleh: window.currentUserName || 'Admin',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            Utils.toast('Absen manual tersimpan!', 'success');
            Utils.closeModal();
            AppManajemenAbsensi.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    },

    hapusAbsen: function(id) {
        if (!confirm('Hapus data absensi ini?')) return;
        db.collection('absensi').doc(id).delete().then(() => {
            Utils.toast('Data dihapus.', 'info');
            AppManajemenAbsensi.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    }
};
