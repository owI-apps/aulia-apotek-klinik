/**
 * js/pengaturan/pembagian.js
 * REVOLUSI SKEMA: Pembagian sangat detail per orang & per dokter.
 * FIX: Sync DOM Bulletproof, Logika Omzet PSA benar, Pastikan data push ke Firebase.
 */

window.AppPengaturanPembagian = {

    data: null,
    karyawanList: [],

    render: function() {
        var html = '<div class="page-enter max-w-4xl">';
        html += '  <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-1">Pengaturan Pembagian Hasil</h2>';
        html += '  <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Detail pembagian pendapatan, tunjangan, dan perhitungan margin PSA</p>';
        html += '  <div id="pembagian-content"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        var pKaryawan = db.collection('karyawan').where('status', '==', 'aktif').get();
        var pConfig = db.collection('pengaturanPembagian').doc('global').get();

        Promise.all([pKaryawan, pConfig]).then(function(results) {
            self.karyawanList = [];
            results[0].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.karyawanList.push(d); });

            if (results[1].exists) {
                var rawData = results[1].data();
                var defaultData = self.getDefaultData();
                self.data = Object.assign({}, defaultData, rawData);
                
                // Pelindung Array & Object
                if (!Array.isArray(self.data.resepKlinik)) self.data.resepKlinik = [];
                if (!Array.isArray(self.data.tindakanKlinik)) self.data.tindakanKlinik = [];
                if (!Array.isArray(self.data.tindakanApotek)) self.data.tindakanApotek = [];
                if (!self.data.tunjanganOmzet || !Array.isArray(self.data.tunjanganOmzet.slot)) self.data.tunjanganOmzet = { persen: 0, slot: [] };
                if (!self.data.transport || !Array.isArray(self.data.transport.slot)) self.data.transport = { total: 0, slot: [] };
                if (!self.data.uangMakan || !Array.isArray(self.data.uangMakan.slot)) self.data.uangMakan = { slot: [] };
                if (!self.data.racikObat || !Array.isArray(self.data.racikObat.slot)) self.data.racikObat = { nilai: 500, slot: [] };
            } else {
                self.data = self.getDefaultData();
            }
            self.renderForm();
        }).catch(function(err) { Utils.toast('Gagal memuat: ' + err.message, 'error'); });
    },

    getDefaultData: function() {
        return {
            resepKlinik: [],
            resepLuar: { nilaiResep: 0, potonganDokter: 0 },
            marginResep: 35,
            tindakanKlinik: [],
            tindakanApotek: [],
            tunjanganOmzet: { persen: 0, slot: [] },
            transport: { total: 0, slot: [] },
            uangMakan: { slot: [] },
            racikObat: { nilai: 500, slot: [] }
        };
    },

    // ==========================================
    // FUNGSI PENGAMAN EKSTRIM (Baca DOM Tanpa Error)
    // ==========================================
    getVal: function(id) {
        var el = document.getElementById(id);
        if (!el) return 0;
        var val = parseFloat(el.value);
        return isNaN(val) ? 0 : val;
    },
    getStr: function(id) {
        var el = document.getElementById(id);
        return el ? el.value : '';
    },
    isChecked: function(id) {
        var el = document.getElementById(id);
        return el ? el.checked : false;
    },

        syncStateFromDOM: function() {
        var d = this.data;
        if(!d) return;

        // Init jika undefined
        d.resepLuar = d.resepLuar || {};
        d.tunjanganOmzet = d.tunjanganOmzet || {};
        d.transport = d.transport || {};
        d.uangMakan = d.uangMakan || {};
        d.racikObat = d.racikObat || {};

        // Ambil semua input biasa
        d.resepLuar.nilaiResep = this.getVal('pb-resepLuar_nilaiResep');
        d.resepLuar.potonganDokter = this.getVal('pb-resepLuar_potonganDokter');
        d.marginResep = this.getVal('pb-marginResep');
        d.tunjanganOmzet.persen = this.getVal('pb-omzet_persen');
        d.transport.total = this.getVal('pb-transport_total');
        d.racikObat.nilai = this.getVal('pb-racikObat_nilai');

        // Ambil Resep Klinik
        var rkBlocks = document.querySelectorAll('[id^="pb-rk-nilai-"]');
        d.resepKlinik = [];
        var self = this;
        for (var i = 0; i < rkBlocks.length; i++) {
            var docId = self.getStr('pb-rk-doc-'+i);
            var karyawan = self.karyawanList.find(function(k){ return k.id === docId; });
            
            d.resepKlinik.push({
                dokterId: docId,
                namaDokter: karyawan ? karyawan.nama : '', // KUNCI: Simpan nama dokter
                nipDokter: karyawan ? karyawan.nip : '',  // KUNCI: Simpan NIP dokter
                nilaiResep: self.getVal('pb-rk-nilai-'+i),
                jm: self.getVal('pb-rk-jm-'+i),
                jd: self.getVal('pb-rk-jd-'+i),
                poolKaryKlinik: self.getVal('pb-rk-poolKlinik-'+i),
                slotKaryKlinik: self.collectSlotRows('rk-klinik-'+i),
                poolKaryApotek: self.getVal('pb-rk-poolApotek-'+i),
                slotKaryApotek: self.collectSlotRows('rk-apotek-'+i)
            });
        }

        // Ambil Slots
        d.tindakanKlinik = this.collectSlotRows('tindakanKlinik');
        d.tindakanApotek = this.collectSlotRows('tindakanApotek');
        d.tunjanganOmzet.slot = this.collectSlotRows('tunjanganOmzet');
        d.transport.slot = this.collectSlotRows('transport');
        d.uangMakan.slot = this.collectSlotRows('uangMakan');
        d.racikObat.slot = this.collectSlotRows('racikObat');
    },
    
    renderForm: function() {
        var d = this.data;
        var html = '';

        // 1. RESEP KLINIK
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '<div class="flex justify-between items-center mb-4"><h3 class="font-semibold text-blue-600 flex items-center gap-2 text-lg"><i data-lucide="file-text" class="w-5 h-5"></i> 1. Resep Klinik</h3><button onclick="AppPengaturanPembagian.addResepKlinik()" class="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-medium">+ Tambah Skema Dokter</button></div>';
        html += '<div id="resep-klinik-container">';
        if(d.resepKlinik.length === 0) html += '<p class="text-sm text-slate-400 italic p-2">Belum ada skema. Klik tambah untuk buat skema per dokter.</p>';
        else d.resepKlinik.forEach((doc, i) => html += this.renderResepKlinikBlock(i, doc));
        html += '</div></div>';

        // 2. RESEP LUAR
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '<h3 class="font-semibold text-green-600 flex items-center gap-2 text-lg mb-4"><i data-lucide="file-plus" class="w-5 h-5"></i> 2. Resep Luar</h3>';
        html += '<div class="grid grid-cols-2 gap-4 max-w-md">';
        html += this.inputField('Nilai Resep', 'resepLuar_nilaiResep', d.resepLuar.nilaiResep, 'Rp');
        html += this.inputField('Potongan Dokter', 'resepLuar_potonganDokter', d.resepLuar.potonganDokter, 'Rp');
        html += '</div></div>';

        // MARGIN OBAT
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '<h3 class="font-semibold text-rose-600 flex items-center gap-2 text-lg mb-3"><i data-lucide="percent" class="w-5 h-5"></i> Margin Harga Obat Resep</h3>';
        html += '<div class="max-w-xs">' + this.inputField('Persen dari HPP', 'marginResep', d.marginResep, '%') + '</div>';
        html += '<p class="text-xs text-slate-400 mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100">ℹ️ <strong>Berlaku untuk Resep Klinik & Resep Luar.</strong><br>Harga Jual Obat = HPP + ' + (d.marginResep || 0) + '%.</p>';
        html += '</div>';

        // 3 & 4
        html += this.renderSlotSection('tindakanKlinik', '3. Tindakan Klinik (Tuslah)', 'purple', d.tindakanKlinik, true);
        html += this.renderSlotSection('tindakanApotek', '4. Tindakan Apotek (Tuslah)', 'teal', d.tindakanApotek, true);

        // 5. OMZET
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '<h3 class="font-semibold text-emerald-600 flex items-center gap-2 text-lg mb-4"><i data-lucide="trending-up" class="w-5 h-5"></i> 5. Tunjangan Omzet</h3>';
        html += '<div class="mb-4 w-32">' + this.inputField('Persen Margin Obat', 'omzet_persen', d.tunjanganOmzet.persen, '%') + '</div>';
        html += '<p class="text-xs text-slate-400 mb-3 bg-slate-50 p-2 rounded">Sumber: Persen ini dikalikan total margin penjualan obat. Sisa setelah dibagi ke karyawan masuk ke PSA.</p>';
        html += this.renderSlotRows('tunjanganOmzet', d.tunjanganOmzet.slot, false);
        html += '</div>';

        // 6. TRANSPORT
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '<h3 class="font-semibold text-sky-600 flex items-center gap-2 text-lg mb-4"><i data-lucide="truck" class="w-5 h-5"></i> 6. Tunjangan Transport</h3>';
        html += '<div class="mb-4 w-32">' + this.inputField('Total Dana', 'transport_total', d.transport.total, 'Rp') + '</div>';
        html += this.renderSlotRows('transport', d.transport.slot, false);
        html += '</div>';

        // 7. UANG MAKAN
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '<h3 class="font-semibold text-orange-600 flex items-center gap-2 text-lg mb-4"><i data-lucide="utensils" class="w-5 h-5"></i> 7. Tunjangan Uang Makan</h3>';
        html += this.renderSlotRows('uangMakan', d.uangMakan.slot, false);
        html += '</div>';

        // 8. RACIK
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '<h3 class="font-semibold text-indigo-600 flex items-center gap-2 text-lg mb-4"><i data-lucide="flask-conical" class="w-5 h-5"></i> 8. Racik Obat</h3>';
        html += '<div class="mb-4 w-32">' + this.inputField('Nilai Racik', 'racikObat_nilai', d.racikObat.nilai, 'Rp') + '</div>';
        html += this.renderSlotRows('racikObat', d.racikObat.slot, false);
        html += '</div>';

        // 9. PSA
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">';
        html += '<h3 class="font-semibold text-gray-800 flex items-center gap-2 text-lg mb-4"><i data-lucide="landmark" class="w-5 h-5 text-slate-600"></i> 9. Pendapatan PSA (Margin Otomatis)</h3>';
        html += '<div id="psa-margin-info" class="text-sm space-y-2 text-slate-600"></div>';
        html += '</div>';

        html += '<div class="flex justify-end sticky bottom-6 z-10"><button onclick="AppPengaturanPembagian.simpan()" class="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2"><i data-lucide="save" class="w-4 h-4"></i> Simpan & Kunci Pengaturan</button></div>';

        document.getElementById('pembagian-content').innerHTML = html;
        lucide.createIcons();
        this.hitungInfoPSA();
    },

    inputField: function(label, id, value, suffix) {
        return '<div class="mb-1"><label class="block text-xs font-medium text-slate-500 mb-1">' + label + '</label><div class="relative"><input type="number" id="pb-' + id + '" value="' + (value || 0) + '" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm pr-8 focus:ring-2 focus:ring-primary-500 outline-none" oninput="AppPengaturanPembagian.hitungInfoPSA()"><span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">' + suffix + '</span></div></div>';
    },

    dropdownKaryawan: function(id, selectedId) {
        var html = '<select id="' + id + '" class="w-full px-2 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Pilih --</option>';
        this.karyawanList.forEach(k => {
            var sel = (k.id === selectedId) ? ' selected' : '';
            html += '<option value="' + k.id + '"' + sel + '>' + Utils.escapeHtml(k.nama) + ' (' + Utils.escapeHtml(k.departemen || '-') + ')</option>';
        });
        html += '</select>';
        return html;
    },

    addResepKlinik: function() {
        this.syncStateFromDOM(); 
        this.data.resepKlinik.push({ dokterId: '', nilaiResep: 0, jm: 0, jd: 0, poolKaryKlinik: 0, slotKaryKlinik: [], poolKaryApotek: 0, slotKaryApotek: [] });
        this.renderForm();
    },

    removeResepKlinik: function(index) {
        if(confirm('Hapus skema dokter ini?')) {
            this.syncStateFromDOM();
            this.data.resepKlinik.splice(index, 1);
            this.renderForm();
        }
    },

        renderResepKlinikBlock: function(index, doc) {
        var html = '<div class="border border-slate-200 dark:border-slate-600 rounded-lg p-4 mb-4 bg-slate-50/50 relative">';
        html += '<button onclick="AppPengaturanPembagian.removeResepKlinik(' + index + ')" class="absolute top-3 right-3 text-red-400 hover:text-red-600"><i data-lucide="trash-2" class="w-4 h-4"></i></button>';
        html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 pr-8">';
        
        // Modifikasi Dropdown Dokter agar menampilkan NIP
        var ddHtml = '<select id="rk-doc-' + index + '" class="w-full px-2 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="">-- Pilih Dokter --</option>';
        this.karyawanList.forEach(k => {
            if(k.departemen === 'Klinik' || k.jabatan === 'Dokter') {
                var sel = (k.id === doc.dokterId) ? ' selected' : '';
                var nipLabel = k.nip ? ' [' + k.nip + ']' : '';
                ddHtml += '<option value="' + k.id + '"' + sel + '>' + Utils.escapeHtml(k.nama) + nipLabel + '</option>';
            }
        });
        ddHtml += '</select>';
        
        html += '<div class="sm:col-span-2 lg:col-span-1"><label class="block text-xs font-medium text-slate-500 mb-1">Dokter Klinik</label>' + ddHtml + '</div>';
        html += this.inputField('Nilai Resep', 'rk-nilai-' + index, doc.nilaiResep, 'Rp');
        html += this.inputField('Jasa Medis (JM)', 'rk-jm-' + index, doc.jm, 'Rp');
        html += this.inputField('Jasa Dokter (JD)', 'rk-jd-' + index, doc.jd, 'Rp');
        html += '</div>';

        html += '<div class="mb-4 pl-4 border-l-4 border-purple-300">';
        html += '<div class="flex justify-between items-center mb-2"><p class="text-sm font-semibold text-purple-600">b. Karyawan Klinik</p>';
        html += '<div class="flex items-center gap-2">' + this.inputField('Pool Total', 'rk-poolKlinik-' + index, doc.poolKaryKlinik, 'Rp') + '<button type="button" onclick="AppPengaturanPembagian.addSlotTo(\'resepKlinik\', ' + index + ', \'slotKaryKlinik\')" class="text-xs text-purple-600 px-2 py-2 font-medium">+ Kary</button></div></div>';
        html += '<div id="rk-slots-klinik-' + index + '">';
        doc.slotKaryKlinik.forEach((s, si) => html += this.renderSlotRow('rk-klinik-' + index + '-' + si, s, true));
        html += '</div></div>';

        html += '<div class="pl-4 border-l-4 border-teal-300">';
        html += '<div class="flex justify-between items-center mb-2"><p class="text-sm font-semibold text-teal-600">c. Karyawan Apotek</p>';
        html += '<div class="flex items-center gap-2">' + this.inputField('Pool Total', 'rk-poolApotek-' + index, doc.poolKaryApotek, 'Rp') + '<button type="button" onclick="AppPengaturanPembagian.addSlotTo(\'resepKlinik\', ' + index + ', \'slotKaryApotek\')" class="text-xs text-teal-600 px-2 py-2 font-medium">+ Kary</button></div></div>';
        html += '<div id="rk-slots-apotek-' + index + '">';
        doc.slotKaryApotek.forEach((s, si) => html += this.renderSlotRow('rk-apotek-' + index + '-' + si, s, true));
        html += '</div></div>';

        html += '</div>';
        return html;
    },
    
    renderSlotSection: function(dataKey, title, color, slots, hasThr) {
        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '<div class="flex justify-between items-center mb-4"><h3 class="font-semibold text-' + color + '-600 flex items-center gap-2 text-lg"><i data-lucide="stethoscope" class="w-5 h-5"></i> ' + title + '</h3><button onclick="AppPengaturanPembagian.addSlotTo(\'' + dataKey + '\')" class="text-sm bg-' + color + '-50 text-' + color + '-600 px-3 py-1.5 rounded-lg font-medium">+ Tambah</button></div>';
        html += '<div id="slots-' + dataKey + '">';
        slots.forEach((s, i) => html += this.renderSlotRow(dataKey + '-' + i, s, hasThr));
        if(slots.length === 0) html += '<p class="text-sm text-slate-400 italic p-2">Belum ada data.</p>';
        html += '</div></div>';
        return html;
    },

    renderSlotRows: function(prefix, slots, hasThr) {
        var html = '<div id="slots-' + prefix + '" class="space-y-2">';
        slots.forEach((s, i) => html += this.renderSlotRow(prefix + '-' + i, s, hasThr));
        html += '</div>';
        html += '<button type="button" onclick="AppPengaturanPembagian.addSlotTo(\'' + prefix + '\')" class="mt-2 text-sm text-primary-600 font-medium flex items-center gap-1"><i data-lucide="plus-circle" class="w-4 h-4"></i> Tambah Karyawan</button>';
        return html;
    },

    renderSlotRow: function(rowId, slot, hasThr) {
        var html = '<div id="row-' + rowId + '" class="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">';
        html += '<div class="w-full sm:w-1/3">' + this.dropdownKaryawan('slot-id-' + rowId, slot.karyawanId) + '</div>';
        html += '<div class="flex items-center gap-2 w-full sm:w-1/4"><input type="number" id="slot-persen-' + rowId + '" value="' + (slot.persen || 0) + '" class="w-full px-2 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-center" oninput="AppPengaturanPembagian.hitungInfoPSA()"><span class="text-xs text-slate-400">%</span></div>';
        if (hasThr) {
            html += '<label class="flex items-center gap-2 text-sm text-slate-500 whitespace-nowrap cursor-pointer"><input type="checkbox" id="slot-thr-' + rowId + '" ' + (slot.isTHR ? 'checked' : '') + ' class="w-4 h-4 rounded border-slate-300 text-primary-600"> Tab THR</label>';
        }
        html += '<button onclick="AppPengaturanPembagian.removeSlotRow(\'' + rowId + '\')" class="p-2 text-red-400 hover:text-red-600"><i data-lucide="x" class="w-4 h-4"></i></button>';
        html += '</div>';
        return html;
    },

    addSlotTo: function(parentKey, docIndex, slotKey) {
        this.syncStateFromDOM(); 
        var newSlot = { karyawanId: '', persen: 0, isTHR: false };
        
        if (parentKey === 'resepKlinik') {
            this.data.resepKlinik[docIndex][slotKey].push(newSlot);
        } else {
            var target = this.data[parentKey];
            if (!target) return Utils.toast("Error struktur data.", "error");
            if (Array.isArray(target)) {
                target.push(newSlot); 
            } else {
                if (!target.slot) target.slot = [];
                target.slot.push(newSlot); 
            }
        }
        this.renderForm(); 
    },

    removeSlotRow: function(rowId) {
        this.syncStateFromDOM(); 
        var parts = rowId.split('-');
        if (parts[0] === 'rk') {
            var type = parts[1]; var docIdx = parseInt(parts[2]); var slotIdx = parseInt(parts[3]);
            var slotKey = (type === 'klinik') ? 'slotKaryKlinik' : 'slotKaryApotek';
            this.data.resepKlinik[docIdx][slotKey].splice(slotIdx, 1);
        } else {
            var parentKey = parts[0]; var slotIdx = parseInt(parts[1]);
            var target = this.data[parentKey];
            if (Array.isArray(target)) {
                target.splice(slotIdx, 1); 
            } else {
                if (target && target.slot) target.slot.splice(slotIdx, 1); 
            }
        }
        this.renderForm();
    },

    hitungInfoPSA: function() {
        var el = document.getElementById('psa-margin-info');
        if(!el) return;

        var sumPersen = function(selector) {
            var tot = 0;
            document.querySelectorAll(selector).forEach(function(i) { tot += parseFloat(i.value) || 0; });
            return tot;
        };

        // 1. Resep Klinik
        var psaResepKlinik = 0;
        var rkBlocks = document.querySelectorAll('[id^="pb-rk-nilai-"]');
        for (var i = 0; i < rkBlocks.length; i++) {
            psaResepKlinik += this.getVal('pb-rk-nilai-'+i) - this.getVal('pb-rk-jm-'+i) - this.getVal('pb-rk-jd-'+i) - this.getVal('pb-rk-poolKlinik-'+i) - this.getVal('pb-rk-poolApotek-'+i);
        }

        // 2. Resep Luar
        var psaResepLuar = this.getVal('pb-resepLuar_nilaiResep') - this.getVal('pb-resepLuar_potonganDokter');

        // 3 & 4. Tindakan
        var psaTK = 100 - sumPersen('[id^="slot-persen-tindakanKlinik-"]');
        var psaTA = 100 - sumPersen('[id^="slot-persen-tindakanApotek-"]');

        // 5. Tunjangan Omzet
        // Logika baru: 100% - total persen karyawan. Sisa persen itulah yang masuk PSA dari pool omzet.
        var psaOmzet = 100 - sumPersen('[id^="slot-persen-tunjanganOmzet-"]');

        // 6. Uang Makan
        var psaUM = 100 - sumPersen('[id^="slot-persen-uangMakan-"]');

        // 8. Racik Obat
        var psaRO = 100 - sumPersen('[id^="slot-persen-racikObat-"]');

        el.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><span class="text-xs text-blue-600">a. Sisa Resep Klinik</span><p class="font-bold text-blue-800 dark:text-blue-300">${Utils.formatRupiah(psaResepKlinik)} <span class="text-xs font-normal">/ resep</span></p></div>
                <div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"><span class="text-xs text-green-600">b. Sisa Resep Luar</span><p class="font-bold text-green-800 dark:text-green-300">${Utils.formatRupiah(psaResepLuar)} <span class="text-xs font-normal">/ resep</span></p></div>
                <div class="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg"><span class="text-xs text-purple-600">c. Sisa Tindakan Klinik</span><p class="font-bold text-purple-800 dark:text-purple-300">${psaTK}%</p></div>
                <div class="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg"><span class="text-xs text-teal-600">d. Sisa Tindakan Apotek</span><p class="font-bold text-teal-800 dark:text-teal-300">${psaTA}%</p></div>
                <div class="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg"><span class="text-xs text-emerald-600">e. Sisa Tunjangan Omzet</span><p class="font-bold text-emerald-800 dark:text-emerald-300">${psaOmzet}% <span class="text-xs font-normal">(dari pool ${this.getVal('pb-omzet_persen')}%)</span></p></div>
                <div class="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg"><span class="text-xs text-orange-600">f. Sisa Uang Makan</span><p class="font-bold text-orange-800 dark:text-orange-300">${psaUM}%</p></div>
                <div class="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg"><span class="text-xs text-indigo-600">g. Sisa Racik Obat</span><p class="font-bold text-indigo-800 dark:text-indigo-300">${psaRO}%</p></div>
            </div>
            <p class="text-xs text-slate-400 mt-3 italic">*Pendapatan PSA dihitung realtime. Jika minus, berarti pembagian melebihi batas yang ditentukan.</p>
        `;
    },
    
    // ==========================================
    // SIMPAN KE FIREBASE 
    // ==========================================
    simpan: function() {
        this.syncStateFromDOM(); // Paksa baca semua input sebelum kirim
        var d = this.data;
        d.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

        Utils.toast('Menyimpan & Mengunci Pengaturan...', 'info');
        
        var batch = db.batch();

        // 1. Update Pengaturan Global
        var globalRef = db.collection('pengaturanPembagian').doc('global');
        batch.set(globalRef, d, { merge: true });

        // 2. Buat Snapshot History
        var historyRef = db.collection('pengaturanPembagianHistory').doc();
        var historyData = Object.assign({}, d);
        historyData.snapshotAt = firebase.firestore.FieldValue.serverTimestamp();
        batch.set(historyRef, historyData);

        batch.commit().then(() => {
            Utils.toast('Berhasil disimpan! Data transaksi akan otomatis terupdate.', 'success');
        }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    },

    collectSlotRows: function(prefix) {
        var slots = [];
        var persenInputs = document.querySelectorAll('[id^="slot-persen-' + prefix + '-"]');
        var self = this;
        
        persenInputs.forEach(function(input) {
            var idx = input.id.split('-').pop();
            var karyId = self.getStr('slot-id-' + prefix + '-' + idx);
            if(karyId) {
                slots.push({
                    karyawanId: karyId,
                    persen: parseFloat(input.value) || 0,
                    isTHR: self.isChecked('slot-thr-' + prefix + '-' + idx)
                });
            }
        });
        return slots;
    }
};
