/**
 * js/apotek/transaksi.js
 * Transaksi Penjualan: Obat Bebas | Resep Klinik | Resep Luar
 *
 * PERBAIKAN dari versi sebelumnya:
 * 1. Bug string HTML tidak tertutup di setTipe() (baris 106 asli) → diperbaiki
 * 2. ID tombol btn-resep-luar (dash) vs btn-resep_luar (underscore) → disamakan semua pakai underscore
 * 3. Variabel tidak terdefinisi: dokterLuar, jasaResep, totalRacik, totalRanged, pembulatanFinal → diperbaiki
 * 4. Kehilangan konteks 'this' di dalam forEach & .then() callback → diselesaikan dengan var self = this
 * 5. Typo Utils.formatRapiah → Utils.formatRupiah
 * 6. Typo class string: 'text-[10px text-slate-400' (tanpa penutup ]) → diperbaiki
 * 7. Penggunaan pengaturanPembagian (collection benar) vs pembagian (yang dipakai modul ini)
 */

window.AppApotekTransaksi = {

    // ========== STATE ==========
    tipe: 'obat_bebas',
    masterObat: [],
    pengaturan: null,
    resepList: [],
    antrianList: [],

    // ========== RENDER (dipanggil oleh app.js) ==========
    render: function() {
        return [
            '<div class="page-enter max-w-5xl">',
            '  <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-1">Transaksi Penjualan</h2>',
            '  <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Input penjualan obat bebas dan resep dokter</p>',
            '  <div id="trx-content">',
            '    <div class="flex justify-center py-20"><div class="spinner"></div></div>',
            '  </div>',
            '</div>'
        ].join('');
    },

    // ========== INIT (dipanggil oleh app.js setelah render) ==========
    init: function() {
        var self = this;
        var today = new Date().toISOString().split('T')[0];

        // CATATAN: collection 'pembagian' (bukan 'pengaturanPembagian') sesuai yang dipakai modul ini
        // rekamMedis difilter status === 'selesai' agar hanya resep yang sudah diproses dokter yang muncul
        Promise.all([
            db.collection('obat').get(),
            db.collection('pembagian').doc('global').get(),
            db.collection('rekamMedis').where('status', '==', 'selesai').get(),
            db.collection('antrian').where('tanggal', '==', today).get()
        ]).then(function(results) {

            // Master Obat
            self.masterObat = [];
            results[0].forEach(function(doc) {
                var d = doc.data();
                d.id = doc.id;
                self.masterObat.push(d);
            });
            self.masterObat.sort(function(a, b) {
                return (a.namaObat || '').localeCompare(b.namaObat || '');
            });

            // Pengaturan Pembagian
            if (results[1].exists) {
                self.pengaturan = results[1].data();
            } else {
                // Coba collection pengaturanPembagian sebagai fallback
                db.collection('pengaturanPembagian').doc('global').get().then(function(snap) {
                    if (snap.exists) self.pengaturan = snap.data();
                });
            }

            // Antrian hari ini (untuk hitung jasa resep per dokter)
            self.antrianList = [];
            results[3].forEach(function(doc) {
                var d = doc.data();
                d.id = doc.id;
                self.antrianList.push(d);
            });

            // Resep klinik yang statusResep masih 'menunggu' atau belum diset
            self.resepList = [];
            results[2].forEach(function(doc) {
                var d = doc.data();
                d.id = doc.id;
                if (!d.statusResep || d.statusResep === 'menunggu') {
                    self.resepList.push(d);
                }
            });

            self.renderForm();

        }).catch(function(err) {
            document.getElementById('trx-content').innerHTML =
                '<div class="text-center py-16">' +
                '  <p class="text-red-500 font-semibold">Gagal memuat data: ' + Utils.escapeHtml(err.message) + '</p>' +
                '  <button onclick="AppApotekTransaksi.init()" class="mt-4 text-sm bg-primary-50 text-primary-600 px-4 py-2 rounded-lg">Coba Lagi</button>' +
                '</div>';
        });
    },

    // ========== RENDER FORM UTAMA ==========
    renderForm: function() {
        var html = '';

        // --- Tombol pilih tipe ---
        html += '<div class="grid grid-cols-3 gap-2 mb-4">';
        html += this._btnTipe('obat_bebas', 'pill', 'Obat Bebas', true);
        html += this._btnTipe('resep_klinik', 'file-text', 'Resep Klinik', false);
        html += this._btnTipe('resep_luar', 'file-plus', 'Resep Luar', false);
        html += '</div>';

        // --- Area header dinamis (pasien, dokter, dropdown resep) ---
        html += '<div id="trx-header-dynamic" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4"></div>';

        // --- Keranjang obat ---
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '  <div class="flex justify-between items-center mb-3">';
        html += '    <h3 class="font-semibold text-gray-800 dark:text-white">Daftar Item Obat</h3>';
        html += '    <button type="button" onclick="AppApotekTransaksi.addItem()" class="text-sm bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-3 py-1.5 rounded-lg font-medium hover:bg-primary-100">+ Tambah Obat</button>';
        html += '  </div>';
        html += '  <div id="trx-cart-container" class="space-y-2"><p class="text-sm text-slate-400 italic p-2">Tambahkan obat ke keranjang.</p></div>';
        html += '</div>';

        // --- Ringkasan total ---
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">';
        html += '  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">';
        html += '    <div class="space-y-1 text-sm w-full sm:w-auto">';
        html += '      <div class="flex justify-between gap-8"><span class="text-slate-500">Total Obat:</span><span id="trx-total-obat" class="font-medium text-gray-800 dark:text-white">Rp 0</span></div>';
        html += '      <div class="flex justify-between gap-8"><span class="text-slate-500">Total Racik:</span><span id="trx-total-racik" class="font-medium text-teal-600">Rp 0</span></div>';
        html += '      <div class="flex justify-between gap-8"><span class="text-slate-500">Jasa Resep:</span><span id="trx-jasa-resep" class="font-medium text-gray-800 dark:text-white">-</span></div>';
        html += '      <div class="flex justify-between gap-8"><span class="text-slate-500">Pembulatan:</span><span id="trx-pembulatan" class="font-medium text-amber-600">-</span></div>';
        html += '      <div class="flex justify-between gap-8 text-lg pt-1 border-t border-slate-100 dark:border-slate-700"><span class="font-semibold text-gray-700 dark:text-gray-200">TOTAL BAYAR:</span><span id="trx-grand-total" class="font-bold text-primary-600">Rp 0</span></div>';
        html += '    </div>';
        html += '    <button onclick="AppApotekTransaksi.simpan()" class="bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg transition-all text-sm flex items-center gap-2 w-full sm:w-auto justify-center">';
        html += '      <i data-lucide="check-circle" class="w-5 h-5"></i> Proses & Simpan';
        html += '    </button>';
        html += '  </div>';
        html += '</div>';

        document.getElementById('trx-content').innerHTML = html;
        lucide.createIcons();

        // Set default tipe obat bebas (sudah aktif secara visual dari _btnTipe)
        this.tipe = 'obat_bebas';
        this._renderHeader('obat_bebas');
    },

    // Helper: render button tipe
    _btnTipe: function(tipe, icon, label, isActive) {
        var activeClass = isActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-slate-200 dark:border-slate-600';
        var textClass = isActive
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-slate-600 dark:text-slate-300';
        return '<button onclick="AppApotekTransaksi.setTipe(\'' + tipe + '\')" id="btn-' + tipe + '" ' +
            'class="border-2 ' + activeClass + ' p-3 rounded-xl text-center transition hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20">' +
            '<i data-lucide="' + icon + '" class="w-5 h-5 mx-auto mb-1 ' + textClass + '"></i>' +
            '<p class="text-sm font-semibold ' + textClass + '">' + label + '</p>' +
            '</button>';
    },

    // ========== SET TIPE (obat_bebas / resep_klinik / resep_luar) ==========
    setTipe: function(tipe) {
        this.tipe = tipe;

        // Update visual tombol
        var tipes = ['obat_bebas', 'resep_klinik', 'resep_luar'];
        tipes.forEach(function(t) {
            var btn = document.getElementById('btn-' + t);
            if (!btn) return;
            if (t === tipe) {
                // Aktif
                btn.className = btn.className
                    .replace(/border-slate-200 dark:border-slate-600/g, '')
                    .replace(/text-slate-600 dark:text-slate-300/g, '');
                if (btn.className.indexOf('border-primary-500') === -1) {
                    btn.className += ' border-primary-500 bg-primary-50 dark:bg-primary-900/20';
                }
                btn.querySelectorAll('i, p').forEach(function(el) {
                    el.className = el.className
                        .replace('text-slate-600 dark:text-slate-300', 'text-primary-600 dark:text-primary-400')
                        .replace('text-slate-400', 'text-primary-600 dark:text-primary-400');
                });
            } else {
                // Non-aktif
                btn.className = btn.className
                    .replace(/border-primary-500/g, '')
                    .replace(/bg-primary-50/g, '')
                    .replace(/dark:bg-primary-900\/20/g, '');
                if (btn.className.indexOf('border-slate-200') === -1) {
                    btn.className += ' border-slate-200 dark:border-slate-600';
                }
                btn.querySelectorAll('i, p').forEach(function(el) {
                    el.className = el.className
                        .replace('text-primary-600 dark:text-primary-400', 'text-slate-600 dark:text-slate-300');
                });
            }
        });

        this._renderHeader(tipe);

        // Reset keranjang saat ganti tipe
        document.getElementById('trx-cart-container').innerHTML =
            '<p class="text-sm text-slate-400 italic p-2">Tambahkan obat ke keranjang.</p>';
        this.hitungTotal();
    },

    // Render bagian header (pasien/dokter input) sesuai tipe
    _renderHeader: function(tipe) {
        // FIX: string class ditutup dengan " sebelum >
        var html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';

        if (tipe === 'resep_klinik') {
            html += '<div><label class="block text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Pilih Resep Klinik</label>';
            html += '<select id="trx-resep-id" onchange="AppApotekTransaksi.onSelectResep()" class="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
            html += '<option value="">-- Pilih Resep Menunggu (' + this.resepList.length + ') --</option>';
            this.resepList.forEach(function(r) {
                html += '<option value="' + r.id + '">' +
                    Utils.escapeHtml(r.namaPasien || '-') + ' (' + Utils.escapeHtml(r.nomorRM || '-') + ')' +
                    ' — ' + Utils.escapeHtml(r.namaDokter || '-') +
                    '</option>';
            });
            html += '</select></div>';
        } else if (tipe === 'resep_luar') {
            html += '<div><label class="block text-xs font-medium text-green-600 dark:text-green-400 mb-1">Dokter Pemberi Resep *</label>';
            html += '<input type="text" id="trx-dokter-luar" oninput="AppApotekTransaksi.hitungTotal()" ' +
                'class="w-full px-3 py-2 border border-green-300 dark:border-green-700 bg-white dark:bg-slate-700 dark:text-white rounded-lg text-sm" ' +
                'placeholder="Nama Dokter Luar">';
            html += '</div>';
        }

        html += '<div><label class="block text-xs font-medium text-slate-500 mb-1">Nama Pasien (Opsional)</label>';
        html += '<input type="text" id="trx-pasien" ' +
            'class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white rounded-lg text-sm" ' +
            'placeholder="Nama Pasien">';
        html += '</div>';

        html += '</div>';

        document.getElementById('trx-header-dynamic').innerHTML = html;
    },

    // Auto-isi nama pasien ketika memilih resep klinik
    onSelectResep: function() {
        var id = document.getElementById('trx-resep-id').value;
        if (!id) return;
        var resep = this.resepList.find(function(r) { return r.id === id; });
        if (resep) {
            document.getElementById('trx-pasien').value = resep.namaPasien || '';
        }
        this.hitungTotal();
    },

    // ========== TAMBAH BARIS OBAT ==========
    addItem: function() {
        var self = this;
        var container = document.getElementById('trx-cart-container');

        // Hapus teks placeholder jika ada
        if (container.querySelector('p.italic')) {
            container.innerHTML = '';
        }

        var idx = container.children.length;
        var isResep = (this.tipe === 'resep_klinik' || this.tipe === 'resep_luar');

        var html = '<div id="trx-row-' + idx + '" class="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/30">';
        html += '<div class="grid grid-cols-2 md:grid-cols-6 gap-3 items-start">';

        // Pilih Obat (col-span-2)
        html += '<div class="col-span-2"><label class="block text-xs text-slate-500 mb-1">Pilih Obat</label>';
        html += '<select id="trx-obat-' + idx + '" onchange="AppApotekTransaksi.onSelectObat(' + idx + ')" ' +
            'class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
        html += '<option value="">-- Pilih Obat --</option>';
        this.masterObat.forEach(function(o) {
            var stok = o.stok || 0;
            var stokLabel = stok > 0 ? stok + ' ' + (o.satuan || 'pcs') : 'HABIS';
            html += '<option value="' + o.id + '" ' + (stok <= 0 ? 'class="text-red-400"' : '') + '>' +
                Utils.escapeHtml(o.namaObat || '-') + ' [' + stokLabel + ']' +
                '</option>';
        });
        html += '</select></div>';

        // Qty
        html += '<div><label class="block text-xs text-slate-500 mb-1">Qty</label>';
        html += '<input type="number" id="trx-qty-' + idx + '" value="1" min="1" ' +
            'oninput="AppApotekTransaksi.hitungTotal()" ' +
            'class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-center">';
        html += '</div>';

        // Harga Jual
        html += '<div><label class="block text-xs text-slate-500 mb-1">Harga Jual</label>';
        html += '<input type="number" id="trx-harga-' + idx + '" value="0" min="0" ' +
            'oninput="AppApotekTransaksi.hitungTotal()" ' +
            'class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-right">';
        html += '<p id="trx-hint-' + idx + '" class="text-[10px] text-slate-400 mt-1"></p>';
        html += '</div>';

        // Harga Racik (hanya untuk resep)
        if (isResep) {
            html += '<div><label class="block text-xs text-teal-600 dark:text-teal-400 mb-1">Harga Racik</label>';
            html += '<input type="number" id="trx-racik-' + idx + '" value="0" min="0" ' +
                'oninput="AppApotekTransaksi.hitungTotal()" ' +
                'class="w-full px-3 py-2 border border-teal-300 dark:border-teal-700 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-right">';
            html += '</div>';
        }

        // Subtotal
        html += '<div><label class="block text-xs text-slate-500 mb-1">Subtotal</label>';
        html += '<div id="trx-sub-' + idx + '" class="px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-right font-medium text-slate-600 dark:text-slate-300">Rp 0</div>';
        html += '</div>';

        // Tombol hapus
        html += '<div class="flex items-end justify-center">';
        html += '<button type="button" onclick="AppApotekTransaksi.removeItem(' + idx + ')" ' +
            'class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">';
        html += '<i data-lucide="x" class="w-5 h-5"></i></button>';
        html += '</div>';

        html += '</div></div>';

        container.insertAdjacentHTML('beforeend', html);
        lucide.createIcons({ nodes: [container] });
    },

    // Auto-set harga saat obat dipilih
    onSelectObat: function(idx) {
        var self = this;
        var obatId = document.getElementById('trx-obat-' + idx).value;
        var hargaEl = document.getElementById('trx-harga-' + idx);
        var hintEl = document.getElementById('trx-hint-' + idx);

        if (!obatId) {
            hargaEl.value = 0;
            if (hintEl) hintEl.textContent = '';
            this.hitungTotal();
            return;
        }

        var obat = this.masterObat.find(function(o) { return o.id === obatId; });
        if (!obat) { this.hitungTotal(); return; }

        var isResep = (this.tipe === 'resep_klinik' || this.tipe === 'resep_luar');
        var cfg = this.pengaturan;
        var marginPersen = (cfg && cfg.marginResep) ? parseFloat(cfg.marginResep) : 0;

        if (isResep && marginPersen > 0 && obat.hpp > 0) {
            // Harga auto dari HPP + margin yang dikonfigurasi di pengaturan pembagian
            var hargaAuto = Math.ceil(obat.hpp * (1 + marginPersen / 100));
            hargaEl.value = hargaAuto;
            if (hintEl) {
                hintEl.textContent = 'AUTO: HPP ' + Utils.formatRupiah(obat.hpp) + ' + ' + marginPersen + '%';
                hintEl.className = 'text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold';
            }
        } else {
            // Harga jual manual dari master obat
            hargaEl.value = obat.hargaJual || 0;
            if (hintEl) {
                hintEl.textContent = 'Harga jual manual';
                hintEl.className = 'text-[10px] text-slate-400 mt-1';
            }
        }

        this.hitungTotal();
    },

    // Hapus baris obat
    removeItem: function(idx) {
        var row = document.getElementById('trx-row-' + idx);
        if (row) row.remove();
        var container = document.getElementById('trx-cart-container');
        if (!container.querySelector('[id^="trx-row-"]')) {
            container.innerHTML = '<p class="text-sm text-slate-400 italic p-2">Tambahkan obat ke keranjang.</p>';
        }
        this.hitungTotal();
    },

    // ========== HITUNG TOTAL ==========
    hitungTotal: function() {
        var self = this;
        var container = document.getElementById('trx-cart-container');
        if (!container) return;

        var rows = container.querySelectorAll('[id^="trx-row-"]');
        var totalObat = 0;
        var totalRacik = 0;
        var cfg = this.pengaturan;

        // FIX: gunakan self bukan this di dalam forEach
        rows.forEach(function(row) {
            var idx = row.id.split('-').pop();
            var qty = parseInt(document.getElementById('trx-qty-' + idx).value) || 0;
            var harga = parseInt(document.getElementById('trx-harga-' + idx).value) || 0;
            var sub = qty * harga;

            var subEl = document.getElementById('trx-sub-' + idx);
            if (subEl) subEl.textContent = Utils.formatRupiah(sub);
            totalObat += sub;

            // Harga racik hanya untuk tipe resep
            if (self.tipe === 'resep_klinik' || self.tipe === 'resep_luar') {
                var racikEl = document.getElementById('trx-racik-' + idx);
                if (racikEl) {
                    var racik = parseInt(racikEl.value) || 0;
                    totalRacik += racik * qty;
                }
            }
        });

        // Hitung jasa resep
        var jasaResep = 0;

        if (this.tipe === 'resep_klinik' && cfg && Array.isArray(cfg.resepKlinik)) {
            var resepIdEl = document.getElementById('trx-resep-id');
            var selectedResepId = resepIdEl ? resepIdEl.value : '';
            if (selectedResepId) {
                // Cari data resep untuk dapat dokterId
                var resepData = this.resepList.find(function(r) { return r.id === selectedResepId; });
                if (resepData && resepData.dokterId) {
                    var dokterId = resepData.dokterId;
                    // Hitung berapa pasien dokter ini yang sudah dilayani hari ini (bukan batal)
                    var pasienDokter = this.antrianList.filter(function(a) {
                        return a.dokterId === dokterId && a.status !== 'batal';
                    }).length;
                    var skemaDokter = cfg.resepKlinik.find(function(d) { return d.dokterId === dokterId; });
                    if (skemaDokter && skemaDokter.nilaiResep > 0 && pasienDokter > 0) {
                        jasaResep = skemaDokter.nilaiResep * pasienDokter;
                    }
                }
            }
        } else if (this.tipe === 'resep_luar' && cfg && cfg.resepLuar) {
            var dokterLuarEl = document.getElementById('trx-dokter-luar');
            var namaDokterLuar = dokterLuarEl ? dokterLuarEl.value.trim() : '';
            if (namaDokterLuar && cfg.resepLuar.nilaiResep > 0) {
                // Hitung pasien dokter luar dengan nama yang sama hari ini
                var pasienDokterLuar = this.antrianList.filter(function(a) {
                    return a.dokterLuar === namaDokterLuar && a.status !== 'batal';
                }).length;
                if (pasienDokterLuar > 0) {
                    jasaResep = cfg.resepLuar.nilaiResep * pasienDokterLuar;
                } else {
                    // Minimal 1 resep jika memang ada input dokter
                    jasaResep = cfg.resepLuar.nilaiResep;
                }
            }
        }

        var totalRaw = totalObat + totalRacik + jasaResep;
        var totalRounded = Math.ceil(totalRaw / 1000) * 1000;
        var pembulatan = totalRounded - totalRaw;

        // Update tampilan
        var elObat = document.getElementById('trx-total-obat');
        var elRacik = document.getElementById('trx-total-racik');
        var elJasa = document.getElementById('trx-jasa-resep');
        var elPembulatan = document.getElementById('trx-pembulatan');
        var elTotal = document.getElementById('trx-grand-total');

        if (elObat) elObat.textContent = Utils.formatRupiah(totalObat);
        if (elRacik) elRacik.textContent = totalRacik > 0 ? Utils.formatRupiah(totalRacik) : '-';
        if (elJasa) elJasa.textContent = jasaResep > 0 ? Utils.formatRupiah(jasaResep) : '-';
        if (elPembulatan) elPembulatan.textContent = pembulatan > 0 ? Utils.formatRupiah(pembulatan) : '-';
        if (elTotal) elTotal.textContent = Utils.formatRupiah(totalRounded);
    },

    // ========== SIMPAN TRANSAKSI ==========
    simpan: function() {
        var self = this;

        // Validasi input wajib per tipe
        if (this.tipe === 'resep_luar') {
            var dokterLuarEl = document.getElementById('trx-dokter-luar');
            if (!dokterLuarEl || !dokterLuarEl.value.trim()) {
                Utils.toast('Nama dokter pemberi resep wajib diisi', 'error');
                return;
            }
        }
        if (this.tipe === 'resep_klinik') {
            var resepIdEl = document.getElementById('trx-resep-id');
            if (!resepIdEl || !resepIdEl.value) {
                Utils.toast('Pilih resep klinik yang akan diproses', 'error');
                return;
            }
        }

        // Kumpulkan item obat
        var items = [];
        var racikanItems = [];
        var rows = document.querySelectorAll('[id^="trx-row-"]');

        // FIX: gunakan self bukan this di dalam forEach
        rows.forEach(function(row) {
            var idx = row.id.split('-').pop();
            var obatId = document.getElementById('trx-obat-' + idx).value;
            if (!obatId) return;

            var obat = self.masterObat.find(function(o) { return o.id === obatId; });
            if (!obat) return;

            var jumlah = parseInt(document.getElementById('trx-qty-' + idx).value) || 0;
            var hargaJual = parseInt(document.getElementById('trx-harga-' + idx).value) || 0;
            if (jumlah <= 0) return;

            items.push({
                obatId: obatId,
                namaObat: obat.namaObat || '-',
                kodeObat: obat.kodeObat || '-',
                satuan: obat.satuan || '-',
                hargaJual: hargaJual,
                hargaBeli: obat.hpp || 0,
                jumlah: jumlah
            });

            // Racikan hanya untuk tipe resep
            if (self.tipe === 'resep_klinik' || self.tipe === 'resep_luar') {
                var racikEl = document.getElementById('trx-racik-' + idx);
                if (racikEl) {
                    var racik = parseInt(racikEl.value) || 0;
                    if (racik > 0) {
                        racikanItems.push({
                            namaObat: obat.namaObat || '-',
                            kodeObat: obat.kodeObat || '-',
                            hargaRacik: racik,
                            jumlah: jumlah
                        });
                    }
                }
            }
        });

        if (items.length === 0) {
            Utils.toast('Tambahkan minimal 1 obat ke keranjang', 'error');
            return;
        }

        // Hitung ulang semua nilai final (jangan ambil dari DOM agar akurat)
        var cfg = this.pengaturan;
        var totalObat = items.reduce(function(sum, i) { return sum + (i.jumlah * i.hargaJual); }, 0);
        var totalRacik = racikanItems.reduce(function(sum, r) { return sum + (r.hargaRacik * r.jumlah); }, 0);
        var jasaResepFinal = 0;
        var resepIdFinal = null;
        var dokterIdFinal = null;
        var dokterLuarFinal = null;

        if (this.tipe === 'resep_klinik') {
            resepIdFinal = document.getElementById('trx-resep-id').value;
            var resepData = this.resepList.find(function(r) { return r.id === resepIdFinal; });
            if (resepData) {
                dokterIdFinal = resepData.dokterId || null;
                if (dokterIdFinal && cfg && Array.isArray(cfg.resepKlinik)) {
                    var pasienDokter = this.antrianList.filter(function(a) {
                        return a.dokterId === dokterIdFinal && a.status !== 'batal';
                    }).length;
                    var skemaDokter = cfg.resepKlinik.find(function(d) { return d.dokterId === dokterIdFinal; });
                    if (skemaDokter && skemaDokter.nilaiResep > 0 && pasienDokter > 0) {
                        jasaResepFinal = skemaDokter.nilaiResep * pasienDokter;
                    }
                }
            }
        } else if (this.tipe === 'resep_luar') {
            dokterLuarFinal = document.getElementById('trx-dokter-luar').value.trim();
            if (dokterLuarFinal && cfg && cfg.resepLuar && cfg.resepLuar.nilaiResep > 0) {
                var pasienDokterLuar = this.antrianList.filter(function(a) {
                    return a.dokterLuar === dokterLuarFinal && a.status !== 'batal';
                }).length;
                jasaResepFinal = cfg.resepLuar.nilaiResep * (pasienDokterLuar > 0 ? pasienDokterLuar : 1);
            }
        }

        var totalRaw = totalObat + totalRacik + jasaResepFinal;
        var totalRounded = Math.ceil(totalRaw / 1000) * 1000;
        var pembulatan = totalRounded - totalRaw;
        var namaPasien = document.getElementById('trx-pasien').value.trim();

        var obj = {
            tipe: this.tipe,
            tanggal: new Date().toISOString().split('T')[0],
            namaPasien: namaPasien,
            dokterId: dokterIdFinal,
            dokterLuar: dokterLuarFinal,
            resepId: resepIdFinal,
            items: items,
            racikanItems: racikanItems,
            totalObat: totalObat,
            totalRacik: totalRacik,
            jasaResep: jasaResepFinal,
            pembulatan: pembulatan,
            totalAkhir: totalRounded,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        Utils.toast('Memproses transaksi...', 'info');

        db.collection('transaksi').add(obj).then(function(docRef) {
            // Kurangi stok obat secara batch
            var updatePromises = items.map(function(item) {
                return db.collection('obat').doc(item.obatId).update({
                    stok: firebase.firestore.FieldValue.increment(-item.jumlah)
                });
            });

            // Tandai resep klinik sebagai selesai
            if (self.tipe === 'resep_klinik' && obj.resepId) {
                updatePromises.push(
                    db.collection('rekamMedis').doc(obj.resepId).update({ statusResep: 'selesai' })
                );
            }

            return Promise.all(updatePromises);

        }).then(function() {
            Utils.toast('Transaksi berhasil! Stok obat telah dikurangi.', 'success');
            // Reset form untuk transaksi berikutnya
            AppApotekTransaksi.init();

        }).catch(function(err) {
            Utils.toast('Gagal menyimpan transaksi: ' + err.message, 'error');
        });
    }
};
