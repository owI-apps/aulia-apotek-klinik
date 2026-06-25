/**
 * js/apotek/obat.js
 * Master Data Obat & Stock
 */

window.AppApotekObat = {
    data: [],
    searchQuery: '',

    render: function() {
        var html = '<div class="page-enter max-w-5xl">';
        html += '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '  <div>';
        html += '    <h2 class="text-xl font-bold text-gray-800 dark:text-white">Obat & Stock</h2>';
        html += '    <p class="text-sm text-slate-500 dark:text-slate-400">Master data obat, HPP, harga jual, dan stok</p>';
        html += '  </div>';
        html += '  <button onclick="AppApotekObat.openForm()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2 self-start"><i data-lucide="plus" class="w-4 h-4"></i> Tambah Obat</button>';
        html += '</div>';

        // Search Bar
        html += '<div class="mb-4 relative">';
        html += '  <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>';
        html += '  <input type="text" id="search-obat" placeholder="Cari nama obat atau kode..." class="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" oninput="AppApotekObat.onSearch(this.value)">';
        html += '</div>';

        html += '<div id="obat-list"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        // HAPUS orderBy biar tidak butuh Composite Index
        db.collection('obat').get().then(snap => {
            AppApotekObat.data = [];
            snap.forEach(doc => { var d = doc.data(); d.id = doc.id; AppApotekObat.data.push(d); });
            
            // Urutkan manual berdasarkan nama
            AppApotekObat.data.sort((a, b) => (a.namaObat || '').localeCompare(b.namaObat || ''));
            
            AppApotekObat.renderList();
        }).catch(err => Utils.toast('Gagal memuat: ' + err.message, 'error'));
    },

    onSearch: function(val) {
        this.searchQuery = val.toLowerCase().trim();
        this.renderList();
    },

    renderList: function() {
        var container = document.getElementById('obat-list');
        if (!container) return;

        var list = this.data;
        if (this.searchQuery) {
            list = list.filter(o => 
                (o.namaObat && o.namaObat.toLowerCase().includes(this.searchQuery)) || 
                (o.kodeObat && o.kodeObat.toLowerCase().includes(this.searchQuery))
            );
        }

        if (list.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center"><p class="text-slate-400">Tidak ada data obat ditemukan.</p></div>';
            return;
        }

        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<div class="overflow-x-auto">';
        html += '<table class="w-full text-sm">';
        html += '<thead><tr class="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase tracking-wider">';
        html += '<th class="px-3 py-3 text-left">Nama / Kode</th>';
        html += '<th class="px-3 py-3 text-left hidden md:table-cell">Kategori</th>';
        html += '<th class="px-3 py-3 text-right">HPP</th>';
        html += '<th class="px-3 py-3 text-right">Harga Jual</th>';
        html += '<th class="px-3 py-3 text-center">Stok</th>';
        html += '<th class="px-3 py-3 text-left hidden lg:table-cell">Exp Date</th>';
        html += '<th class="px-3 py-3 text-right">Aksi</th>';
        html += '</tr></thead><tbody>';

        list.forEach(o => {
            var safeName = (o.namaObat || '-').replace(/'/g, "\\'");
            // Warning stok menipis
            var stokClass = (o.stok <= (o.stokMinimum || 0)) ? 'text-red-600 font-bold' : 'text-slate-800 dark:text-white font-medium';
            var expClass = o.expDate && new Date(o.expDate) < new Date() ? 'text-red-500' : 'text-slate-500 dark:text-slate-400';

            html += '<tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">';
            html += '<td class="px-3 py-3"><p class="font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(o.namaObat) + '</p><p class="text-xs text-slate-400 font-mono">' + Utils.escapeHtml(o.kodeObat || '-') + '</p></td>';
            html += '<td class="px-3 py-3 text-slate-500 dark:text-slate-400 hidden md:table-cell text-xs">' + Utils.escapeHtml(o.kategori || '-') + '</td>';
            html += '<td class="px-3 py-3 text-right text-slate-500 text-xs">' + Utils.formatRupiah(o.hpp) + '</td>';
            html += '<td class="px-3 py-3 text-right text-slate-800 dark:text-slate-200 text-xs">' + Utils.formatRupiah(o.hargaJual) + '</td>';
            html += '<td class="px-3 py-3 text-center ' + stokClass + '">' + (o.stok || 0) + ' ' + Utils.escapeHtml(o.satuan || '') + '</td>';
            html += '<td class="px-3 py-3 text-xs hidden lg:table-cell ' + expClass + '">' + Utils.escapeHtml(o.expDate || '-') + '</td>';
            html += '<td class="px-3 py-3 text-right space-x-1">';
            html += '<button onclick="AppApotekObat.openForm(\'' + o.id + '\')" class="p-1.5 text-slate-400 hover:text-primary-600 rounded" title="Edit"><i data-lucide="pencil" class="w-4 h-4"></i></button>';
            html += '<button onclick="AppApotekObat.hapus(\'' + o.id + '\', \'' + safeName + '\')" class="p-1.5 text-slate-400 hover:text-red-600 rounded" title="Hapus"><i data-lucide="trash-2" class="w-4 h-4"></i></button>';
            html += '</td></tr>';
        });

        html += '</tbody></table></div></div>';
        html += '<p class="text-xs text-slate-400 mt-2 text-right">Total: ' + list.length + ' item obat</p>';
        
        container.innerHTML = html;
        lucide.createIcons();
    },

    openForm: function(id) {
        var isEdit = !!id;
        var o = isEdit ? this.data.find(x => x.id === id) : {};
        
        var html = '<div class="p-6 max-h-[90vh] overflow-y-auto">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">' + (isEdit ? 'Edit' : 'Tambah') + ' Obat</h3><button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';
        
        html += '<form id="form-obat" class="space-y-4">';
        
        html += '<div class="grid grid-cols-3 gap-4">';
        html += '<div class="col-span-2"><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Obat *</label><input type="text" id="fo-nama" value="' + Utils.escapeHtml(o.namaObat || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" required placeholder="Paracetamol 500mg"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kode Obat</label><input type="text" id="fo-kode" value="' + Utils.escapeHtml(o.kodeObat || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="OB-001"></div>';
        html += '</div>';

        html += '<div class="grid grid-cols-3 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori</label><input type="text" id="fo-kat" value="' + Utils.escapeHtml(o.kategori || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Tablet, Sirup"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Satuan</label><input type="text" id="fo-satuan" value="' + Utils.escapeHtml(o.satuan || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Strip, Botol"></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Exp Date</label><input type="date" id="fo-exp" value="' + (o.expDate || '') + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        html += '</div>';

        html += '<div class="grid grid-cols-3 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">HPP / Harga Beli *</label><input type="number" id="fo-hpp" value="' + (o.hpp || 0) + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" required></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Harga Jual (Bebas) *</label><input type="number" id="fo-jual" value="' + (o.hargaJual || 0) + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" required></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Stok Minimum</label><input type="number" id="fo-min" value="' + (o.stokMinimum || 0) + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        html += '</div>';

        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Stok Awal</label><input type="number" id="fo-stok" value="' + (isEdit ? (o.stok || 0) : 0) + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" ' + (isEdit ? '' : 'readonly') + '></div>';
        html += '<div class="flex items-end"><p class="text-xs text-slate-400 pb-2">*Stok awal 0. Untuk menambah stok, gunakan menu <strong>Pembelian Obat</strong>.</p></div>';
        html += '</div>';

        html += '<div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-6 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg">Simpan</button>';
        html += '</div>';
        
        if (isEdit) html += '<input type="hidden" id="fo-id" value="' + o.id + '">';
        html += '</form></div>';

        Utils.openModal(html);

        setTimeout(() => {
            document.getElementById('form-obat').addEventListener('submit', function(e) {
                e.preventDefault();
                AppApotekObat.simpan();
            });
        }, 100);
    },

    simpan: function() {
        var idField = document.getElementById('fo-id');
        var isEdit = !!idField;
        
        var obj = {
            namaObat: document.getElementById('fo-nama').value.trim(),
            kodeObat: document.getElementById('fo-kode').value.trim(),
            kategori: document.getElementById('fo-kat').value.trim(),
            satuan: document.getElementById('fo-satuan').value.trim(),
            expDate: document.getElementById('fo-exp').value,
            hpp: parseFloat(document.getElementById('fo-hpp').value) || 0,
            hargaJual: parseFloat(document.getElementById('fo-jual').value) || 0,
            stokMinimum: parseFloat(document.getElementById('fo-min').value) || 0,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!obj.namaObat || obj.hpp <= 0 || obj.hargaJual <= 0) {
            Utils.toast('Nama, HPP, dan Harga Jual wajib diisi', 'error');
            return;
        }

        var p;
        if (isEdit) {
            // Saat edit, stok tidak diubah lewat sini
            p = db.collection('obat').doc(idField.value).update(obj);
        } else {
            // Saat tambah baru, stok diambil dari input (defaultnya 0)
            obj.stok = parseFloat(document.getElementById('fo-stok').value) || 0;
            obj.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            p = db.collection('obat').add(obj);
        }

        p.then(() => {
            Utils.toast('Data obat berhasil disimpan!', 'success');
            Utils.closeModal();
            AppApotekObat.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    },

    hapus: function(id, nama) {
        if (!confirm('Hapus obat "' + nama + '"?')) return;
        db.collection('obat').doc(id).delete().then(() => {
            Utils.toast('Berhasil dihapus', 'success');
            AppApotekObat.init();
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    }
};
