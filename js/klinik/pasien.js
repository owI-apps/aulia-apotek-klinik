/**
 * js/klinik/pasien.js
 * Master Data Pasien
 */

window.AppKlinikPasien = {
    data: [],
    searchQuery: '',

    render: function() {
        var html = '<div class="page-enter max-w-4xl">';
        html += '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '  <div>';
        html += '    <h2 class="text-xl font-bold text-gray-800 dark:text-white">Data Pasien</h2>';
        html += '    <p class="text-sm text-slate-500 dark:text-slate-400">Master data pasien klinik & apotek</p>';
        html += '  </div>';
        html += '  <button onclick="AppKlinikPasien.openForm()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2 self-start"><i data-lucide="user-plus" class="w-4 h-4"></i> Tambah Pasien</button>';
        html += '</div>';

        // Search Bar
        html += '<div class="mb-4 relative">';
        html += '  <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>';
        html += '  <input type="text" id="search-pasien" placeholder="Cari nama atau No. RM..." class="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" oninput="AppKlinikPasien.onSearch(this.value)">';
        html += '</div>';

        html += '<div id="pasien-list"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        db.collection('pasien').orderBy('nama').get().then(snap => {
            AppKlinikPasien.data = [];
            snap.forEach(doc => { var d = doc.data(); d.id = doc.id; AppKlinikPasien.data.push(d); });
            AppKlinikPasien.renderList();
        }).catch(err => Utils.toast('Gagal memuat: ' + err.message, 'error'));
    },

    onSearch: function(val) {
        this.searchQuery = val.toLowerCase().trim();
        this.renderList();
    },

    renderList: function() {
        var container = document.getElementById('pasien-list');
        if (!container) return;

        var list = this.data;
        if (this.searchQuery) {
            list = list.filter(p => 
                (p.nama && p.nama.toLowerCase().includes(this.searchQuery)) || 
                (p.nomorRM && p.nomorRM.toLowerCase().includes(this.searchQuery))
            );
        }

        if (list.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center"><p class="text-slate-400">Tidak ada data pasien ditemukan.</p></div>';
            return;
        }

        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<div class="overflow-x-auto">';
        html += '<table class="w-full text-sm">';
        html += '<thead><tr class="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase tracking-wider">';
        html += '<th class="px-4 py-3 text-left">No. RM</th>';
        html += '<th class="px-4 py-3 text-left">Nama Pasien</th>';
        html += '<th class="px-4 py-3 text-left hidden md:table-cell">L/P</th>';
        html += '<th class="px-4 py-3 text-left hidden lg:table-cell">No. Telepon</th>';
        html += '<th class="px-4 py-3 text-left hidden lg:table-cell">Alergi Obat</th>';
        html += '<th class="px-4 py-3 text-right">Aksi</th>';
        html += '</tr></thead><tbody>';

        list.forEach(p => {
            var safeName = (p.nama || '-').replace(/'/g, "\\'");
            var alergi = p.alergiObat ? '<span class="text-xs bg-red-50 dark:bg-red-900/30 text-red-600 px-2 py-0.5 rounded-full">' + Utils.escapeHtml(p.alergiObat) + '</span>' : '<span class="text-xs text-slate-400">-</span>';

            html += '<tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">';
            html += '<td class="px-4 py-3 font-mono text-xs text-primary-600 dark:text-primary-400 font-semibold">' + Utils.escapeHtml(p.nomorRM || '-') + '</td>';
            html += '<td class="px-4 py-3 font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(p.nama) + '</td>';
            html += '<td class="px-4 py-3 text-slate-600 dark:text-slate-300 hidden md:table-cell">' + Utils.escapeHtml(p.jenisKelamin || '-') + '</td>';
            html += '<td class="px-4 py-3 text-slate-600 dark:text-slate-300 hidden lg:table-cell">' + Utils.escapeHtml(p.noTelepon || '-') + '</td>';
            html += '<td class="px-4 py-3 hidden lg:table-cell">' + alergi + '</td>';
            html += '<td class="px-4 py-3 text-right space-x-1">';
            html += '<button onclick="AppKlinikPasien.openForm(\'' + p.id + '\')" class="p-1.5 text-slate-400 hover:text-primary-600 rounded" title="Edit"><i data-lucide="pencil" class="w-4 h-4"></i></button>';
            html += '<button onclick="AppKlinikPasien.hapus(\'' + p.id + '\', \'' + safeName + '\')" class="p-1.5 text-slate-400 hover:text-red-600 rounded" title="Hapus"><i data-lucide="trash-2" class="w-4 h-4"></i></button>';
            html += '</td></tr>';
        });

        html += '</tbody></table></div></div>';
        html += '<p class="text-xs text-slate-400 mt-2 text-right">Total: ' + list.length + ' pasien</p>';
        
        container.innerHTML = html;
        lucide.createIcons();
    },

    openForm: function(id) {
        var isEdit = !!id;
        var p = isEdit ? this.data.find(x => x.id === id) : {};
        
        var nextRM = '';
        if (!isEdit) {
            var year = new Date().getFullYear();
            var count = this.data.length + 1;
            nextRM = 'RM-' + year + '-' + String(count).padStart(3, '0');
        }

        var html = '<div class="p-6">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">' + (isEdit ? 'Edit' : 'Tambah') + ' Pasien</h3><button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';
        
        html += '<form id="form-pasien" class="space-y-4">';
        
        html += '<div class="grid grid-cols-3 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">No. RM</label><input type="text" id="fp-rm" value="' + Utils.escapeHtml(isEdit ? (p.nomorRM || '') : nextRM) + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" required></div>';
        html += '<div class="col-span-2"><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap *</label><input type="text" id="fp-nama" value="' + Utils.escapeHtml(p.nama || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" required></div>';
        html += '</div>';

        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jenis Kelamin</label><select id="fp-jk" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="L"' + (p.jenisKelamin==='L'?' selected':'') + '>Laki-laki (L)</option><option value="P"' + (p.jenisKelamin==='P'?' selected':'') + '>Perempuan (P)</option></select></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal Lahir</label><input type="date" id="fp-tgl" value="' + (p.tanggalLahir || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        html += '</div>';

        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">No. Telepon</label><input type="text" id="fp-telp" value="' + Utils.escapeHtml(p.noTelepon || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="08xxxxxxxxxx"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Alamat</label><textarea id="fp-alamat" rows="2" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">' + Utils.escapeHtml(p.alamat || '') + '</textarea></div>';

        html += '<div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">';
        html += '<label class="block text-sm font-medium text-red-700 dark:text-red-400 mb-1">⚠️ Alergi Obat (Jika ada)</label>';
        html += '<input type="text" id="fp-alergi" value="' + Utils.escapeHtml(p.alergiObat || '') + '" class="w-full px-3 py-2 border border-red-300 dark:border-red-800 dark:bg-red-900/50 dark:text-white rounded-lg text-sm" placeholder="Contoh: Penisilin, Aspirin">';
        html += '</div>';

        html += '<div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-6 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg">Simpan</button>';
        html += '</div>';
        
        if (isEdit) html += '<input type="hidden" id="fp-id" value="' + p.id + '">';
        html += '</form></div>';

        Utils.openModal(html);

        setTimeout(() => {
            document.getElementById('form-pasien').addEventListener('submit', function(e) {
                e.preventDefault();
                AppKlinikPasien.simpan();
            });
        }, 100);
    },

    simpan: function() {
        var idField = document.getElementById('fp-id');
        var isEdit = !!idField;
        
        var obj = {
            nomorRM: document.getElementById('fp-rm').value.trim(),
            nama: document.getElementById('fp-nama').value.trim(),
            jenisKelamin: document.getElementById('fp-jk').value,
            tanggalLahir: document.getElementById('fp-tgl').value,
            noTelepon: document.getElementById('fp-telp').value.trim(),
            alamat: document.getElementById('fp-alamat').value.trim(),
            alergiObat: document.getElementById('fp-alergi').value.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!obj.nama || !obj.nomorRM) {
            Utils.toast('Nama dan No. RM wajib diisi', 'error');
            return;
        }

        var p;
        if (isEdit) {
            p = db.collection('pasien').doc(idField.value).update(obj);
        } else {
            obj.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            p = db.collection('pasien').add(obj);
        }

        p.then(() => {
            Utils.toast('Data pasien berhasil disimpan!', 'success');
            Utils.closeModal();
            AppKlinikPasien.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    },

    hapus: function(id, nama) {
        if (!confirm('Hapus data pasien "' + nama + '"?')) return;
        db.collection('pasien').doc(id).delete().then(() => {
            Utils.toast('Berhasil dihapus', 'success');
            AppKlinikPasien.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    }
};
