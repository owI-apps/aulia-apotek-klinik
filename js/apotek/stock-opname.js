/**
 * js/apotek/stock-opname.js
 * Manajemen Stock Opname (Penyesuaian Stok Fisik vs Sistem)
 */

window.AppApotekStockOpname = {
    data: [],
    searchQuery: '',

    render: function() {
        var html = '<div class="page-enter max-w-5xl">';
        html += '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '    <div>';
        html += '      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Stock Opname</h2>';
        html += '      <p class="text-sm text-slate-500 dark:text-slate-400">Sesuaikan stok sistem dengan stok fisik di rak</p>';
        html += '    </div>';
        html += '    <button onclick="AppApotekStockOpname.simpanOpname()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2 self-start"><i data-lucide="save" class="w-4 h-4"></i> Simpan Hasil Opname</button>';
        html += '  </div>';
        
        // Info Peringatan
        html += '<div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 text-xs p-3 rounded-lg mb-4 flex items-center gap-2">';
        html += '<i data-lucide="alert-triangle" class="w-4 h-4 flex-shrink-0"></i>';
        html += '<span>Kosongkan kolom <strong>Stok Fisik</strong> jika obat tidak dihitung saat opname ini. Sistem hanya akan mengupdate obat yang diisi.</span>';
        html += '</div>';

        html += '<div class="mb-4 relative">';
        html += '  <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>';
        html += '  <input type="text" id="search-opname" placeholder="Cari nama obat atau kode..." class="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" oninput="AppApotekStockOpname.onSearch(this.value)">';
        html += '</div>';

        html += '<div id="opname-list"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        db.collection('obat').orderBy('namaObat').get().then(snap => {
            AppApotekStockOpname.data = [];
            snap.forEach(doc => { 
                var d = doc.data(); 
                d.id = doc.id; 
                d.stokFisik = ''; // Default kosong
                AppApotekStockOpname.data.push(d); 
            });
            AppApotekStockOpname.renderList();
        }).catch(err => Utils.toast('Gagal memuat: ' + err.message, 'error'));
    },

    onSearch: function(val) {
        this.searchQuery = val.toLowerCase().trim();
        this.renderList();
    },

    renderList: function() {
        var container = document.getElementById('opname-list');
        if (!container) return;

        var list = this.data;
        if (this.searchQuery) {
            list = list.filter(o => 
                (o.namaObat && o.namaObat.toLowerCase().includes(this.searchQuery)) || 
                (o.kodeObat && o.kodeObat.toLowerCase().includes(this.searchQuery))
            );
        }

        if (list.length === 0) {
            container.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center"><p class="text-slate-400">Obat tidak ditemukan.</p></div>';
            return;
        }

        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<div class="overflow-x-auto">';
        html += '<table class="w-full text-sm">';
        html += '<thead><tr class="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase tracking-wider">';
        html += '<th class="px-4 py-3 text-left">Nama / Kode Obat</th>';
        html += '<th class="px-4 py-3 text-center">Stok Sistem</th>';
        html += '<th class="px-4 py-3 text-center">Stok Fisik (Input)</th>';
        html += '<th class="px-4 py-3 text-center">Selisih</th>';
        html += '<th class="px-4 py-3 text-center hidden md:table-cell">Nilai Selisih (Estimasi)</th>';
        html += '</tr></thead><tbody>';

        list.forEach((o, i) => {
            // Karena list difilter, kita perlu cari index asli di this.data
            var realIdx = this.data.findIndex(x => x.id === o.id);
            
            var stokSistem = o.stok || 0;
            var stokFisik = o.stokFisik === '' ? '' : parseInt(o.stokFisik);
            
            var selisih = '-';
            var selisihClass = 'text-slate-400';
            var nilaiSelisih = '-';

            if (stokFisik !== '') {
                var sel = stokFisik - stokSistem;
                if (sel > 0) {
                    selisih = '+' + sel; 
                    selisihClass = 'text-green-600 font-bold';
                    nilaiSelisih = Utils.formatRupiah(sel * (o.hpp || 0));
                } else if (sel < 0) {
                    selisih = sel; 
                    selisihClass = 'text-red-600 font-bold';
                    nilaiSelisih = Utils.formatRupiah(sel * (o.hpp || 0));
                } else {
                    selisih = '0'; 
                    selisihClass = 'text-slate-500';
                    nilaiSelisih = 'Rp 0';
                }
            }

            html += '<tr class="border-t border-slate-100 dark:border-slate-700">';
            html += '<td class="px-4 py-3"><p class="font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(o.namaObat || '-') + '</p><p class="text-xs text-slate-400 font-mono">' + Utils.escapeHtml(o.kodeObat || '-') + '</p></td>';
            html += '<td class="px-4 py-3 text-center text-slate-600 dark:text-slate-300 font-medium">' + stokSistem + ' ' + Utils.escapeHtml(o.satuan || '') + '</td>';
            html += '<td class="px-4 py-3 text-center">';
            html += '<input type="number" id="so-fisik-' + realIdx + '" value="' + (stokFisik !== '' ? stokFisik : '') + '" placeholder="Isi..." class="w-20 px-2 py-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-center focus:ring-2 focus:ring-primary-500 outline-none" oninput="AppApotekStockOpname.hitungSelisih(' + realIdx + ')">';
            html += '</td>';
            html += '<td class="px-4 py-3 text-center ' + selisihClass + '" id="so-selisih-' + realIdx + '">' + selisih + '</td>';
            html += '<td class="px-4 py-3 text-center text-xs hidden md:table-cell text-slate-500" id="so-nilai-' + realIdx + '">' + nilaiSelisih + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table></div></div>';
        container.innerHTML = html;
        lucide.createIcons();
    },

    // Hitung selisih realtime saat kasir ngetik angka
    hitungSelisih: function(idx) {
        var inputEl = document.getElementById('so-fisik-' + idx);
        var selisihEl = document.getElementById('so-selisih-' + idx);
        var nilaiEl = document.getElementById('so-nilai-' + idx);
        
        var obat = this.data[idx];
        var stokSistem = obat.stok || 0;
        var stokFisik = inputEl.value === '' ? '' : parseInt(inputEl.value);

        // Simpan ke state agar tidak hilang saat search
        obat.stokFisik = stokFisik;

        if (stokFisik === '') {
            selisihEl.innerHTML = '-';
            selisihEl.className = 'px-4 py-3 text-center text-slate-400';
            nilaiEl.innerHTML = '-';
            return;
        }

        var sel = stokFisik - stokSistem;
        var nilai = sel * (obat.hpp || 0);

        if (sel > 0) {
            selisihEl.innerHTML = '+' + sel;
            selisihEl.className = 'px-4 py-3 text-center text-green-600 font-bold';
            nilaiEl.innerHTML = Utils.formatRupiah(nilai);
        } else if (sel < 0) {
            selisihEl.innerHTML = sel;
            selisihEl.className = 'px-4 py-3 text-center text-red-600 font-bold';
            nilaiEl.innerHTML = Utils.formatRupiah(nilai);
        } else {
            selisihEl.innerHTML = '0';
            selisihEl.className = 'px-4 py-3 text-center text-slate-500';
            nilaiEl.innerHTML = 'Rp 0';
        }
    },

    simpanOpname: function() {
        var self = this;
        var itemsToUpdate = [];
        var itemsHistory = [];

        // Kumpulkan hanya obat yang diisi stok fisiknya dan ada selisih
        this.data.forEach(function(o, idx) {
            if (o.stokFisik !== '' && !isNaN(o.stokFisik)) {
                var stokLama = o.stok || 0;
                if (o.stokFisik != stokLama) { // Pakai != agar 0 string dan 0 number dianggap sama
                    itemsToUpdate.push({ id: o.id, stokBaru: o.stokFisik });
                    itemsHistory.push({
                        obatId: o.id,
                        namaObat: o.namaObat,
                        kodeObat: o.kodeObat,
                        stokSistem: stokLama,
                        stokFisik: o.stokFisik,
                        selisih: o.stokFisik - stokLama,
                        nilaiSelisih: (o.stokFisik - stokLama) * (o.hpp || 0),
                        satuan: o.satuan || '-'
                    });
                }
            }
        });

        if (itemsToUpdate.length === 0) {
            Utils.toast('Tidak ada perubahan stok untuk disimpan.', 'info');
            return;
        }

        if (!confirm('Anda yakin menyimpan hasil opname? Stok sistem akan diperbarui sesuai input fisik.')) return;

        Utils.toast('Memproses ' + itemsToUpdate.length + ' perubahan stok...', 'info');

        var batch = db.batch();

        // 1. Update stok di master obat
        itemsToUpdate.forEach(function(item) {
            var ref = db.collection('obat').doc(item.id);
            batch.update(ref, { 
                stok: item.stokBaru,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        // 2. Simpan history opname
        var historyRef = db.collection('stockOpnameHistory').doc();
        batch.set(historyRef, {
            tanggal: new Date().toISOString().split('T')[0],
            totalItem: itemsHistory.length,
            items: itemsHistory,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        batch.commit().then(function() {
            Utils.toast('Stock Opname berhasil disimpan!', 'success');
            AppApotekStockOpname.init(); // Refresh halaman
        }).catch(function(err) {
            Utils.toast('Gagal menyimpan: ' + err.message, 'error');
        });
    }
};
