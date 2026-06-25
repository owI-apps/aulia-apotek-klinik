/**
 * js/laporan/pengeluaran.js
 * Pengeluaran Kas Harian & Bulanan dengan Approval
 */

window.AppLaporanPengeluaran = {
    data: [],

    render: function() {
        var role = window.currentRole || 'apotek';
        var canInput = (role === 'apotek' || role === 'keuangan');

        var html = '<div class="page-enter max-w-5xl">';
        html += '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '    <div>';
        html += '      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Pengeluaran Kas</h2>';
        html += '      <p class="text-sm text-slate-500 dark:text-slate-400">Catat pengeluaran operasional harian & bulanan</p>';
        html += '    </div>';
        if (canInput) {
            html += '  <button onclick="AppLaporanPengeluaran.openForm()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2 self-start"><i data-lucide="plus" class="w-4 h-4"></i> Ajukan Pengeluaran</button>';
        }
        html += '  </div>';
        html += '  <div id="pengeluaran-content"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        // Ambil 50 pengeluaran terbaru
        db.collection('kasKeluar').orderBy('createdAt', 'desc').limit(50).get().then(snap => {
            self.data = [];
            snap.forEach(doc => { var d = doc.data(); d.id = doc.id; self.data.push(d); });
            self.renderList();
        }).catch(err => Utils.toast('Gagal memuat: ' + err.message, 'error'));
    },

    renderList: function() {
        var container = document.getElementById('pengeluaran-content');
        var role = window.currentRole || 'apotek';
        var isApprover = (role === 'admin' || role === 'keuangan');

        if (this.data.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border p-8 text-center text-slate-400">Belum ada pengeluaran tercatat.</div>';
            return;
        }

        var html = '<div class="space-y-3">';
        this.data.forEach(function(p) {
            var tgl = p.tanggal ? new Date(p.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
            var badge = '';
            if (p.status === 'pending') badge = '<span class="text-xs bg-amber-100 text-amber-600 px-2 py-1 rounded-full">Pending</span>';
            else if (p.status === 'approved') badge = '<span class="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">Disetujui</span>';
            else if (p.status === 'rejected') badge = '<span class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">Ditolak</span>';

            html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row justify-between gap-3">';
            html += '<div class="flex-1">';
            html += '<div class="flex items-center gap-2 mb-1">' + badge;
            html += '<span class="text-xs text-slate-400">' + Utils.escapeHtml(p.kategori || 'Operasional') + '</span></div>';
            html += '<h3 class="font-bold text-gray-800 dark:text-white">' + Utils.escapeHtml(p.keterangan || '-') + '</h3>';
            html += '<p class="text-xs text-slate-400 mt-1">' + tgl + ' • Diajukan oleh: ' + Utils.escapeHtml(p.inputOleh || '-') + '</p>';
            html += '</div>';
            
            html += '<div class="flex flex-col items-end justify-center gap-2">';
            html += '<p class="text-lg font-bold text-red-600 dark:text-red-400">' + Utils.formatRupiah(p.jumlah) + '</p>';
            
            if (p.status === 'pending' && isApprover) {
                html += '<div class="flex gap-1">';
                html += '<button onclick="AppLaporanPengeluaran.approve(\'' + p.id + '\')" class="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium">Approve</button>';
                html += '<button onclick="AppLaporanPengeluaran.reject(\'' + p.id + '\')" class="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg font-medium">Tolak</button>';
                html += '</div>';
            }
            html += '</div>';
            html += '</div>';
        });
        container.innerHTML = html;
        lucide.createIcons();
    },

    openForm: function() {
        var html = '<div class="p-6">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">Ajukan Pengeluaran</h3><button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';
        html += '<form id="form-pengeluaran" class="space-y-4">';
        
        html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Kategori</label><select id="pe-kategori" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="Harian">Harian (ATK, Operasional)</option><option value="Bulanan">Bulanan (PLN, PDAM, Wifi)</option></select></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Keterangan *</label><input type="text" id="pe-ket" required class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Contoh: Beli kertas A4 2 rim"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Jumlah (Rp) *</label><input type="number" id="pe-jumlah" required min="0" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="50000"></div>';
        
        html += '<div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-6 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg">Ajukan</button>';
        html += '</div></form></div>';

        Utils.openModal(html);
        setTimeout(() => {
            document.getElementById('form-pengeluaran').addEventListener('submit', function(e) {
                e.preventDefault();
                AppLaporanPengeluaran.simpan();
            });
        }, 100);
    },

    simpan: function() {
        var obj = {
            tanggal: new Date().toISOString().split('T')[0],
            kategori: document.getElementById('pe-kategori').value,
            keterangan: document.getElementById('pe-ket').value.trim(),
            jumlah: parseFloat(document.getElementById('pe-jumlah').value) || 0,
            status: 'pending',
            inputOleh: window.currentUserName || 'User',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (obj.jumlah <= 0) { Utils.toast('Jumlah harus lebih dari 0', 'error'); return; }

        db.collection('kasKeluar').add(obj).then(() => {
            Utils.toast('Pengajuan berhasil dikirim!', 'success');
            Utils.closeModal();
            AppLaporanPengeluaran.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    },

    approve: function(id) {
        if (!confirm('Setujui pengeluaran ini? Kas akan keluar.')) return;
        db.collection('kasKeluar').doc(id).update({
            status: 'approved',
            approvedBy: window.currentUserName || 'Admin',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            Utils.toast('Pengeluaran disetujui!', 'success');
            AppLaporanPengeluaran.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    },

    reject: function(id) {
        if (!confirm('Tolak pengajuan ini?')) return;
        db.collection('kasKeluar').doc(id).update({ status: 'rejected' }).then(() => {
            Utils.toast('Pengajuan ditolak.', 'info');
            AppLaporanPengeluaran.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    }
};
