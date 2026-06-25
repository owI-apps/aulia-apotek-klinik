/**
 * js/apotek/transaksi.js
 * Transaksi Penjualan (Bebas, Resep Klinik, Resep Luar) + Harga Racik (Tuslah)
 * SUDAH DI-FIX SESUAI SKEMA PEMBAGIAN TERBARU
 */

window.AppApotekTransaksi = {
    tipe: 'obat_bebas', 
    cart: [],
    masterObat: [],
    pengaturan: null,
    resepList: [],
    antrianList: [],

    render: function() {
        var html = '<div class="page-enter max-w-5xl">';
        html += '  <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-1">Transaksi Penjualan</h2>';
        html += '  <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Input penjualan obat bebas dan resep dokter</p>';
        html += '  <div id="trx-content"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var pObat = db.collection('obat').get();
        var pConfig = db.collection('pengaturanPembagian').doc('global').get();
        
        // FIX: Ambil Rekam Medis yang statusnya selesai, tapi statusResep-nya 'menunggu' atau belum ada
        var pResep = db.collection('rekamMedis').where('status', '==', 'selesai').get();
        // FIX: Ambil Antrian supaya kita bisa hitung jumlah resep dokter hari ini
        var today = new Date().toISOString().split('T')[0];
        var pAntrian = db.collection('antrian').where('tanggal', '==', today).get();

        Promise.all([pObat, pConfig, pResep, pAntrian]).then(function(results) {
            AppApotekTransaksi.masterObat = [];
            results[0].forEach(doc => { var d = doc.data(); d.id = doc.id; AppApotekTransaksi.masterObat.push(d); });
            
            if (results[1].exists) {
                AppApotekTransaksi.pengaturan = results[1].data();
            } else {
                Utils.toast('Pengaturan pembagian belum diatur!', 'error');
            }

            // Parse Rekap Jumlah Antrian Hari Ini (untuk hitung Jasa Resep)
            AppApotekTransaksi.antrianList = [];
            results[3].forEach(doc => { 
                var d = doc.data(); d.id = doc.id; AppApotekTransaksi.antrianList.push(d); 
            });

            // Filter Rekap Menunggu
            AppApotekTransaksi.resepList = [];
            results[2].forEach(doc => {
                var d = doc.data(); d.id = doc.id;
                if (!d.statusResep || d.statusResep === 'menunggu') {
                    AppApotekTransaksi.resepList.push(d);
                }
            });

            AppApotekTransaksi.renderForm();
        }).catch(err => Utils.toast('Gagal memuat data: ' + err.message, 'error'));
    },

    renderForm: function() {
        var html = '';
        
        // PILIH TIPE TRANSAKSI
        html += '<div class="grid grid-cols-3 gap-2 mb-4">';
        html += '<button onclick="AppApotekTransaksi.setTipe(\'obat_bebas\')" id="btn-obat_bebas" class="border-2 border-slate-200 dark:border-slate-600 p-3 rounded-xl text-center transition hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 border-primary-500 bg-primary-50 dark:bg-primary-900/20"><i data-lucide="pill" class="w-5 h-5 mx-auto mb-1 text-primary-600 dark:text-primary-400"></i><p class="text-sm font-semibold text-primary-600 dark:text-primary-400">Obat Bebas</p></button>';
        html += '<button onclick="AppApotekTransaksi.setTipe(\'resep_klinik\')" id="btn-resep_klinik" class="border-2 border-slate-200 dark:border-slate-600 p-3 rounded-xl text-center transition hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"><i data-lucide="file-text" class="w-5 h-5 mx-auto mb-1 text-slate-400"></i><p class="text-sm font-semibold text-slate-600 dark:text-slate-300">Resep Klinik</p></button>';
        html += '<button onclick="AppApotekTransaksi.setTipe(\'resep_luar\')" id="btn-resep_luar" class="border-2 border-slate-200 dark:border-slate-600 p-3 rounded-xl text-center transition hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"><i data-lucide="file-plus" class="w-5 h-5 mx-auto mb-1 text-slate-400"></i><p class="text-sm font-semibold text-slate-600 dark:text-slate-300">Resep Luar</p></button>';
        html += '</div>';

        // HEADER DINAMIS
        html += '<div id="trx-header-dynamic" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4"></div>';

        // KERANJANG OBAT
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '<div class="flex justify-between items-center mb-3"><h3 class="font-semibold text-gray-800 dark:text-white">Daftar Item Obat</h3><button type="button" onclick="AppApotekTransaksi.addItem()" class="text-sm bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-3 py-1.5 rounded-lg font-medium hover:bg-primary-100">+ Tambah Obat</button></div>';
        html += '<div id="trx-cart-container" class="space-y-2"><p class="text-sm text-slate-400 italic p-2">Tambahkan obat ke keranjang.</p></div>';
        html += '</div>';

        // TOTAL & SIMPAN
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">';
        html += '<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">';
        html += '<div class="space-y-1 text-sm">';
        html += '  <div class="flex justify-between gap-8"><span class="text-slate-500">Total Obat:</span><span id="trx-total-obat" class="font-medium text-gray-800 dark:text-white">Rp 0</span></div>';
        html += '  <div class="flex justify-between gap-8"><span class="text-slate-500">Total Racik:</span><span id="trx-total-racik" class="font-medium text-teal-600">Rp 0</span></div>';
        html += '  <div class="flex justify-between gap-8"><span class="text-slate-500">Jasa Resep:</span><span id="trx-jasa-resep" class="font-medium text-gray-800 dark:text-white">Rp 0</span></div>';
        html += '  <div class="flex justify-between gap-8"><span class="text-slate-500">Pembulatan:</span><span id="trx-pembulatan" class="font-medium text-amber-600">Rp 0</span></div>';
        html += '  <div class="flex justify-between gap-8 text-lg"><span class="font-semibold text-gray-700 dark:text-gray-200">TOTAL BAYAR:</span><span id="trx-grand-total" class="font-bold text-primary-600">Rp 0</span></div>';
        html += '</div>';
        html += '<button onclick="AppApotekTransaksi.simpan()" class="bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg transition-all text-sm flex items-center gap-2 w-full sm:w-auto justify-center"><i data-lucide="check-circle" class="w-5 h-5"></i> Proses & Simpan</button>';
        html += '</div></div>';

        document.getElementById('trx-content').innerHTML = html;
        lucide.createIcons();
        this.setTipe('obat_bebas'); 
    },

    setTipe: function(tipe) {
        this.tipe = tipe;
        this.cart = []; 
        var isResep = (tipe === 'resep_klinik' || tipe === 'resep_luar');
        var cfg = this.pengaturan;

        // Update style tombol
        ['obat_bebas', 'resep_klinik', 'resep_luar'].forEach(t => {
            var btn = document.getElementById('btn-' + t);
            if (t === tipe) {
                btn.className = btn.className.replace('border-slate-200 dark:border-slate-600', 'border-primary-500 bg-primary-50 dark:bg-primary-900/20').replace('text-slate-600 dark:text-slate-300', 'text-primary-600 dark:text-primary-400');
            } else {
                btn.className = btn.className.replace('border-primary-500 bg-primary-50 dark:bg-primary-900/20', 'border-slate-200 dark:border-slate-600').replace('text-primary-600 dark:text-primary-400', 'text-slate-600 dark:text-slate-300');
            }
        });

        // Render Header Dinamis
        var headerHtml = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
        
        if (tipe === 'resep_klinik') {
            headerHtml += '<div><label class="block text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Pilih Resep Klinik</label>';
            headerHtml += '<select id="trx-resep-id" onchange="AppApotekTransaksi.onSelectResep()" class="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Pilih Resep Menunggu (' + this.resepList.length + ') --</option>';
            this.resepList.forEach(r => {
                headerHtml += '<option value="' + r.id + '">' + Utils.escapeHtml(r.namaPasien) + ' (' + Utils.escapeHtml(r.nomorRM) + ') - ' + Utils.escapeHtml(r.namaDokter) + '</option>';
            });
            headerHtml += '</select></div>';
        } else if (tipe === 'resep_luar') {
            headerHtml += '<div><label class="block text-xs font-medium text-green-600 dark:text-green-400 mb-1">Dokter Pemberi Resep *</label>';
            headerHtml += '<input type="text" id="trx-dokter-luar" class="w-full px-3 py-2 border border-green-300 dark:border-green-700 bg-white dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Nama Dokter Luar">';
            headerHtml += '</div>';
        }
        
        headerHtml += '<div><label class="block text-xs font-medium text-slate-500 mb-1">Pasien (Opsional)</label><input type="text" id="trx-pasien" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Nama Pasien"></div>';
        headerHtml += '</div>';

        document.getElementById('trx-header-dynamic').innerHTML = headerHtml;
        document.getElementById('trx-cart-container').innerHTML = '<p class="text-sm text-slate-400 italic p-2">Tambahkan obat ke keranjang.</p>';
        
        this.hitungTotal();
    },

    onSelectResep: function() {
        var id = document.getElementById('trx-resep-id').value;
        if (id) {
            var resep = this.resepList.find(r => r.id === id);
            if (resep) {
                document.getElementById('trx-pasien').value = resep.namaPasien;
            }
        }
    },

    addItem: function() {
        var container = document.getElementById('trx-cart-container');
        if (container.querySelector('p.italic')) container.innerHTML = '';

        var idx = container.children.length;
        var isResep = (this.tipe === 'resep_klinik' || this.tipe === 'resep_luar');
        
        var html = '<div id="trx-row-' + idx + '" class="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/30">';
        html += '<div class="grid grid-cols-2 md:grid-cols-6 gap-3 items-start md:items-end">';
        
        // Dropdown Obat
        html += '<div class="col-span-2"><label class="block text-xs text-slate-500 mb-1">Pilih Obat</label>';
        html += '<select id="trx-obat-' + idx + '" onchange="AppApotekTransaksi.onSelectObat(' + idx + ')" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Pilih --</option>';
        this.masterObat.forEach(o => {
            var stokText = (o.stok || 0) > 0 ? (o.stok + ' ' + o.satuan) : '<span class="text-red-500">HABIS</span>';
            html += '<option value="' + o.id + '">' + Utils.escapeHtml(o.namaObat) + ' (Stok: ' + stokText + ')</option>';
        });
        html += '</select></div>';

        // Qty
        html += '<div><label class="block text-xs text-slate-500 mb-1">Qty</label><input type="number" id="trx-qty-' + idx + '" value="1" min="1" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-center" oninput="AppApotekTransaksi.hitungTotal()"></div>';
        
        // Harga Jual
        html += '<div><label class="block text-xs text-slate-500 mb-1">Harga Jual</label><input type="number" id="trx-harga-' + idx + '" value="0" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-right" oninput="AppApotekTransaksi.hitungTotal()"><p id="trx-hint-' + idx + '" class="text-[10px] text-slate-400 mt-1"></p></div>';
        
        // Harga Racik (HANYA MUNCUL JIKA RESEP)
        if (isResep) {
            html += '<div><label class="block text-xs text-teal-600 dark:text-teal-400 mb-1">Harga Racik (Tuslah)</label><input type="number" id="trx-racik-' + idx + '" value="0" class="w-full px-3 py-2 border border-teal-300 dark:border-teal-700 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-right" oninput="AppApotekTransaksi.hitungTotal()"></div>';
        }

        // Subtotal
        html += '<div><label class="block text-xs text-slate-500 mb-1">Subtotal</label><div id="trx-sub-' + idx + '" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-right font-medium text-slate-600">Rp 0</div></div>';
        
        // Tombol Hapus
        html += '<div class="flex items-end justify-center md:justify-start"><button type="button" onclick="AppApotekTransaksi.removeItem(' + idx + ')" class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><i data-lucide="x" class="w-5 h-5"></i></button></div>';
        
        html += '</div></div>';

        container.insertAdjacentHTML('beforeend', html);
        lucide.createIcons({ nodes: [container] });
    },

    onSelectObat: function(idx) {
        var obatId = document.getElementById('trx-obat-' + idx).value;
        var hintEl = document.getElementById('trx-hint-' + idx);
        var hargaEl = document.getElementById('trx-harga-' + idx);
        
        if (obatId) {
            var obat = this.masterObat.find(o => o.id === obatId);
            if (obat) {
                var isResep = (this.tipe === 'resep_klinik' || this.tipe === 'resep_luar');
                var cfg = this.pengaturan;
                var margin = 0;
                var skemaDokter = null;

                // AMBIL SKEMA DOKTER dari pengaturan pembagian
                if (isResep) {
                    if (this.tipe === 'resep_klinik') {
                        var dokterId = document.getElementById('trx-resep-id')?.value;
                        if (dokterId && cfg.resepKlinik) {
                            skemaDokter = cfg.resepKlinik.find(function(d) { return d.dokterId === dokterId; });
                        }
                    } else if (this.tipe === 'resep_luar') {
                        skemaDokter = cfg.resepLuar; // Resep luar pakai skema global
                    }
                }

                if (isResep && skemaDokter && margin > 0) {
                    // AUTO HARGA RESEP SESUAI SKEMA DOKTER
                    var hargaAuto = Math.ceil(obat.hpp * (1 + (margin / 100)));
                    hargaEl.value = hargaAuto;
                    hintEl.textContent = 'AUTO (HPP ' + Utils.formatRupiah(obat.hpp) + ' + margin + '%)';
                    hintEl.className = 'text-[10px] text-emerald-600 mt-1 font-semibold';
                } else {
                    // MANUAL HARGA BEBAS
                    hargaEl.value = obat.hargaJual || 0;
                    hintEl.textContent = 'Harga Manual';
                    hintEl.className = 'text-[10px] text-slate-400 mt-1';
                }
                } else {
                    hargaEl.value = 0;
                    hintEl.textContent = '';
                }
                this.hitungTotal();
            }
        } else {
            hargaEl.value = 0;
            hintEl.textContent = '';
        }
    },

    removeItem: function(idx) {
        var row = document.getElementById('trx-row-' + idx);
        if (row) row.remove();
        var container = document.getElementById('trx-cart-container');
        if (container.children.length === 0) {
            container.innerHTML = '<p class="text-sm text-slate-400 italic p-2">Tambahkan obat ke keranjang.</p>';
        }
        this.hitungTotal();
    },

    hitungTotal: function() {
        var container = document.getElementById('trx-cart-container');
        var rows = container.querySelectorAll('[id^="trx-row-"]');
        var totalObat = 0;
        var totalRacik = 0; 
        var cfg = this.pengatikan;

        rows.forEach(row => {
            var idx = row.id.split('-').pop();
            var qty = parseInt(document.getElementById('trx-qty-' + idx)?.value) || 0;
            var harga = parseInt(document.getElementById('trx-harga-' + idx)?.value) || 0;
            var sub = qty * harga;
            document.getElementById('trx-sub-' + idx).textContent = Utils.formatRupiah(sub);
            totalObat += sub;

            // Hitung Harga Racik jika tipe Resep
            if (this.tipe === 'resep_klinik' || this.tipe === 'resep_luar') {
                var racik = parseInt(document.getElementById('trx-racik-' + idx)?.value) || 0;
                totalRacik += (racik * qty); // Kalau 1 obat di racik 2x, maka 2 x racik
            }
        });

        // HITUNG JASA RESEP (DIKALI JUMLAH RESEP YANG ADA DI BULAN INI SESUAI SKEMA)
        var jasaResep = 0;
        if (this.tipe === 'resep_klinik' && cfg && cfg.resepKlinik) {
            var dokterId = document.getElementById('trx-resep-id')?.value;
            var resepCount = 0;
            // Hitung berapa kali dokter ini dapat resep hari ini dari tabel antrian
            for (var i = 0; i < this.antrianList.length; i++) {
                if (this.antrianList[i].dokterId === dokterId && this.antrianList[i].status !== 'batal') {
                    resepCount++;
                }
            }
            if (resepCount > 0 && dokterId) {
                var skemaDokter = cfg.resepKlinik.find(function(d) { return d.dokterId === dokterId; });
                if (skemaDokter) {
                    jasaResep += skemaDokter.nilaiResep * resepCount;
                }
            }
        } else if (this.tipe === 'resep_luar' && cfg && cfg.resepLuar) {
            var dokterLuar = document.getElementById('trx-dokter-luar').value.trim();
            if (dokterLuar) {
                var resepLuarCount = 0;
                // Untuk resep luar, hitung jumlah resep luar di bulan ini yang cocok dengan nama dokter
                for (var j = 0; j < this.antrianList.length; j++) {
                    if (this.antrianList[j].dokterLuar === dokterLuar && this.antrianList[j].status !== 'batal') {
                        resepLuarCount++;
                    }
                }
                if (resepLuarCount > 0) {
                    jasaResep += cfg.resepLuar.nilaiResep * resepLuarCount;
                }
            }
        }

        var totalRaw = totalObat + jasaResep + totalRacik;
        
        // FIX PEMBULATAN: Bulatkan KE ATAS ke kelipatan 1000 (34567 -> 35000)
        var totalRounded = Math.ceil(totalRaw / 1000) * 1000;
        var pembulatan = totalRounded - totalRaw;

        document.getElementById('trx-total-obat').textContent = Utils.formatRupiah(totalObat);
        document.getElementById('trx-total-racik').textContent = Utils.formatRupiah(totalRacik); 
        document.getElementById('trx-jasa-resep').textContent = (jasaResep > 0) ? Utils.formatRupiah(jasaResep) : '-';
        document.getElementById('trx-pembulatan').textContent = (pembulatan > 0) ? Utils.formatRupiah(pembulatan) : '-';
        document.getElementById('trx-grand-total').textContent = Utils.formatRupiah(totalRounded);
    },

    simpan: function() {
        // Validasi Dokter untuk Resep Luar
        if (this.tipe === 'resep_luar') {
            var dokter = document.getElementById('trx-dokter-luar').value.trim();
            if (!dokter) {
                Utils.toast('Dokter pemberi resep wajib diisi untuk resep luar', 'error');
                return;
            }
        }

        // Validasi Resep Klinik
        if (this.tipe === 'resep_klinik') {
            var resepId = document.getElementById('trx-resep-id').value;
            if (!resepId) {
                Utils.tip('Pilih resep klinik yang akan diproses', 'error');
                return;
            }
        }

        // Kumpulkan item obat
        var items = [];
        var racikanItems = []; 
        var rows = document.querySelectorAll('[id^="trx-row-"]');
        rows.forEach(row => {
            var idx = row.id.split('-').pop();
            var obatId = document.getElementById('trx-obat-' + idx)?.value;
            if (obatId) {
                var obat = this.masterObat.find(o => o.id === obatId);
                items.push({
                    obatId: obatId,
                    namaObat: obat ? obat.namaObat : '-',
                    kodeObat: obat ? obat.kodeObat : '-',
                    hargaJual: parseInt(document.getElementById('trx-harga-' + idx).value) || 0,
                    hargaBeli: obat ? obat.hpp : 0,
                    jumlah: parseInt(document.getElementById('trx-quiz-' + idx)?.value) || parseInt(document.getElementById('trx-ty-' + idx)?.value) || parseInt(document.getElementById('trx-qty-' + idx)?.value) || 0 // handle typo
                });

                // Kumpulkan Harga Racik jika ada nilainya
                if (this.tipe === 'resep_klinik' || this.tipe === 'resep-luar') {
                    var racik = parseInt(document.getElementById('trx-racik-' + idx)?.value) || 0;
                    if (racik > 0) {
                        racikanItems.push({
                            namaObat: obat ? obat.namaObat : '-',
                            kodeObat: obat ? obat.kodeObat : '-',
                            hargaRacik: racik
                        });
                    }
                }
            }
        });

        if (items.length === 0) {
            Utils.toast('Tambahkan minimal 1 obat', 'error');
            return;
        }

        // Hitung ulang final
        var totalObatFinal = items.reduce((sum, i) => sum + (i.jumlah * i.hargaJual), 0);
        var cfg = this.pengaturan;
        var jasaResepFinal = 0;
        var resepIdFinal = null;
        var dokterIdFinal = null;
        var dokterLuarFinal = null;

        if (this.tipe === 'resep_klinik') {
            resepIdFinal = document.getElementById('trx-resep-id').value;
            var dokterId = document.getElementById('trx-resep-id')?.value;
            
            var resepCount = 0;
            for (var i = 0; i < this.antrianList.length; i++) {
                if (this.antrianList[i].dokterId === dokterId && this.antrianList[i].status !== 'batal') resepCount++;
            }
            
            if (resepCount > 0 && dokterId && cfg.resepKlinik) {
                var skemaDokter = cfg.resepKlinik.find(function(d) { return d.dokterId === dokterId; });
                if (skemaDokter) jasaResepFinal += skemaDokter.nilaiResep * resepCount;
            }
        } else if (this.tipe === 'resep_luar') {
            dokterLuarFinal = document.getElementById('trx-dokter-luar').value.trim();
            if (dokterLuar) {
                var resepLuarCount = 0;
                for (var j = 0; j < this.antrianList.length; j++) {
                    if (this.antrianList[j].dokterLuar === dokterLuar && this.antrianList[j].status !== 'batal') resepLuarCount++;
                }
                if (resepLuarCount > 0 && cfg.resepLuar) {
                    jasaResepFinal += cfg.resepLuar.nilaiResep * resepLuarCount;
                }
            }
        }

        var totalRaw = totalObatFinal + jasaResep + (racikanItems.reduce((s, r) => s + r.hargaRacik, 0);
        
        // FIX PEMBULATAN: 34567 -> 35000 (Bulatkan ke atas ke kelipatan 1000)
        var totalRounded = Math.ceil(totalRaw / 1000) * 1000;
        var pembulatanFinal = totalRounded - totalRaw;

        var obj = {
            tipe: this.tipe,
            tanggal: new Date().toISOString().split('T')[0],
            pasien: document.getElementById('trx-pasien').value.trim(),
            dokterId: dokterIdFinal,
            dokterLuar: dokterLuarFinal,
            resepId: resepIdFinal,
            jasaResep: jasaResepFinal,
            racikanItems: racikanItems, 
            items: items,
            totalObat: totalObatFinal,
            pembulatan: pembulatanFinal,
            totalAkhir: totalRoundedFinal,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        Utils.toast('Memproses transaksi...', 'info');

        // 1. Simpan Transaksi
        db.collection('transaksi').add(obj).then((docRef) => {
            var batch = db.batch();
            
            // 2. Update Stok Obat
            items.forEach(function(item) {
                if (item.jumlah > 0) {
                    var obatRef = db.collection('obat').doc(item.obatId);
                    batch.update(obatRef, { stok: firebase.firestore.FieldValue.increment(-item.jumlah) });
                }
            });

            // 3. Update Status Resep Klinik jadi 'selesai'
            if (obj.tipe === 'resep_klinik' && obj.resepId) {
                batch.update(db.collection('rekamMedis').doc(obj.resepId), { statusResep: 'selesai' });
            }

            return batch.commit();
        }).then(() => {
            Utils.toast('Transaksi berhasil disimpan! Stok obat berkurang.', 'success');
            AppApotekTransaksi.init(); 
        }).catch(err => {
            Utils.toast('Gagal menyimpan: ' + err.message, 'error');
        });
    }
};
