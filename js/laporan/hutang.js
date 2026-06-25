/**
 * js/laporan/hutang.js
 * Manajemen Hutang Usaha (Pembayaran Faktur Kredit)
 */

window.AppLaporanHutang = {
    data: [],

    render: function() {
        var html = '<div class="page-enter max-w-5xl">';
        html += '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '    <div>';
        html += '      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Hutang Usaha</h2>';
        html += '      <p class="text-sm text-slate-500 dark:text-slate-400">Daftar faktur pembelian obat secara kredit (tempo)</p>';
        html += '    </div>';
        html += '    <button onclick="AppLaporanHutang.init()" class="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2 self-start"><i data-lucide="refresh-cw" class="w-4 h-4"></i> Refresh Data</button>';
        html += '  </div>';
        html += '  <div id="hutang-content"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        // Ambil semua pembelian yang BUKAN lunas (berarti belum_lunas atau menunggu_approve)
        db.collection('pembelian').where('statusPelunasan', '!=', 'lunas').get().then(snap => {
            self.data = [];
            snap.forEach(doc => { var d = doc.data(); d.id = doc.id; self.data.push(d); });
            
            // Urutkan berdasarkan tanggal jatuh tempo terdekat
            self.data.sort(function(a, b) {
                var tA = a.jatuhTempo ? new Date(a.jatuhTempo).getTime() : 0;
                var tB = b.jatuhTempo ? new Date(b.jatuhTempo).getTime() : 0;
                return tA - tB;
            });

            self.renderList();
        }).catch(err => Utils.toast('Gagal memuat: ' + err.message, 'error'));
    },

    renderList: function() {
        var container = document.getElementById('hutang-content');
        if (!container) return;

        if (this.data.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border p-8 text-center text-slate-400">Tidak ada hutang yang tertunggak. Semua faktur sudah lunas! 🎉</div>';
            return;
        }

        var role = window.currentRole || 'apotek';
        var isApprover = (role === 'admin' || role === 'keuangan');

        var html = '<div class="space-y-3">';
        
        this.data.forEach(function(h) {
            var tglBeli = h.tanggal ? new Date(h.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
            var tglJatuhTempo = h.jatuhTempo ? new Date(h.jatuhTempo).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
            
            // Cek apakah sudah lewat jatuh tempo
            var isOverdue = h.jatuhTempo && new Date(h.jatuhTempo) < new Date();
            var tempoClass = isOverdue ? 'text-red-600 font-bold' : 'text-slate-600 dark:text-slate-300';

            // Badge Status
            var statusBadge = '';
            if (h.statusPelunasan === 'menunggu_approve') {
                statusBadge = '<span class="text-xs bg-amber-100 text-amber-600 px-2 py-1 rounded-full">Menunggu Approve</span>';
            } else {
                statusBadge = '<span class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">Belum Lunas</span>';
            }

            html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row justify-between gap-4">';
            
            // Info Faktur
            html += '<div class="flex-1">';
            html += '<div class="flex items-center gap-2 mb-1">';
            html += '<h3 class="font-bold text-gray-800 dark:text-white">' + Utils.escapeHtml(h.supplier || '-') + '</h3>';
            html += statusBadge;
            if (isOverdue && h.statusPelunasan === 'belum_lunas') html += '<span class="text-xs bg-red-500 text-white px-2 py-1 rounded-full animate-pulse">Lewat Tempo!</span>';
            html += '</div>';
            html += '<p class="text-xs text-slate-400 font-mono">No. Faktur: ' + Utils.escapeHtml(h.noFaktur || '-') + '</p>';
            html += '<div class="flex gap-4 mt-2 text-xs">';
            html += '<span class="text-slate-500">Beli: ' + tglBeli + '</span>';
            html += '<span class="' + tempoClass + '">Jatuh Tempo: ' + tglJatuhTempo + '</span>';
            html += '</div>';
            html += '</div>';

            // Total & Aksi
            html += '<div class="flex flex-col items-end justify-between gap-2">';
            html += '<div class="text-right">';
            html += '<p class="text-xs text-slate-400">Total Hutang</p>';
            html += '<p class="text-lg font-bold text-red-600 dark:text-red-400">' + Utils.formatRupiah(h.totalHarga) + '</p>';
            html += '</div>';
            
            html += '<div class="flex gap-2">';
            if (h.statusPelunasan === 'belum_lunas') {
                // Apotek, Admin, Keuangan bisa ajukan bayar (sesuai matrix)
                html += '<button onclick="AppLaporanHutang.ajukanBayar(\'' + h.id + '\')" class="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-lg font-medium flex items-center gap-1"><i data-lucide="send" class="w-3 h-3"></i> Ajukan Bayar</button>';
            } else if (h.statusPelunasan === 'menunggu_approve') {
                if (isApprover) {
                    // Hanya Admin & Keuangan yang bisa Approve
                    html += '<button onclick="AppLaporanHutang.lunasi(\'' + h.id + '\')" class="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium flex items-center gap-1"><i data-lucide="check-circle" class="w-3 h-3"></i> Approve & Bayar</button>';
                    html += '<button onclick="AppLaporanHutang.tolak(\'' + h.id + '\')" class="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2 rounded-lg font-medium">Tolak</button>';
                } else {
                    html += '<span class="text-xs text-amber-500 italic">Menunggu persetujuan Admin/Keuangan</span>';
                }
            }
            html += '</div>';
            html += '</div>';

            html += '</div>';
        });

        html += '</div>';
        container.innerHTML = html;
        lucide.createIcons();
    },

    // Apotek/Staff klik untuk meminta pencairan kasir
    ajukanBayar: function(id) {
        if (!confirm('Ajukan pembayaran faktur ini ke Admin/Keuangan?')) return;
        Utils.toast('Mengajukan pembayaran...', 'info');
        db.collection('pembelian').doc(id).update({
            statusPelunasan: 'menunggu_approve'
        }).then(function() {
            Utils.toast('Pengajuan terkirim!', 'success');
            AppLaporanHutang.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    },

    // Admin/Keuangan klik untuk mencairkan uang
    lunasi: function(id) {
        if (!confirm('Setujui pembayaran dan lunasi faktur ini? Kas akan terpotong.')) return;
        Utils.toast('Memproses pelunasan...', 'info');
        
        var batch = db.batch();
        
        // 1. Update status faktur menjadi lunas
        var fakturRef = db.collection('pembelian').doc(id);
        batch.update(fakturRef, {
            statusPelunasan: 'lunas',
            tanggalLunas: firebase.firestore.FieldValue.serverTimestamp(),
            dilunasiOleh: window.currentUserName || 'Keuangan'
        });

        // 2. Catat ke buku kas pengeluaran (biar masuk laporan keuangan nanti)
        var kasRef = db.collection('kasKeluar').doc();
        batch.set(kasRef, {
            tanggal: new Date().toISOString().split('T')[0],
            keterangan: 'Pelunasan Faktur: ' + id.substring(0,8).toUpperCase(),
            kategori: 'Hutang Usaha',
            jumlah: 0, // Akan diupdate terpisah biar gak salah baca snapshot
            referenceId: id,
            inputOleh: window.currentUserName || 'Keuangan',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Ambil data faktur dulu buat masukin nominal ke kasKeluar
        db.collection('pembelian').doc(id).get().then(function(doc) {
            if (doc.exists) {
                var total = doc.data().totalHarga || 0;
                batch.update(kasRef, { jumlah: total });
                
                batch.commit().then(function() {
                    Utils.toast('Faktur berhasil dilunasi!', 'success');
                    AppLaporanHutang.init();
                }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
            }
        });
    },

    // Admin/Keuangan nolak pengajuan (misal supplier belum datang)
    tolak: function(id) {
        if (!confirm('Tolak pengajuan ini? Faktur kembali ke status Belum Lunas.')) return;
        db.collection('pembelian').doc(id).update({
            statusPelunasan: 'belum_lunas'
        }).then(function() {
            Utils.toast('Pengajuan ditolak.', 'info');
            AppLaporanHutang.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    }
};
