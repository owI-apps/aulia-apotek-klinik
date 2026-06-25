/**
 * js/pengaturan/profil.js
 * Pengaturan Profil Instansi (Nama, Alamat, Telp, Untuk Cetak Struk)
 */

window.AppPengaturanProfil = {
    data: {},

    render: function() {
        var html = '<div class="page-enter max-w-3xl">';
        html += '  <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-1">Profil Instansi</h2>';
        html += '  <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Data ini akan tampil di struk kasir, laporan, dan halaman login</p>';
        html += '  <div id="profil-content"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        db.collection('pengaturan').doc('profil').get().then(function(doc) {
            if (doc.exists) {
                self.data = doc.data();
            } else {
                self.data = { nama: 'Aulia Apotek Klinik', alamat: '', telp: '', email: '' };
            }
            self.renderForm();
        }).catch(function(err) {
            Utils.toast('Gagal memuat: ' + err.message, 'error');
        });
    },

    renderForm: function() {
        var d = this.data;
        var role = window.currentRole || 'apotek';
        var canEdit = (role === 'admin' || role === 'keuangan');

        var container = document.getElementById('profil-content');
        var html = '<form id="form-profil" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">';
        
        // Logo / Inisial
        html += '<div class="flex flex-col sm:flex-row items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">';
        html += '  <div class="w-20 h-20 bg-primary-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg">' + (d.nama || 'A').charAt(0) + '</div>';
        html += '  <div class="text-center sm:text-left">';
        html += '    <h3 class="font-bold text-lg text-gray-800 dark:text-white">' + Utils.escapeHtml(d.nama || 'Aulia Apotek Klinik') + '</h3>';
        html += '    <p class="text-sm text-slate-500">Logo otomatis diambil dari inisial nama instansi</p>';
        html += '  </div>';
        html += '</div>';

        // Nama Instansi
        html += '<div>';
        html += '  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Instansi *</label>';
        html += '  <input type="text" id="pr-nama" value="' + Utils.escapeHtml(d.nama || '') + '" required ' + (canEdit ? '' : 'readonly') + ' class="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm ' + (canEdit ? '' : 'bg-slate-100 cursor-not-allowed') + '">';
        html += '</div>';

        // Alamat
        html += '<div>';
        html += '  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Alamat Lengkap</label>';
        html += '  <textarea id="pr-alamat" rows="2" ' + (canEdit ? '' : 'readonly') + ' class="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm ' + (canEdit ? '' : 'bg-slate-100 cursor-not-allowed') + '">' + Utils.escapeHtml(d.alamat || '') + '</textarea>';
        html += '</div>';

        // Telp & Email
        html += '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">';
        html += '  <div>';
        html += '    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">No. Telepon / WhatsApp</label>';
        html += '    <input type="text" id="pr-telp" value="' + Utils.escapeHtml(d.telp || '') + '" ' + (canEdit ? '' : 'readonly') + ' class="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm ' + (canEdit ? '' : 'bg-slate-100 cursor-not-allowed') + '" placeholder="0812xxxxxxx">';
        html += '  </div>';
        html += '  <div>';
        html += '    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email (Opsional)</label>';
        html += '    <input type="email" id="pr-email" value="' + Utils.escapeHtml(d.email || '') + '" ' + (canEdit ? '' : 'readonly') + ' class="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm ' + (canEdit ? '' : 'bg-slate-100 cursor-not-allowed') + '" placeholder="info@aulia.com">';
        html += '  </div>';
        html += '</div>';

        // Footer Struk (Tambahan kecil di bawah struk)
        html += '<div>';
        html += '  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pesan Footer Struk (Opsional)</label>';
        html += '  <input type="text" id="pr-footer" value="' + Utils.escapeHtml(d.footerStruk || '') + '" ' + (canEdit ? '' : 'readonly') + ' class="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm ' + (canEdit ? '' : 'bg-slate-100 cursor-not-allowed') + '" placeholder="Barang yang sudah dibeli tidak dapat ditukar">';
        html += '</div>';

        if (canEdit) {
            html += '<div class="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">';
            html += '  <button type="submit" class="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm flex items-center gap-2"><i data-lucide="save" class="w-4 h-4"></i> Simpan Perubahan</button>';
            html += '</div>';
        } else {
            html += '<div class="text-center text-xs text-slate-400 pt-4 border-t border-slate-200 dark:border-slate-700">Hanya Admin/Keuangan yang dapat mengubah data ini.</div>';
        }

        html += '</form>';

        container.innerHTML = html;
        lucide.createIcons();

        if (canEdit) {
            setTimeout(() => {
                document.getElementById('form-profil').addEventListener('submit', function(e) {
                    e.preventDefault();
                    AppPengaturanProfil.simpan();
                });
            }, 100);
        }
    },

    simpan: function() {
        var obj = {
            nama: document.getElementById('pr-nama').value.trim(),
            alamat: document.getElementById('pr-alamat').value.trim(),
            telp: document.getElementById('pr-telp').value.trim(),
            email: document.getElementById('pr-email').value.trim(),
            footerStruk: document.getElementById('pr-footer').value.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        Utils.toast('Menyimpan...', 'info');
        db.collection('pengaturan').doc('profil').set(obj, { merge: true })
            .then(function() {
                Utils.toast('Profil instansi berhasil disimpan!', 'success');
                // Update judul halaman login jika ada
                AppPengaturanProfil.init();
            })
            .catch(function(err) {
                Utils.toast('Gagal: ' + err.message, 'error');
            });
    }
};
