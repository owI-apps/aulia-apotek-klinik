/**
 * js/pengaturan/pembagian.js
 * Otak dari sistem payroll.
 * Mengatur nilai tetap resep, persentase tindakan, dan Slot Karyawan (Dropdown).
 */

window.AppPengaturanPembagian = {

    data: null,
    karyawanList: [],

    render: function() {
        var html = '<div class="page-enter max-w-3xl">';
        html += '  <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-1">Pengaturan Pembagian Hasil</h2>';
        html += '  <p class="text-sm text-gray-500 dark:text-slate-400 mb-6">Konfigurasi pembagian pendapatan untuk payroll bulanan</p>';
        html += '  <div id="pembagian-content"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        // Load Karyawan Aktif DAN Pengaturan secara paralel
        var pKaryawan = db.collection('karyawan').where('status', '==', 'aktif').get();
        var pConfig = db.collection('pengaturanPembagian').doc('global').get();

        Promise.all([pKaryawan, pConfig]).then(function(results) {
            // Parse Karyawan
            AppPengaturanPembagian.karyawanList = [];
            results[0].forEach(function(doc) {
                var d = doc.data(); d.id = doc.id;
                AppPengaturanPembagian.karyawanList.push(d);
            });

            // Parse Config
            if (results[1].exists) {
                AppPengaturanPembagian.data = results[1].data();
                AppPengaturanPembagian.renderForm();
            } else {
                // Jika belum ada data sama sekali, inisialisasi default
                Utils.toast('Belum ada pengaturan. Membuat data awal...', 'info');
                AppPengaturanPembagian.data = AppPengaturanPembagian.getDefaultData();
                db.collection('pengaturanPembagian').doc('global').set(AppPengaturanPembagian.data)
                    .then(function() { AppPengaturanPembagian.renderForm(); });
            }
        }).catch(function(err) {
            Utils.toast('Gagal memuat: ' + err.message, 'error');
        });
    },

    getDefaultData: function() {
        return {
            resep: { nilaiResep: 0, jm: 0, jd: 0, karyKlinik: 0, karyApotek: 0, psa: 0 },
            resepLuar: { nilaiResep: 0, dokter: 0, psa: 0 },
            tindakanKlinik: { dokter: 0, karyKlinik: 0 },
            tindakanApotek: { karyApotek: 0, psa: 0 },
            tunjanganOmzet: { persen: 0 },
            uangMakan: { persenDariPembulatan: 100 }, // BARU LOGIKA
            transport: { nominalTotal: 0 },
            marginResep: 0,
            slotKaryawanKlinik: [],
            slotKaryawanApotek: []
        };
    },

    renderForm: function() {
        var d = AppPengaturanPembagian.data;
        var html = '';

        // ----- RESEP KLINIK -----
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '  <h3 class="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2 text-blue-600"><i data-lucide="file-text" class="w-5 h-5"></i> Resep Klinik</h3>';
        html += '  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">';
        html += AppPengaturanPembagian.inputField('Nilai Resep (Otomatis)', 'resep_nilaiResep', d.resep.nilaiResep, 'Rp');
        html += AppPengaturanPembagian.inputField('Jasa Medis (JM)', 'resep_jm', d.resep.jm, 'Rp');
        html += AppPengaturanPembagian.inputField('Jasa Dokter (JD)', 'resep_jd', d.resep.jd, 'Rp');
        html += AppPengaturanPembagian.inputField('Karyawan Klinik', 'resep_karyKlinik', d.resep.karyKlinik, 'Rp');
        html += AppPengaturanPembagian.inputField('Karyawan Apotek', 'resep_karyApotek', d.resep.karyApotek, 'Rp');
        html += AppPengaturanPembagian.inputField('PSA (Laba Apotek)', 'resep_psa', d.resep.psa, 'Rp');
        html += '  </div>';
        html += '  <p class="text-xs text-slate-400 mt-3 bg-slate-50 dark:bg-slate-900 p-2 rounded">ℹ️ Sisa dari Nilai Resep setelah dipotong semua komponen di atas langsung menjadi Laba Apotek.</p>';
        html += '</div>';

        // ----- RESEP LUAR -----
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '  <h3 class="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2 text-green-600"><i data-lucide="file-plus" class="w-5 h-5"></i> Resep Luar</h3>';
        html += '  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">';
        html += AppPengaturanPembagian.inputField('Nilai Resep (Otomatis)', 'resepLuar_nilaiResep', d.resepLuar.nilaiResep, 'Rp');
        html += AppPengaturanPembagian.inputField('Dokter Pemberi Resep', 'resepLuar_dokter', d.resepLuar.dokter, 'Rp');
        html += AppPengaturanPembagian.inputField('PSA (Laba Apotek)', 'resepLuar_psa', d.resepLuar.psa, 'Rp');
        html += '  </div>';
        html += '</div>';

        // ----- TINDAKAN KLINIK -----
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '  <h3 class="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2 text-purple-600"><i data-lucide="stethoscope" class="w-5 h-5"></i> Tindakan Klinik</h3>';
        html += '  <div class="grid grid-cols-2 gap-3">';
        html += AppPengaturanPembagian.inputField('Dokter', 'tindakanKlinik_dokter', d.tindakanKlinik.dokter, '%');
        html += AppPengaturanPembagian.inputField('Karyawan Klinik', 'tindakanKlinik_karyKlinik', d.tindakanKlinik.karyKlinik, '%');
        html += '  </div>';
        html += '</div>';

        // ----- TINDAKAN APOTEK -----
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '  <h3 class="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2 text-teal-600"><i data-lucide="syringe" class="w-5 h-5"></i> Tindakan Apotek</h3>';
        html += '  <div class="grid grid-cols-2 gap-3">';
        html += AppPengaturanPembagian.inputField('Karyawan Apotek', 'tindakanApotek_karyApotek', d.tindakanApotek.karyApotek, '%');
        html += AppPengaturanPembagian.inputField('PSA', 'tindakanApotek_psa', d.tindakanApotek.psa, '%');
        html += '  </div>';
        html += '</div>';

        // ----- TUNJANGAN OMZET & MARGIN -----
        html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">';
        
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">';
        html += '  <h3 class="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2 text-emerald-600"><i data-lucide="trending-up" class="w-5 h-5"></i> Tunjangan Omzet</h3>';
        html += AppPengaturanPembagian.inputField('Persen dari Laba Obat', 'tunjanganOmzet_persen', d.tunjanganOmzet.persen, '%');
        html += '</div>';

        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">';
        html += '  <h3 class="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2 text-rose-600"><i data-lucide="percent" class="w-5 h-5"></i> Margin Obat Resep</h3>';
        html += AppPengaturanPembagian.inputField('Persen dari HPP', 'marginResep', d.marginResep, '%');
        html += '  <p class="text-xs text-slate-400 mt-2">Harga Jual Obat Resep = HPP × (1 + margin%)</p>';
        html += '</div>';
        html += '</div>';

        // ----- UANG MAKAN & TRANSPORT -----
        html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">';
        
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">';
        html += '  <h3 class="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2 text-orange-600"><i data-lucide="utensils" class="w-5 h-5"></i> Uang Makan</h3>';
        html += AppPengaturanPembagian.inputField('Persen dari Pembulatan', 'uangMakan_persenDariPembulatan', d.uangMakan.persenDariPembulatan, '%');
        html += '  <p class="text-xs text-slate-400 mt-2">Diambil dari total pembulatan transaksi, lalu dibagi rata ke semua karyawan.</p>';
        html += '</div>';

        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">';
        html += '  <h3 class="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2 text-sky-600"><i data-lucide="truck" class="w-5 h-5"></i> Transport</h3>';
        html += AppPengaturanPembagian.inputField('Total Dana Transport', 'transport_nominalTotal', d.transport.nominalTotal, 'Rp');
        html += '  <p class="text-xs text-slate-400 mt-2">Dibagi rata hanya untuk Karyawan Apotek.</p>';
        html += '</div>';
        html += '</div>';

        // ----- SLOT KARYAWAN -----
        html += AppPengaturanPembagian.renderSlotSection('klinik', 'Slot Pembagian Karyawan Klinik', 'Distribusi dari Pool Resep Klinik & Tuslah Klinik', 'indigo', d.slotKaryawanKlinik);
        html += AppPengaturanPembagian.renderSlotSection('apotek', 'Slot Pembagian Karyawan Apotek', 'Distribusi dari Pool Tuslah Apotek & Tunjangan Omzet', 'amber', d.slotKaryawanApotek);

        // ----- TOMBOL SIMPAN -----
        html += '<div class="flex justify-end sticky bottom-6 z-10">';
        html += '  <button onclick="AppPengaturanPembagian.simpan()" class="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all text-sm flex items-center gap-2"><i data-lucide="save" class="w-4 h-4"></i> Simpan Semua Pengaturan</button>';
        html += '</div>';

        document.getElementById('pembagian-content').innerHTML = html;
        lucide.createIcons();
    },

    renderSlotSection: function(tipe, title, desc, color, slots) {
        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '  <h3 class="font-semibold text-gray-800 dark:text-white mb-1 flex items-center gap-2 text-' + color + '-600"><i data-lucide="users" class="w-5 h-5"></i> ' + title + '</h3>';
        html += '  <p class="text-xs text-slate-400 mb-4">' + desc + '</p>';
        html += '  <div id="slots-' + tipe + '" class="space-y-2">';
        
        if (slots.length === 0) {
            html += '<p class="text-sm text-slate-400 italic py-2">Belum ada slot.</p>';
        } else {
            for (var i = 0; i < slots.length; i++) {
                html += AppPengaturanPembagian.renderSlotRow(tipe, i, slots[i]);
            }
        }
        
        html += '  </div>';
        html += '  <button onclick="AppPengaturanPembagian.addSlot(\'' + tipe + '\')" class="mt-3 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium flex items-center gap-1"><i data-lucide="plus-circle" class="w-4 h-4"></i> Tambah Slot</button>';
        html += '</div>';
        return html;
    },

    renderSlotRow: function(tipe, index, slot) {
        var karList = AppPengaturanPembagian.karyawanList;
        var html = '<div id="slot-row-' + tipe + '-' + index + '" class="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-700">';
        
        // Dropdown Karyawan
        html += '<select id="slot-' + tipe + '-id-' + index + '" class="w-full sm:w-1/3 px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg text-sm">';
        html += '<option value="">-- Pilih Karyawan --</option>';
        for (var k = 0; k < karList.length; k++) {
            var kar = karList[k];
            var selected = (slot.karyawanId === kar.id) ? ' selected' : '';
            html += '<option value="' + kar.id + '"' + selected + '>' + Utils.escapeHtml(kar.nama) + ' (' + Utils.escapeHtml(kar.departemen || '-') + ')</option>';
        }
        html += '</select>';

        // Input Persen
        html += '<div class="flex items-center gap-2 w-full sm:w-1/4">';
        html += '<input type="number" id="slot-' + tipe + '-persen-' + index + '" value="' + (slot.persen || 0) + '" placeholder="%" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg text-sm text-center">';
        html += '<span class="text-xs text-slate-400 whitespace-nowrap">%</span>';
        html += '</div>';

        // Checkbox THR
        html += '<label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer whitespace-nowrap">';
        html += '<input type="checkbox" id="slot-' + tipe + '-thr-' + index + '" ' + (slot.isTHR ? 'checked' : '') + ' class="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500">';
        html += 'THR';
        html += '</label>';

        // Tombol Hapus
        html += '<button onclick="AppPengaturanPembagian.removeSlot(\'' + tipe + '\',' + index + ')" class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors self-center"><i data-lucide="trash-2" class="w-4 h-4"></i></button>';
        
        html += '</div>';
        return html;
    },

    addSlot: function(tipe) {
        var container = document.getElementById('slots-' + tipe);
        // Hitung index terbaru berdasarkan jumlah children saat ini
        var count = container.querySelectorAll('[id^="slot-row-"]').length;
        var newSlot = { karyawanId: '', persen: 0, isTHR: false };
        
        // Tambah ke data sementara di memori agar tidak hilang saat render ulang
        var key = tipe === 'klinik' ? 'slotKaryawanKlinik' : 'slotKaryawanApotek';
        AppPengaturanPembagian.data[key].push(newSlot);

        // Hapus tulisan "Belum ada slot" jika ada
        var italicText = container.querySelector('p.italic');
        if (italicText) italicText.remove();

        container.insertAdjacentHTML('beforeend', AppPengaturanPembagian.renderSlotRow(tipe, count, newSlot));
        lucide.createIcons({ nodes: [container] });
    },

    removeSlot: function(tipe, index) {
        var key = tipe === 'klinik' ? 'slotKaryawanKlinik' : 'slotKaryawanApotek';
        AppPengaturanPembagian.data[key].splice(index, 1);
        
        // Re-render seluruh section slot agar index-nya tidak error
        var d = AppPengaturanPembagian.data;
        AppPengaturanPembagian.renderForm();
    },

    inputField: function(label, id, value, suffix) {
        return '<div>'
            + '<label class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">' + label + '</label>'
            + '<div class="relative">'
            + '<input type="number" id="pb-' + id + '" value="' + (value || 0) + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg text-sm pr-10 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none">'
            + '<span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">' + suffix + '</span>'
            + '</div>'
            + '</div>';
    },

    simpan: function() {
        var d = AppPengaturanPembagian.data;

        // 1. Kumpulkan data Nominal & Persen biasa
        d.resep.nilaiResep = parseFloat(document.getElementById('pb-resep_nilaiResep').value) || 0;
        d.resep.jm = parseFloat(document.getElementById('pb-resep_jm').value) || 0;
        d.resep.jd = parseFloat(document.getElementById('pb-resep_jd').value) || 0;
        d.resep.karyKlinik = parseFloat(document.getElementById('pb-resep_karyKlinik').value) || 0;
        d.resep.karyApotek = parseFloat(document.getElementById('pb-resep_karyApotek').value) || 0;
        d.resep.psa = parseFloat(document.getElementById('pb-resep_psa').value) || 0;

        d.resepLuar.nilaiResep = parseFloat(document.getElementById('pb-resepLuar_nilaiResep').value) || 0;
        d.resepLuar.dokter = parseFloat(document.getElementById('pb-resepLuar_dokter').value) || 0;
        d.resepLuar.psa = parseFloat(document.getElementById('pb-resepLuar_psa').value) || 0;

        d.tindakanKlinik.dokter = parseFloat(document.getElementById('pb-tindakanKlinik_dokter').value) || 0;
        d.tindakanKlinik.karyKlinik = parseFloat(document.getElementById('pb-tindakanKlinik_karyKlinik').value) || 0;

        d.tindakanApotek.karyApotek = parseFloat(document.getElementById('pb-tindakanApotek_karyApotek').value) || 0;
        d.tindakanApotek.psa = parseFloat(document.getElementById('pb-tindakanApotek_psa').value) || 0;

        d.tunjanganOmzet.persen = parseFloat(document.getElementById('pb-tunjanganOmzet_persen').value) || 0;
        d.uangMakan.persenDariPembulatan = parseFloat(document.getElementById('pb-uangMakan_persenDariPembulatan').value) || 100; // Default 100 jika kosong
        d.transport.nominalTotal = parseFloat(document.getElementById('pb-transport_nominalTotal').value) || 0;
        d.marginResep = parseFloat(document.getElementById('pb-marginResep').value) || 0;

        // 2. Kumpulkan data Slot (Karena bisa di-add/remove, baca dari DOM saat ini)
        d.slotKaryawanKlinik = AppPengaturanPembagian.collectSlotsFromDOM('klinik');
        d.slotKaryawanApotek = AppPengaturanPembagian.collectSlotsFromDOM('apotek');

        // 3. Simpan ke Firestore
        d.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

        // Tampilkan loading di tombol (opsional tapi bagus)
        Utils.toast('Menyimpan pengaturan...', 'info');

        db.collection('pengaturanPembagian').doc('global').set(d, { merge: true })
            .then(function() {
                Utils.toast('Pengaturan pembagian berhasil disimpan!', 'success');
            })
            .catch(function(err) {
                Utils.toast('Gagal menyimpan: ' + err.message, 'error');
            });
    },

    collectSlotsFromDOM: function(tipe) {
        var container = document.getElementById('slots-' + tipe);
        var rows = container.querySelectorAll('[id^="slot-row-"]');
        var slots = [];

        for (var i = 0; i < rows.length; i++) {
            // Ekstrak index dari id="slot-row-klinik-0"
            var rowIndex = rows[i].id.split('-').pop();
            
            var idEl = document.getElementById('slot-' + tipe + '-id-' + rowIndex);
            var persenEl = document.getElementById('slot-' + tipe + '-persen-' + rowIndex);
            var thrEl = document.getElementById('slot-' + tipe + '-thr-' + rowIndex);

            if (idEl && idEl.value) { // Hanya simpan yang sudah pilih karyawan
                slots.push({
                    karyawanId: idEl.value,
                    persen: parseFloat(persenEl.value) || 0,
                    isTHR: thrEl ? thrEl.checked : false
                });
            }
        }
        return slots;
    }
};
