/**
 * js/klinik/resep.js
 * Dashboard Monitoring Resep Dokter oleh Apoteker
 * - Melihat detail resep & tindakan klinik
 * - Update status resep
 * - Shortcut langsung ke halaman Kasir
 */

window.AppKlinikResep = {
    data: [],

    render: function() {
        var html = '<div class="page-enter max-w-5xl">';
        html += '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '    <div>';
        html += '      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Antrian Resep Apotek</h2>';
        html += '      <p class="text-sm text-slate-500 dark:text-slate-400">Daftar resep keluar dari hasil pemeriksaan dokter</p>';
        html += '    </div>';
        html += '    <button onclick="AppKlinikResep.init()" class="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2 self-start"><i data-lucide="refresh-cw" class="w-4 h-4"></i> Refresh Data</button>';
        html += '  </div>';
        html += '  <div id="resep-content"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        // Ambil Rekam Medis yang statusnya 'selesai' (sudah diperiksa dokter)
        db.collection('rekamMedis').where('status', '==', 'selesai').get().then(snap => {
            AppKlinikResep.data = [];
            snap.forEach(doc => { 
                var d = doc.data(); 
                d.id = doc.id; 
                AppKlinikResep.data.push(d); 
            });

            // Urutkan manual dari yang terbaru
            AppKlinikResep.data.sort(function(a, b) {
                var timeA = a.createdAt ? a.createdAt.seconds : 0;
                var timeB = b.createdAt ? b.createdAt.seconds : 0;
                return timeB - timeA; 
            });

            AppKlinikResep.renderList();
        }).catch(err => Utils.toast('Gagal memuat: ' + err.message, 'error'));
    },

    renderList: function() {
        var container = document.getElementById('resep-content');
        if (!container) return;

        // Filter hanya yang ada catatan/tindakan resepnya
        var listResep = this.data.filter(function(rm) {
            return (rm.catatan && rm.catatan.trim() !== '') || (rm.tindakanItems && rm.tindakanItems.length > 0);
        });

        if (listResep.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-400">Tidak ada antrian resep saat ini.</div>';
            return;
        }

        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<div class="overflow-x-auto">';
        html += '<table class="w-full text-sm">';
        html += '<thead><tr class="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase tracking-wider">';
        html += '<th class="px-4 py-3 text-left">Waktu Input</th>';
        html += '<th class="px-4 py-3 text-left">Pasien (RM)</th>';
        html += '<th class="px-4 py-3 text-left">Dokter</th>';
        html += '<th class="px-4 py-3 text-left hidden md:table-cell">Diagnosa</th>';
        html += '<th class="px-4 py-3 text-center">Status Apotek</th>';
        html += '<th class="px-4 py-3 text-right">Aksi</th>';
        html += '</tr></thead><tbody>';

        listResep.forEach(function(rm) {
            var status = rm.statusResep || 'menunggu';
            var tgl = rm.tanggal ? new Date(rm.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-';
            
            // Waktu dari createdAt (Firebase Timestamp)
            var waktu = rm.createdAt ? new Date(rm.createdAt.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';

            var badge = '';
            if (status === 'menunggu') {
                badge = '<span class="text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-600 px-2 py-1 rounded-full font-medium">Menunggu</span>';
            } else if (status === 'diproses') {
                badge = '<span class="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-2 py-1 rounded-full font-medium">Diproses</span>';
            } else if (status === 'selesai') {
                badge = '<span class="text-xs bg-green-50 dark:bg-green-900/30 text-green-600 px-2 py-1 rounded-full font-medium">Selesai</span>';
            }

            html += '<tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">';
            html += '<td class="px-4 py-3 text-slate-500 text-xs">' + tgl + '<br>' + waktu + '</td>';
            html += '<td class="px-4 py-3 font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(rm.namaPasien || '-') + '<br><span class="text-xs text-slate-400 font-mono">' + Utils.escapeHtml(rm.nomorRM || '-') + '</span></td>';
            html += '<td class="px-4 py-3 text-slate-600 dark:text-slate-300">' + Utils.escapeHtml(rm.namaDokter || '-') + '</td>';
            html += '<td class="px-4 py-3 text-slate-600 dark:text-slate-300 hidden md:table-cell text-xs">' + Utils.escapeHtml(rm.diagnosa || '-') + '</td>';
            html += '<td class="px-4 py-3 text-center">' + badge + '</td>';
            html += '<td class="px-4 py-3 text-right space-x-1">';
            html += '<button onclick="AppKlinikResep.showDetail(\'' + rm.id + '\')" class="p-2 text-slate-400 hover:text-primary-600 rounded" title="Lihat Detail"><i data-lucide="eye" class="w-4 h-4"></i></button>';
            if (status !== 'selesai') {
                html += '<button onclick="AppKlinikResep.prosesKasir(\'' + rm.id + '\')" class="p-2 text-slate-400 hover:text-green-600 rounded" title="Proses di Kasir"><i data-lucide="credit-card" class="w-4 h-4"></i></button>';
            }
            html += '</td></tr>';
        });

        html += '</tbody></table></div></div>';
        container.innerHTML = html;
        lucide.createIcons();
    },

    showDetail: function(rmId) {
        var rm = this.data.find(function(d) { return d.id === rmId; });
        if (!rm) return;

        var status = rm.statusResep || 'menunggu';
        
        var html = '<div class="p-6 max-h-[90vh] overflow-y-auto">';
        html += '<div class="flex items-center justify-between mb-5">';
        html += '  <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Detail Resep & Tindakan</h3>';
        html += '  <button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button>';
        html += '</div>';
        
        // Info Utama
        html += '<div class="grid grid-cols-2 gap-3 mb-4 text-sm bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-100 dark:border-slate-700">';
        html += '<div><p class="text-xs text-slate-400">Pasien</p><p class="font-semibold text-gray-800 dark:text-white">' + Utils.escapeHtml(rm.namaPasien || '-') + '</p><p class="text-xs text-slate-500">' + Utils.escapeHtml(rm.nomorRM || '-') + '</p></div>';
        html += '<div><p class="text-xs text-slate-400">Dokter Pemeriksa</p><p class="font-semibold text-gray-800 dark:text-white">' + Utils.escapeHtml(rm.namaDokter || '-') + '</p></div>';
        html += '<div><p class="text-xs text-slate-400">Diagnosa</p><p class="font-medium text-red-600 dark:text-red-400">' + Utils.escapeHtml(rm.diagnosa || '-') + '</p></div>';
        html += '<div><p class="text-xs text-slate-400">Keluhan</p><p class="text-xs text-slate-600 dark:text-slate-300">' + Utils.escapeHtml(rm.keluhan || '-') + '</p></div>';
        html += '</div>';

        // Tindakan Klinik (Jasa Medis)
        if (rm.tindakanItems && rm.tindakanItems.length > 0) {
            html += '<div class="mb-4">';
            html += '<h4 class="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-1"><i data-lucide="stethoscope" class="w-4 h-4"></i> Tindakan Klinik</h4>';
            html += '<div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 space-y-1 border border-purple-100 dark:border-purple-800">';
            rm.tindakanItems.forEach(function(t) {
                html += '<div class="flex justify-between text-xs"><span class="text-gray-700 dark:text-slate-200">' + Utils.escapeHtml(t.namaTindakan) + '</span><span class="font-semibold text-purple-600">' + Utils.formatRupiah(t.hargaJual) + '</span></div>';
            });
            html += '</div></div>';
        }

        // Catatan Resep (Racikan/Tulisan Dokter)
        html += '<div class="mb-6">';
        html += '<h4 class="text-sm font-semibold text-teal-600 dark:text-teal-400 mb-2 flex items-center gap-1"><i data-lucide="file-text" class="w-4 h-4"></i> Instruksi Resep / Racikan</h4>';
        html += '<div class="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3 border border-teal-100 dark:border-teal-800">';
        html += '<p class="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap">' + Utils.escapeHtml(rm.catatan || 'Tidak ada catatan racikan.') + '</p>';
        html += '</div></div>';

        // Tombol Aksi
        html += '<div class="flex flex-col sm:flex-row gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">';
        
        if (status === 'menunggu') {
            html += '<button onclick="AppKlinikResep.ubahStatus(\'' + rm.id + '\', \'diproses\')" class="flex-1 px-4 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">Tandai Diproses</button>';
            html += '<button onclick="AppKlinikResep.prosesKasir(\'' + rm.id + '\')" class="flex-1 px-4 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2"><i data-lucide="credit-card" class="w-4 h-4"></i> Proses di Kasir</button>';
        } else if (status === 'diproses') {
            html += '<button onclick="AppKlinikResep.ubahStatus(\'' + rm.id + '\', \'selesai\')" class="flex-1 px-4 py-2.5 text-sm bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg">Tandai Selesai</button>';
            html += '<button onclick="AppKlinikResep.prosesKasir(\'' + rm.id + '\')" class="flex-1 px-4 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2"><i data-lucide="credit-card" class="w-4 h-4"></i> Buka Kasir</button>';
        } else {
            html += '<div class="flex-1 text-center text-green-600 font-semibold py-2.5">Resep Telah Diselesaikan</div>';
        }
        html += '</div>';

        html += '</div>';

        Utils.openModal(html);
        lucide.createIcons();
    },

    // Fungsi untuk update status manual tanpa buka kasir
    ubahStatus: function(rmId, newStatus) {
        Utils.closeModal();
        Utils.toast('Mengubah status...', 'info');
        db.collection('rekamMedis').doc(rmId).update({ statusResep: newStatus })
            .then(function() {
                Utils.toast('Status resep diperbarui!', 'success');
                AppKlinikResep.init();
            })
            .catch(function(err) { Utils.toast('Gagal: ' + err.message, 'error'); });
    },

    // Fungsi shortcut ke Kasir
    prosesKasir: function(rmId) {
        Utils.closeModal();
        // Simpan ID sementara di window object
        window.TEMP_RESEP_ID_FOR_KASIR = rmId;
        // Arahkan ke halaman transaksi (asumsi navigateTo adalah fungsi router global)
        navigateTo('apotek/transaksi', 'Transaksi Penjualan');
    }
};
