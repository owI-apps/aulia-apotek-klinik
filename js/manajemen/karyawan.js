/**
 * js/manajemen/karyawan.js
 * CRUD Data Karyawan (Dokter, Apoteker, Perawat, dll)
 */

window.AppManajemenKaryawan = {
    data: [],

    render: function() {
        var html = '<div class="page-enter max-w-4xl">';
        html += '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '  <div>';
        html += '    <h2 class="text-xl font-bold text-gray-800 dark:text-white">Data Karyawan</h2>';
        html += '    <p class="text-sm text-slate-500 dark:text-slate-400">Master data karyawan klinik & apotek</p>';
        html += '  </div>';
        html += '  <button onclick="AppManajemenKaryawan.openForm()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2 self-start"><i data-lucide="user-plus" class="w-4 h-4"></i> Tambah Karyawan</button>';
        html += '</div>';
        html += '<div id="karyawan-list"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        db.collection('karyawan').orderBy('nama').get().then(snap => {
            AppManajemenKaryawan.data = [];
            snap.forEach(doc => { var d = doc.data(); d.id = doc.id; AppManajemenKaryawan.data.push(d); });
            AppManajemenKaryawan.renderList();
        }).catch(err => Utils.toast('Gagal memuat: ' + err.message, 'error'));
    },

    renderList: function() {
        var container = document.getElementById('karyawan-list');
        if (!container) return;
        
        if (AppManajemenKaryawan.data.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center"><p class="text-slate-400">Belum ada data karyawan.</p></div>';
            return;
        }

        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<table class="w-full text-sm">';
        html += '<thead><tr class="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase tracking-wider">';
        html += '<th class="px-4 py-3 text-left">Nama</th>';
        html += '<th class="px-4 py-3 text-left">Departemen</th>';
        html += '<th class="px-4 py-3 text-left">Jabatan</th>';
        html += '<th class="px-4 py-3 text-center">Status</th>';
        html += '<th class="px-4 py-3 text-right">Aksi</th>';
        html += '</tr></thead><tbody>';

        AppManajemenKaryawan.data.forEach(k => {
            var deptColor = k.departemen === 'Klinik' ? 'purple' : (k.departemen === 'Apotek' ? 'teal' : 'slate');
            var statusBadge = k.status === 'aktif' ? 
                '<span class="text-xs bg-green-50 dark:bg-green-900/30 text-green-600 px-2 py-0.5 rounded-full">Aktif</span>' : 
                '<span class="text-xs bg-red-50 dark:bg-red-900/30 text-red-500 px-2 py-0.5 rounded-full">Nonaktif</span>';
            
            var safeName = (k.nama || '-').replace(/'/g, "\\'");

            html += '<tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">';
            html += '<td class="px-4 py-3 font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(k.nama) + '</td>';
            html += '<td class="px-4 py-3"><span class="text-xs bg-' + deptColor + '-50 dark:bg-' + deptColor + '-900/30 text-' + deptColor + '-600 px-2 py-0.5 rounded-full">' + Utils.escapeHtml(k.departemen || '-') + '</span></td>';
            html += '<td class="px-4 py-3 text-slate-600 dark:text-slate-300">' + Utils.escapeHtml(k.jabatan || '-') + '</td>';
            html += '<td class="px-4 py-3 text-center">' + statusBadge + '</td>';
            html += '<td class="px-4 py-3 text-right space-x-1">';
            html += '<button onclick="AppManajemenKaryawan.openForm(\'' + k.id + '\')" class="p-1.5 text-slate-400 hover:text-primary-600 rounded"><i data-lucide="pencil" class="w-4 h-4"></i></button>';
            html += '<button onclick="AppManajemenKaryawan.hapus(\'' + k.id + '\', \'' + safeName + '\')" class="p-1.5 text-slate-400 hover:text-red-600 rounded"><i data-lucide="trash-2" class="w-4 h-4"></i></button>';
            html += '</td></tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
        lucide.createIcons();
    },

    openForm: function(id) {
        var isEdit = !!id;
        var k = isEdit ? AppManajemenKaryawan.data.find(x => x.id === id) : {};
        
        var html = '<div class="p-6">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">' + (isEdit ? 'Edit' : 'Tambah') + ' Karyawan</h3><button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';
        html += '<form id="form-karyawan" class="space-y-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap *</label><input type="text" id="fk-nama" value="' + Utils.escapeHtml(k.nama || '') + '" required class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        
        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Departemen *</label><select id="fk-dept" required class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Pilih --</option><option value="Klinik"' + (k.departemen==='Klinik'?' selected':'') + '>Klinik</option><option value="Apotek"' + (k.departemen==='Apotek'?' selected':'') + '>Apotek</option><option value="Umum"' + (k.departemen==='Umum'?' selected':'') + '>Umum</option></select></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jabatan</label><input type="text" id="fk-jabatan" value="' + Utils.escapeHtml(k.jabatan || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Dokter, Apoteker, Kasir..."></div>';
        html += '</div>';

        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">NIP / ID</label><input type="text" id="fk-nip" value="' + Utils.escapeHtml(k.nip || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label><select id="fk-status" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="aktif"' + (k.status!=='nonaktif'?' selected':'') + '>Aktif</option><option value="nonaktif"' + (k.status==='nonaktif'?' selected':'') + '>Nonaktif</option></select></div>';
        html += '</div>';

        html += '<div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-6 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg">Simpan</button>';
        html += '</div>';
        
        if (isEdit) html += '<input type="hidden" id="fk-id" value="' + k.id + '">';
        html += '</form></div>';

        Utils.openModal(html);
        
        // Event listener untuk form submit
        setTimeout(() => {
            document.getElementById('form-karyawan').addEventListener('submit', function(e) {
                e.preventDefault();
                AppManajemenKaryawan.simpan();
            });
        }, 100);
    },

    simpan: function() {
        var idField = document.getElementById('fk-id');
        var isEdit = !!idField;
        
        var obj = {
            nama: document.getElementById('fk-nama').value.trim(),
            departemen: document.getElementById('fk-dept').value,
            jabatan: document.getElementById('fk-jabatan').value.trim(),
            nip: document.getElementById('fk-nip').value.trim(),
            status: document.getElementById('fk-status').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!obj.nama || !obj.departemen) {
            Utils.toast('Nama dan Departemen wajib diisi', 'error');
            return;
        }

        var p;
        if (isEdit) {
            p = db.collection('karyawan').doc(idField.value).update(obj);
        } else {
            obj.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            p = db.collection('karyawan').add(obj);
        }

        p.then(() => {
            Utils.toast('Karyawan berhasil disimpan!', 'success');
            Utils.closeModal();
            AppManajemenKaryawan.init(); 
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    },

    hapus: function(id, nama) {
        if (!confirm('Hapus karyawan "' + nama + '"?')) return;
        db.collection('karyawan').doc(id).delete().then(() => {
            Utils.toast('Berhasil dihapus', 'success');
            AppManajemenKaryawan.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    }
};
