/**
 * js/pengaturan/pembagian.js
 * REVOLUSI SKEMA: Pembagian sangat detail per orang & per dokter.
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
        var pKaryawan = db.collection('karyawan').where('status', '==', 'aktif').get();
        var pConfig = db.collection('pengaturanPembagian').doc('global').get();

        Promise.all([pKaryawan, pConfig]).then(function(results) {
            AppPengaturanPembagian.karyawanList = [];
            results[0].forEach(function(doc) { var d = doc.data(); d.id = doc.id; AppPengaturanPembagian.karyawanList.push(d); });

            if (results[1].exists) {
                var rawData = results[1].data();
                var defaultData = AppPengaturanPembagian.getDefaultData();
                
                // Gabungkan data lama dengan data baru, agar yang tidak ada langsung keisi
                AppPengaturanPembagian.data = Object.assign({}, defaultData, rawData);
                
                // PELINDUNG TAMBAHAN: Pastikan array di dalam object itu benar-benar array
                if (!Array.isArray(AppPengaturanPembagian.data.resepKlinik)) AppPengaturanPembagian.data.resepKlinik = [];
                if (!Array.isArray(AppPengaturanPembagian.data.tindakanKlinik)) AppPengaturanPembagian.data.tindakanKlinik = [];
                if (!Array.isArray(AppPengaturanPembagian.data.tindakanApotek)) AppPengaturanPembagian.data.tindakanApotek = [];
                if (!Array.isArray(AppPengaturanPembagian.data.tunjanganOmzet.slot)) AppPengaturanPembagian.data.tunjanganOmzet.slot = [];
                if (!Array.isArray(AppPengaturanPembagian.data.transport.slot)) AppPengaturanPembagian.data.transport.slot = [];
                if (!Array.isArray(AppPengaturanPembagian.data.uangMakan.slot)) AppPengaturanPembagian.data.uangMakan.slot = [];
                
            } else {
                AppPengaturanPembagian.data = AppPengaturanPembagian.getDefaultData();
                db.collection('pengaturanPembagian').doc('global').set(AppPengaturanPembagian.data);
            }
            AppPengaturanPembagian.renderForm();
        }).catch(function(err) { Utils.toast('Gagal memuat: ' + err.message, 'error'); });
    },

    getDefaultData: function() {
        return {
            resepKlinik: [], // Array of doctor configs
            resepLuar: { nilaiResep: 0, potonganDokter: 0 },
            tindakanKlinik: [], // Array of slots
            tindakanApotek: [], // Array of slots
            tunjanganOmzet: { persen: 0, slot: [] },
            transport: { total: 0, slot: [] },
            uangMakan: { slot: [] }
        };
    },

    renderForm: function() {
        var d = AppPengaturanPembagian.data;
        var html = '';

        // 1. RESEP KLINIK
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '<div class="flex justify-between items-center mb-4"><h3 class="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-2 text-lg"><i data-lucide="file-text" class="w-5 h-5"></i> 1. Resep Klinik</h3><button onclick="AppPengaturanPembagian.addResepKlinik()" class="text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 font-medium">+ Tambah Skema Dokter</button></div>';
        html += '<div id="resep-klinik-container">';
        if(d.resepKlinik.length === 0) html += '<p class="text-sm text-slate-400 italic p-2">Belum ada skema.</p>';
        else d.resepKlinik.forEach((doc, i) => html += AppPengaturanPembagian.renderResepKlinikBlock(i, doc));
        html += '</div></div>';

        // 2. RESEP LUAR
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '<h3 class="font-semibold text-green-600 dark:text-green-400 flex items-center gap-2 text-lg mb-4"><i data-lucide="file-plus" class="w-5 h-5"></i> 2. Resep Luar</h3>';
        html += '<div class="grid grid-cols-2 gap-4 max-w-md">';
        html += AppPengaturanPembagian.inputField('Nilai Resep', 'resepLuar_nilaiResep', d.resepLuar.nilaiResep, 'Rp');
        html += AppPengaturanPembagian.inputField('Potongan Dokter', 'resepLuar_potonganDokter', d.resepLuar.potonganDokter, 'Rp');
        html += '</div></div>';

        // 3. TINDAKAN KLINIK
        html += AppPengaturanPembagian.renderSlotSection('tindakanKlinik', '3. Tindakan Klinik (Tuslah)', 'purple', d.tindakanKlinik, true);

        // 4. TINDAKAN APOTEK
        html += AppPengaturanPembagian.renderSlotSection('tindakanApotek', '4. Tindakan Apotek (Tuslah)', 'teal', d.tindakanApotek, true);

        // 5. TUNJANGAN OMZET
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '<h3 class="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 text-lg mb-4"><i data-lucide="trending-up" class="w-5 h-5"></i> 5. Tunjangan Omzet</h3>';
        html += '<div class="mb-4 w-32">' + AppPengaturanPembagian.inputField('Persen Margin Obat', 'omzet_persen', d.tunjanganOmzet.persen, '%') + '</div>';
        html += AppPengaturanPembagian.renderSlotRows('tunjanganOmzet', d.tunjanganOmzet.slot, false);
        html += '</div>';

        // 6. TUNJANGAN TRANSPORT
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '<h3 class="font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-2 text-lg mb-4"><i data-lucide="truck" class="w-5 h-5"></i> 6. Tunjangan Transport</h3>';
        html += '<div class="mb-4 w-32">' + AppPengaturanPembagian.inputField('Total Dana', 'transport_total', d.transport.total, 'Rp') + '</div>';
        html += AppPengaturanPembagian.renderSlotRows('transport', d.transport.slot, false);
        html += '</div>';

        // 7. TUNJANGAN UANG MAKAN
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '<h3 class="font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-2 text-lg mb-4"><i data-lucide="utensils" class="w-5 h-5"></i> 7. Tunjangan Uang Makan</h3>';
        html += '<p class="text-xs text-slate-400 mb-3 bg-slate-50 dark:bg-slate-900 p-2 rounded">Sumber: Otomatis dari total pembulatan transaksi. Sisa setelah dibagi masuk ke PSA.</p>';
        html += AppPengaturanPembagian.renderSlotRows('uangMakan', d.uangMakan.slot, false);
        html += '</div>';

        // 8. TABEL MARGIN PSA (READONLY INFO)
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">';
        html += '<h3 class="font-semibold text-gray-800 dark:text-white flex items-center gap-2 text-lg mb-4"><i data-lucide="landmark" class="w-5 h-5 text-slate-600"></i> 8. Pendapatan PSA (Margin Otomatis)</h3>';
        html += '<div id="psa-margin-info" class="text-sm space-y-2 text-slate-600 dark:text-slate-300"></div>';
        html += '</div>';

        // TOMBOL SIMPAN
        html += '<div class="flex justify-end sticky bottom-6 z-10"><button onclick="AppPengaturanPembagian.simpan()" class="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg transition-all text-sm flex items-center gap-2"><i data-lucide="save" class="w-4 h-4"></i> Simpan Pengaturan</button></div>';

        document.getElementById('pembagian-content').innerHTML = html;
        lucide.createIcons();
        AppPengaturanPembagian.hitungInfoPSA();
    },

    // --- HELPERS ---
    inputField: function(label, id, value, suffix) {
        return '<div class="mb-1"><label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">' + label + '</label><div class="relative"><input type="number" id="pb-' + id + '" value="' + (value || 0) + '" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm pr-8 focus:ring-2 focus:ring-primary-500 outline-none" oninput="AppPengaturanPembagian.hitungInfoPSA()"><span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">' + suffix + '</span></div></div>';
    },

    dropdownKaryawan: function(id, selectedId) {
        var html = '<select id="' + id + '" class="w-full px-2 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
        html += '<option value="">-- Pilih --</option>';
        this.karyawanList.forEach(k => {
            var sel = (k.id === selectedId) ? ' selected' : '';
            html += '<option value="' + k.id + '"' + sel + '>' + Utils.escapeHtml(k.nama) + ' (' + Utils.escapeHtml(k.departemen || '-') + ')</option>';
        });
        html += '</select>';
        return html;
    },

    // --- 1. RESEP KLINIK (COMPLEX NESTED) ---
    addResepKlinik: function() {
        this.data.resepKlinik.push({ dokterId: '', nilaiResep: 0, jm: 0, jd: 0, poolKaryKlinik: 0, slotKaryKlinik: [], poolKaryApotek: 0, slotKaryApotek: [] });
        this.renderForm();
    },

    removeResepKlinik: function(index) {
        if(confirm('Hapus skema dokter ini?')) {
            this.data.resepKlinik.splice(index, 1);
            this.renderForm();
        }
    },

    renderResepKlinikBlock: function(index, doc) {
        var html = '<div class="border border-slate-200 dark:border-slate-600 rounded-lg p-4 mb-4 bg-slate-50/50 dark:bg-slate-900/30 relative">';
        html += '<button onclick="AppPengaturanPembagian.removeResepKlinik(' + index + ')" class="absolute top-3 right-3 text-red-400 hover:text-red-600"><i data-lucide="trash-2" class="w-4 h-4"></i></button>';
        
        // Header Dokter
        html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 pr-8">';
        html += '<div class="sm:col-span-2 lg:col-span-1"><label class="block text-xs font-medium text-slate-500 mb-1">Dokter</label>' + this.dropdownKaryawan('rk-doc-' + index, doc.dokterId) + '</div>';
        html += this.inputField('Nilai Resep', 'rk-nilai-' + index, doc.nilaiResep, 'Rp');
        html += this.inputField('Jasa Medis (JM)', 'rk-jm-' + index, doc.jm, 'Rp');
        html += this.inputField('Jasa Dokter (JD)', 'rk-jd-' + index, doc.jd, 'Rp');
        html += '</div>';

        // a. Karyawan Klinik
        html += '<div class="mb-4 pl-4 border-l-4 border-purple-300 dark:border-purple-700">';
        html += '<div class="flex justify-between items-center mb-2"><p class="text-sm font-semibold text-purple-600 dark:text-purple-400">b. Karyawan Klinik</p>';
        html += '<div class="flex items-center gap-2">' + this.inputField('Pool Total', 'rk-poolKlinik-' + index, doc.poolKaryKlinik, 'Rp') + '<button type="button" onclick="AppPengaturanPembagian.addSlotTo(\'resepKlinik\', ' + index + ', \'slotKaryKlinik\')" class="text-xs text-purple-600 px-2 py-2 font-medium">+ Kary</button></div></div>';
        html += '<div id="rk-slots-klinik-' + index + '">';
        doc.slotKaryKlinik.forEach((s, si) => html += this.renderSlotRow('rk-klinik-' + index + '-' + si, s, true));
        html += '</div></div>';

        // c. Karyawan Apotek
        html += '<div class="pl-4 border-l-4 border-teal-300 dark:border-teal-700">';
        html += '<div class="flex justify-between items-center mb-2"><p class="text-sm font-semibold text-teal-600 dark:text-teal-400">c. Karyawan Apotek</p>';
        html += '<div class="flex items-center gap-2">' + this.inputField('Pool Total', 'rk-poolApotek-' + index, doc.poolKaryApotek, 'Rp') + '<button type="button" onclick="AppPengaturanPembagian.addSlotTo(\'resepKlinik\', ' + index + ', \'slotKaryApotek\')" class="text-xs text-teal-600 px-2 py-2 font-medium">+ Kary</button></div></div>';
        html += '<div id="rk-slots-apotek-' + index + '">';
        doc.slotKaryApotek.forEach((s, si) => html += this.renderSlotRow('rk-apotek-' + index + '-' + si, s, true));
        html += '</div></div>';

        html += '</div>';
        return html;
    },

    // --- 3 & 4. TINDAKAN KLINIK & APOTEK ---
    renderSlotSection: function(dataKey, title, color, slots, hasThr) {
        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">';
        html += '<div class="flex justify-between items-center mb-4"><h3 class="font-semibold text-' + color + '-600 dark:text-' + color + '-400 flex items-center gap-2 text-lg"><i data-lucide="stethoscope" class="w-5 h-5"></i> ' + title + '</h3><button onclick="AppPengaturanPembagian.addSlotTo(\'' + dataKey + '\')" class="text-sm bg-' + color + '-50 dark:bg-' + color + '-900/30 text-' + color + '-600 dark:text-' + color + '-400 px-3 py-1.5 rounded-lg hover:bg-' + color + '-100 dark:hover:bg-' + color + '-900/50 font-medium">+ Tambah</button></div>';
        html += '<div id="slots-' + dataKey + '">';
        slots.forEach((s, i) => html += this.renderSlotRow(dataKey + '-' + i, s, hasThr));
        if(slots.length === 0) html += '<p class="text-sm text-slate-400 italic p-2">Belum ada data.</p>';
        html += '</div></div>';
        return html;
    },

    // --- 5, 6, 7 OMZET, TRANSPORT, UM ---
    renderSlotRows: function(prefix, slots, hasThr) {
        var html = '<div id="slots-' + prefix + '" class="space-y-2">';
        slots.forEach((s, i) => html += this.renderSlotRow(prefix + '-' + i, s, hasThr));
        html += '</div>';
        html += '<button type="button" onclick="AppPengaturanPembagian.addSlotTo(\'' + prefix + '\')" class="mt-2 text-sm text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1"><i data-lucide="plus-circle" class="w-4 h-4"></i> Tambah Karyawan</button>';
        return html;
    },

    // --- UNIVERSAL SLOT ROW ---
    renderSlotRow: function(rowId, slot, hasThr) {
        var html = '<div id="row-' + rowId + '" class="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">';
        html += '<div class="w-full sm:w-1/3">' + this.dropdownKaryawan('slot-id-' + rowId, slot.karyawanId) + '</div>';
        html += '<div class="flex items-center gap-2 w-full sm:w-1/4"><input type="number" id="slot-persen-' + rowId + '" value="' + (slot.persen || 0) + '" class="w-full px-2 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-center" oninput="AppPengaturanPembagian.hitungInfoPSA()"><span class="text-xs text-slate-400">%</span></div>';
        if (hasThr) {
            html += '<label class="flex items-center gap-2 text-sm text-slate-500 whitespace-nowrap cursor-pointer"><input type="checkbox" id="slot-thr-' + rowId + '" ' + (slot.isTHR ? 'checked' : '') + ' class="w-4 h-4 rounded border-slate-300 text-primary-600"> Tab THR</label>';
        }
        html += '<button onclick="AppPengaturanPembagian.removeSlotRow(\'' + rowId + '\')" class="p-2 text-red-400 hover:text-red-600"><i data-lucide="x" class="w-4 h-4"></i></button>';
        html += '</div>';
        return html;
    },

                addSlotTo: function(parentKey, docIndex, slotKey) {
        var newSlot = { karyawanId: '', persen: 0, isTHR: false };
        
        if (parentKey === 'resepKlinik') {
            this.data.resepKlinik[docIndex][slotKey].push(newSlot);
        } else {
            var target = this.data[parentKey];
            
            // PERISAI: Kalau datanya hilang/undefined, hentikan proses dan beri tahu
            if (!target) {
                console.error("ERROR: Struktur data untuk", parentKey, "tidak ditemukan!");
                Utils.toast("Error struktur data. Coba refresh halaman.", "error");
                return; 
            }

            if (Array.isArray(target)) {
                target.push(newSlot); 
            } else {
                if (!target.slot || !Array.isArray(target.slot)) {
                    target.slot = [];
                }
                target.slot.push(newSlot); 
            }
        }
        this.renderForm(); 
    },

    removeSlotRow: function(rowId) {
        var parts = rowId.split('-');
        if (parts[0] === 'rk') {
            var type = parts[1]; 
            var docIdx = parseInt(parts[2]);
            var slotIdx = parseInt(parts[3]);
            var slotKey = (type === 'klinik') ? 'slotKaryKlinik' : 'slotKaryApotek';
            this.data.resepKlinik[docIdx][slotKey].splice(slotIdx, 1);
        } else {
            var parentKey = parts[0];
            var slotIdx = parseInt(parts[1]);
            var target = this.data[parentKey];
            
            if (Array.isArray(target)) {
                target.splice(slotIdx, 1); 
            } else {
                if (target && target.slot) {
                    target.slot.splice(slotIdx, 1); 
                }
            }
        }
        this.renderForm();
    },

    // --- 8. HITUNG INFO PSA SECARA REALTIME ---
               hitungInfoPSA: function() {
        var el = document.getElementById('psa-margin-info');
        if(!el) return;

        // 1. Resep Klinik
        var psaResepKlinik = 0;
        document.querySelectorAll('[id^="pb-rk-nilai-"]').forEach((input, i) => {
            var nilai = parseFloat(input.value) || 0;
            var jm = parseFloat(document.getElementById('pb-rk-jm-'+i)?.value) || 0;
            var jd = parseFloat(document.getElementById('pb-rk-jd-'+i)?.value) || 0;
            var poolK = parseFloat(document.getElementById('pb-rk-poolKlinik-'+i)?.value) || 0;
            var poolA = parseFloat(document.getElementById('pb-rk-poolApotek-'+i)?.value) || 0;
            psaResepKlinik += (nilai - jm - jd - poolK - poolA);
        });

        // 2. Resep Luar
        var rlNilai = parseFloat(document.getElementById('pb-resepLuar_nilaiResep')?.value) || 0;
        var rlDokter = parseFloat(document.getElementById('pb-resepLuar_potonganDokter')?.value) || 0;
        var psaResepLuar = rlNilai - rlDokter;

        // 3. Tindakan Klinik
        var totTK = 0;
        document.querySelectorAll('[id^="slot-persen-tindakanKlinik-"]').forEach(i => totTK += parseFloat(i.value) || 0);
        var psaTK = 100 - totTK;

        // 4. Tindakan Apotek
        var totTA = 0;
        document.querySelectorAll('[id^="slot-persen-tindakanApotek-"]').forEach(i => totTA += parseFloat(i.value) || 0);
        var psaTA = 100 - totTA;

        // 5. Tunjangan Omzet (Sisa persen setelah slot karyawan)
        var omzetPersenKary = 0;
        document.querySelectorAll('[id^="slot-persen-omzet-"]').forEach(i => omzetPersenKary += parseFloat(i.value) || 0);
        var omzetTotalPersen = parseFloat(document.getElementById('pb-omzet_persen')?.value) || 0;
        var psaOmzet = omzetTotalPersen - omzetPersenKary;

        // 7. Uang Makan
        var totUM = 0;
        document.querySelectorAll('[id^="slot-persen-uangMakan-"]').forEach(i => totUM += parseFloat(i.value) || 0);
        var psaUM = 100 - totUM;

        // RENDER KE LAYAR (Sudah termasuk Sisa Omzet)
        el.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><span class="text-xs text-blue-600 dark:text-blue-400">a. Sisa Resep Klinik</span><p class="font-bold text-blue-800 dark:text-blue-300">${Utils.formatRupiah(psaResepKlinik)} <span class="text-xs font-normal">/ resep</span></p></div>
                <div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"><span class="text-xs text-green-600 dark:text-green-400">b. Sisa Resep Luar</span><p class="font-bold text-green-800 dark:text-green-300">${Utils.formatRupiah(psaResepLuar)} <span class="text-xs font-normal">/ resep</span></p></div>
                <div class="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg"><span class="text-xs text-purple-600 dark:text-purple-400">c. Sisa Tindakan Klinik</span><p class="font-bold text-purple-800 dark:text-purple-300">${psaTK}%</p></div>
                <div class="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg"><span class="text-xs text-teal-600 dark:text-teal-400">d. Sisa Tindakan Apotek</span><p class="font-bold text-teal-800 dark:text-teal-300">${psaTA}%</p></div>
                <div class="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg"><span class="text-xs text-emerald-600 dark:text-emerald-400">e. Sisa Tunjangan Omzet</span><p class="font-bold text-emerald-800 dark:text-emerald-300">${psaOmzet}%</p></div>
                <div class="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg"><span class="text-xs text-orange-600 dark:text-orange-400">f. Sisa Uang Makan</span><p class="font-bold text-orange-800 dark:text-orange-300">${psaUM}%</p></div>
            </div>
            <p class="text-xs text-slate-400 mt-3 italic">*Nilai dihitung realtime. Jika minus, berarti pembagian melebihi sumber pendapatan.</p>
        `;
    },
    
    // --- SIMPAN KE FIRESTORE ---
    simpan: function() {
        var d = this.data;

                // 1. Resep Klinik
        d.resepKlinik = [];
        var rkBlocks = document.querySelectorAll('[id^="pb-rk-nilai-"]');
        rkBlocks.forEach((input, i) => {
            d.resepKlinik.push({
                dokterId: document.getElementById('pb-rk-doc-'+i)?.value,
                nilaiResep: parseFloat(input.value) || 0,
                jm: parseFloat(document.getElementById('pb-rk-jm-'+i)?.value) || 0,
                jd: parseFloat(document.getElementById('pb-rk-jd-'+i)?.value) || 0,
                poolKaryKlinik: parseFloat(document.getElementById('pb-rk-poolKlinik-'+i)?.value) || 0,
                slotKaryKlinik: this.collectSlotRows('rk-klinik-'+i),
                poolKaryApotek: parseFloat(document.getElementById('pb-rk-poolApotek-'+i)?.value) || 0,
                slotKaryApotek: this.collectSlotRows('rk-apotek-'+i)
            });
        });

        // 2. Resep Luar
        d.resepLuar = {
            nilaiResep: parseFloat(document.getElementById('pb-resepLuar_nilaiResep').value) || 0,
            potonganDokter: parseFloat(document.getElementById('pb-resepLuar_potonganDokter').value) || 0
        };

        // 3 & 4. Tindakan (Array of slots langsung)
        d.tindakanKlinik = this.collectSlotRows('tindakanKlinik');
        d.tindakanApotek = this.collectSlotRows('tindakanApotek');

        // 5. Tunjangan Omzet
        d.tunjanganOmzet = {
            persen: parseFloat(document.getElementById('pb-omzet_persen').value) || 0,
            slot: this.collectSlotRows('tunjanganOmzet')
        };

        // 6. Transport
        d.transport = {
            total: parseFloat(document.getElementById('pb-transport_total').value) || 0,
            slot: this.collectSlotRows('transport')
        };

        // 7. Uang Makan
        d.uangMakan = { slot: this.collectSlotRows('uangMakan') };

        d.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

        Utils.toast('Menyimpan...', 'info');
        db.collection('pengaturanPembagian').doc('global').set(d, { merge: true })
            .then(() => Utils.toast('Berhasil disimpan!', 'success'))
            .catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    },

    // Helper baca DOM slots
    collectSlotRows: function(prefix) {
        var slots = [];
        var persenInputs = document.querySelectorAll('[id^="slot-persen-' + prefix + '-"]');
        persenInputs.forEach(input => {
            // Ekstrak index dari ID: slot-persen-tindakanKlinik-0 -> index 0
            var idx = input.id.split('-').pop();
            var karyId = document.getElementById('slot-id-' + prefix + '-' + idx)?.value;
            var isThrEl = document.getElementById('slot-thr-' + prefix + '-' + idx);
            
            if(karyId) {
                slots.push({
                    karyawanId: karyId,
                    persen: parseFloat(input.value) || 0,
                    isTHR: isThrEl ? isThrEl.checked : false
                });
            }
        });
        return slots;
    }
};
