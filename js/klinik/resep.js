/**
 * js/klinik/resep.js
 * Daftar Resep dari Rekam Medis yang menunggu diproses Apotek
 */

window.AppKlinikResep = {
    data: [],

    render: function() {
        var html = '<div class="page-enter max-w-4xl">';
        html += '  <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-1">Resep Dokter</h2>';
        html += '  <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Daftar resep keluar dari hasil pemeriksaan dokter</p>';
        html += '  <div id="resep-content"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        // Ambil Rekam Medis yang statusnya 'selesai'
        // HAPUS .orderBy biar tidak butuh Composite Index
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
                return timeB - timeA; // Descending (terbaru di atas)
            });

            AppKlinikResep.renderList();
        }).catch(err => Utils.toast('Gagal memuat: ' + err.message, 'error'));
    },

    renderList: function() {
        var container = document.getElementById('resep-content');
        if (!container) return;

        // Filter hanya yang ada catatan/resepnya
        var listResep = this.data.filter(function(rm) {
            return rm.catatan && rm.catatan.trim() !== '';
        });

        if (listResep.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-400">Tidak ada resep hari ini.</div>';
            return;
        }

        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<table class="w-full text-sm">';
        html += '<thead><tr class="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase tracking-wider">';
        html += '<th class="px-4 py-3 text-left">Waktu</th>';
        html += '<th class="px-4 py-3 text-left">Pasien</th>';
        html += '<th class="px-4 py-3 text-left">Dokter</th>';
        html += '<th class="px-4 py-3 text-left hidden md:table-cell">Diagnosa</th>';
        html += '<th class="px-4 py-3 text-center">Status Apotek</th>';
        html += '</tr></thead><tbody>';

        listResep.forEach(function(rm) {
            // Fallback status: kalau belum ada field statusResep, dianggap 'menunggu'
            var status = rm.statusResep || 'menunggu';
            var tgl = rm.tanggal ? new Date(rm.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-';

            var badge = '';
            if (status === 'menunggu') {
                badge = '<span class="text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-600 px-2 py-0.5 rounded-full">Menunggu</span>';
            } else if (status === 'diproses') {
                badge = '<span class="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-2 py-0.5 rounded-full">Diproses</span>';
            } else if (status === 'selesai') {
                badge = '<span class="text-xs bg-green-50 dark:bg-green-900/30 text-green-600 px-2 py-0.5 rounded-full">Selesai</span>';
            }

            html += '<tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer" onclick="AppKlinikResep.showDetail(\'' + rm.id + '\')">';
            html += '<td class="px-4 py-3 text-slate-500 text-xs">' + tgl + '</td>';
            html += '<td class="px-4 py-3 font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(rm.namaPasien) + ' <span class="text-xs text-slate-400">(' + Utils.escapeHtml(rm.nomorRM) + ')</span></td>';
            html += '<td class="px-4 py-3 text-slate-600 dark:text-slate-300">' + Utils.escapeHtml(rm.namaDokter) + '</td>';
            html += '<td class="px-4 py-3 text-slate-600 dark:text-slate-300 hidden md:table-cell">' + Utils.escapeHtml(rm.diagnosa || '-') + '</td>';
            html += '<td class="px-4 py-3 text-center">' + badge + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
    },

    showDetail: function(rmId) {
        var rm = this.data.find(function(d) { return d.id === rmId; });
        if (!rm) return;

        var status = rm.statusResep || 'menunggu';
        
        var html = '<div class="p-6">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">Detail Resep</h3><button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';
        
        // Info Utama
        html += '<div class="grid grid-cols-2 gap-3 mb-4 text-sm">';
        html += '<div class="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg"><p class="text-xs text-slate-400">Pasien</p><p class="font-semibold">' + Utils.escapeHtml(rm.namaPasien) + ' (' + Utils.escapeHtml(rm.nomorRM) + ')</p></div>';
        html += '<div class="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg"><p class="text-xs text-slate-400">Dokter</p><p class="font-semibold">' + Utils.escapeHtml(rm.namaDokter) + '</p></div>';
        html += '<div class="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg"><p class="text-xs text-slate-400">Diagnosa</p><p class="font-semibold">' + Utils.escapeHtml(rm.diagnosa || '-') + '</p></div>';
        html += '<div class="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg"><p class="text-xs text-slate-400">Status</p><p class="font-semibold text-amber-600">' + status + '</p></div>';
        html += '</div>';

        // Catatan / Isi Resep
        html += '<div class="mb-4">';
        html += '<h4 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Catatan & Isi Resep:</h4>';
        html += '<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg whitespace-pre-wrap text-sm text-blue-800 dark:text-blue-200">' + Utils.escapeHtml(rm.catatan) + '</div>';
        html += '</div>';

        // Tindakan
        if (rm.tindakanItems && rm.tindakanItems.length > 0) {
            html += '<h4 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tindakan Klinik:</h4>';
            html += '<ul class="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-1 mb-4">';
            rm.tindakanItems.forEach(function(t) {
                html += '<li>' + Utils.escapeHtml(t.namaTindakan) + '</li>';
            });
            html += '</ul>';
        }

        html += '</div>';

        Utils.openModal(html);
    }
};
