/**
 * js/apotek/pembelian.js
 * Pembelian Obat dari Supplier (Menambah Stok)
 */

window.AppApotekPembelian = {
    data: [],
    obatList: [],
    detailItems: [],

    render: function() {
        var html = '<div class="page-enter max-w-5xl">';
        html += '  <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-1">Pembelian Obat</h2>';
        html += '  <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Catat pembelian dari supplier, stok obat otomatis bertambah</p>';
        html += '  <div id="pembelian-content"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        // Ambil data obat untuk dropdown
        db.collection('obat').get().then(snap => {
            AppApotekPembelian.obatList = [];
            snap.forEach(doc => { var d = doc.data(); d.id = doc.id; AppApotekPembelian.obatList.push(d); });
            AppApotekPembelian.obatList.sort((a, b) => (a.namaObat || '').localeCompare(b.namaObat || ''));
            AppApotekPembelian.renderForm();
        }).catch(err => Utils.toast('Gagal memuat: ' + err.message, 'error'));
    },

    renderForm: function() {
        AppApotekPembelian.detailItems = []; // Reset keranjang
        var today = new Date().toISOString().split('T')[0];
        var html = '';

        // INFO HEADER
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '<div class="grid grid-cols-1 md:grid-cols-3 gap-4">';
        html += '<div><label class="block text-xs font-medium text-slate-500 mb-1">No. Faktur / Bukti</label><input type="text" id="beli-nofaktur" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Faktur-001" required></div>';
        html += '<div><label class="block text-xs font-medium text-slate-500 mb-1">Tanggal</label><input type="date" id="beli-tgl" value="' + today + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" required></div>';
        html += '<div><label class="block text-xs font-medium text-slate-500 mb-1">Supplier</label><input type="text" id="beli-supplier" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="PT. Kimia Farma" required></div>';
        html += '</div></div>';

        // KERANJANG INPUT OBAT
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '<div class="flex justify-between items-center mb-3"><h3 class="font-semibold text-gray-800 dark:text-white">Daftar Obat</h3><button type="button" onclick="AppApotekPembelian.addItem()" class="text-sm bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-3 py-1.5 rounded-lg font-medium hover:bg-primary-100">+ Tambah Obat</button></div>';
        html += '<div id="beli-items-container" class="space-y-2">';
        html += '<p class="text-sm text-slate-400 italic p-2">Klik tambah obat untuk mulai input.</p>';
        html += '</div></div>';

        // TOTAL & SIMPAN
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">';
        html += '<div class="flex justify-between items-center">';
        html += '<div>';
        html += '  <p class="text-sm text-slate-500">Total Item: <span id="beli-total-item" class="font-semibold text-gray-800 dark:text-white">0</span></p>';
        html += '  <p class="text-lg font-bold text-gray-800 dark:text-white">Total Harga: <span id="beli-total-harga" class="text-primary-600">Rp 0</span></p>';
        html += '</div>';
        html += '<button onclick="AppApotekPembelian.simpan()" class="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg transition-all text-sm flex items-center gap-2"><i data-lucide="save" class="w-4 h-4"></i> Simpan Pembelian</button>';
        html += '</div></div>';

        // RIWAYAT PEMBELIAN
        html += '<div id="beli-riwayat"></div>';

        document.getElementById('pembelian-content').innerHTML = html;
        lucide.createIcons();
        this.loadRiwayat();
    },

    addItem: function() {
        var container = document.getElementById('beli-items-container');
        if (container.querySelector('p.italic')) container.innerHTML = '';

        var idx = container.children.length;
        var html = '<div id="beli-row-' + idx + '" class="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/30">';
        html += '<div class="flex flex-col md:flex-row gap-3 items-start md:items-end">';
        
        // Dropdown Obat
        html += '<div class="w-full md:w-2/5"><label class="block text-xs text-slate-500 mb-1">Pilih Obat</label>';
        html += '<select id="beli-obat-' + idx + '" onchange="AppApotekPembelian.onSelectObat(' + idx + ')" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Pilih --</option>';
        this.obatList.forEach(function(o) {
            html += '<option value="' + o.id + '">' + Utils.escapeHtml(o.namaObat) + ' (Stok saat ini: ' + (o.stok || 0) + ')</option>';
        });
        html += '</select></div>';

        // Jumlah & Harga
        html += '<div class="w-full md:w-1/6"><label class="block text-xs text-slate-500 mb-1">Qty</label><input type="number" id="beli-qty-' + idx + '" value="1" min="1" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-center" oninput="AppApotekPembelian.hitungTotal()"></div>';
        html += '<div class="w-full md:w-1/6"><label class="block text-xs text-slate-500 mb-1">Harga Beli</label><input type="number" id="beli-harga-' + idx + '" value="0" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-right" oninput="AppApotekPembelian.hitungTotal()"></div>';
        html += '<div class="w-full md:w-1/6"><label class="block text-xs text-slate-500 mb-1">Subtotal</label><div id="beli-sub-' + idx + '" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-right font-medium text-slate-600">Rp 0</div></div>';
        
        // Tombol Hapus
        html += '<button type="button" onclick="AppApotekPembelian.removeItem(' + idx + ')" class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg self-end md:self-center"><i data-lucide="trash-2" class="w-4 h-4"></i></button>';
        
        html += '</div></div>';

        container.insertAdjacentHTML('beforeend', html);
        lucide.createIcons({ nodes: [container] });
    },

    onSelectObat: function(idx) {
        var obatId = document.getElementById('beli-obat-' + idx).value;
        if (obatId) {
            var obat = this.obatList.find(o => o.id === obatId);
            if (obat) {
                // Auto isi Harga Beli dengan HPP dari master
                document.getElementById('beli-harga-' + idx).value = obat.hpp || 0;
                this.hitungTotal();
            }
        }
    },

    removeItem: function(idx) {
        var row = document.getElementById('beli-row-' + idx);
        if (row) row.remove();
        
        // Kalau habis, tampilkan lagi tulisan kosong
        var container = document.getElementById('beli-items-container');
        if (container.children.length === 0) {
            container.innerHTML = '<p class="text-sm text-slate-400 italic p-2">Klik tambah obat untuk mulai input.</p>';
        }
        this.hitungTotal();
    },

    hitungTotal: function() {
        var container = document.getElementById('beli-items-container');
        var rows = container.querySelectorAll('[id^="beli-row-"]');
        var totalItem = 0;
        var totalHarga = 0;

        rows.forEach(row => {
            var idx = row.id.split('-').pop();
            var qty = parseInt(document.getElementById('beli-qty-' + idx)?.value) || 0;
            var harga = parseInt(document.getElementById('beli-harga-' + idx)?.value) || 0;
            var sub = qty * harga;

            document.getElementById('beli-sub-' + idx).textContent = Utils.formatRupiah(sub);
            totalItem += qty;
            totalHarga += sub;
        });

        document.getElementById('beli-total-item').textContent = totalItem;
        document.getElementById('beli-total-harga').textContent = Utils.formatRupiah(totalHarga);
    },

    simpan: function() {
        var noFaktur = document.getElementById('beli-nofaktur').value.trim();
        var tgl = document.getElementById('beli-tgl').value;
        var supplier = document.getElementById('beli-supplier').value.trim();

        if (!noFaktur || !tgl || !supplier) {
            Utils.toast('No. Faktur, Tanggal, dan Supplier wajib diisi', 'error');
            return;
        }

        // Kumpulkan item
        var items = [];
        var rows = document.querySelectorAll('[id^="beli-row-"]');
        rows.forEach(row => {
            var idx = row.id.split('-').pop();
            var obatId = document.getElementById('beli-obat-' + idx)?.value;
            if (obatId) {
                var obat = this.obatList.find(o => o.id === obatId);
                items.push({
                    obatId: obatId,
                    namaObat: obat ? obat.namaObat : '-',
                    kodeObat: obat ? obat.kodeObat : '-',
                    qty: parseInt(document.getElementById('beli-qty-' + idx).value) || 0,
                    hargaBeli: parseInt(document.getElementById('beli-harga-' + idx).value) || 0
                });
            }
        });

        if (items.length === 0) {
            Utils.toast('Tambahkan minimal 1 obat', 'error');
            return;
        }

        Utils.toast('Menyimpan & mengupdate stok...', 'info');

        // 1. Simpan data pembelian ke Firestore
        var totalHarga = items.reduce((sum, item) => sum + (item.qty * item.hargaBeli), 0);

        db.collection('pembelian').add({
            noFaktur: noFaktur,
            tanggal: tgl,
            supplier: supplier,
            items: items,
            totalHarga: totalHarga,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then((docRef) => {
            // 2. Jika sukses simpan, LANGSUNG UPDATE STOK OBAT
            var batch = db.batch();
            items.forEach(function(item) {
                if (item.qty > 0) {
                    var obatRef = db.collection('obat').doc(item.obatId);
                    // Menggunakan increment agar aman jika ada update bersamaan
                    batch.update(obatRef, { stok: firebase.firestore.FieldValue.increment(item.qty) });
                }
            });

            return batch.commit();
        }).then(() => {
            Utils.toast('Pembelian berhasil disimpan! Stok obat sudah bertambah.', 'success');
            AppApotekPembelian.init(); // Reload form & riwayat
        }).catch(err => {
            Utils.toast('Gagal menyimpan: ' + err.message, 'error');
        });
    },

    loadRiwayat: function() {
        var container = document.getElementById('beli-riwayat');
        if(!container) return;

        // HAPUS orderBy biar gak butuh Composite Index
        db.collection('pembelian').limit(10).get().then(snap => {
            var riwayat = [];
            snap.forEach(doc => { var d = doc.data(); d.id = doc.id; riwayat.push(d); });
            
            // Urutkan manual descending
            riwayat.sort((a, b) => {
                var timeA = a.createdAt ? a.createdAt.seconds : 0;
                var timeB = b.createdAt ? b.createdAt.seconds : 0;
                return timeB - timeA;
            });

            if (riwayat.length === 0) {
                container.innerHTML = '';
                return;
            }

            var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mt-6">';
            html += '<div class="bg-slate-50 dark:bg-slate-900 px-4 py-2 border-b border-slate-200 dark:border-slate-700"><h4 class="text-sm font-semibold text-slate-600 dark:text-slate-400">Riwayat Pembelian Terakhir</h4></div>';
            html += '<table class="w-full text-xs">';
            html += '<thead><tr class="text-slate-500 uppercase"><th class="px-3 py-2 text-left">Tanggal</th><th class="px-3 py-2 text-left">No. Faktur</th><th class="px-3 py-2 text-left">Supplier</th><th class="px-3 py-2 text-center">Jumlah Item</th><th class="px-3 py-2 text-right">Total</th></tr></thead><tbody>';
            
            riwayat.forEach(function(r) {
                var tgl = r.tanggal ? new Date(r.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
                var totalQty = r.items.reduce((sum, i) => sum + i.qty, 0);
                html += '<tr class="border-t border-slate-100 dark:border-slate-700">';
                html += '<td class="px-3 py-2">' + tgl + '</td>';
                html += '<td class="px-3 py-2 font-mono">' + Utils.escapeHtml(r.noFaktur) + '</td>';
                html += '<td class="px-3 py-2">' + Utils.escapeHtml(r.supplier) + '</td>';
                html += '<td class="px-3 py-2 text-center">' + totalQty + '</td>';
                html += '<td class="px-3 py-2 text-right font-semibold text-primary-600">' + Utils.formatRupiah(r.totalHarga) + '</td>';
                html += '</tr>';
            });

            html += '</tbody></table></div>';
            container.innerHTML = html;
        }).catch(err => console.error("Gagal load riwayat:", err));
    }
};
