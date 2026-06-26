/**
 * js/keuangan/akuntansi.js
 * Modul Akuntansi Double-Entry (Jurnal Otomatis + Manual, Neraca, Laba Rugi, Export)
 */

window.AppKeuanganAkuntansi = {
    dataJurnalOtomatis: [],
    dataJurnalManual: [],
    dataSaldoAwal: [],
    chartOfAccounts: {
        '1-1000': { nama: 'Kas (Cash)', kategori: 'Aset' },
        '1-2000': { nama: 'Bank (Transfer/QRIS)', kategori: 'Aset' },
        '1-3000': { nama: 'Persediaan Obat', kategori: 'Aset' },
        '1-4000': { nama: 'Peralatan & Perlengkapan', kategori: 'Aset' },
        '2-1000': { nama: 'Hutang Usaha (Supplier)', kategori: 'Kewajiban' },
        '3-1000': { nama: 'Modal Pemilik', kategori: 'Ekuitas' },
        '3-2000': { nama: 'Prive Pemilik', kategori: 'Ekuitas' },
        '4-1000': { nama: 'Pendapatan Penjualan Obat', kategori: 'Pendapatan' },
        '4-2000': { nama: 'Pendapatan Tindakan & Jasa', kategori: 'Pendapatan' },
        '5-1000': { nama: 'HPP (Harga Pokok Penjualan)', kategori: 'Beban' },
        '5-2000': { nama: 'Beban Operasional (ATK, Listrik)', kategori: 'Beban' },
        '5-3000': { nama: 'Beban Gaji Karyawan', kategori: 'Beban' },
        '5-4000': { nama: 'Beban Lain-lain (Penyusutan dll)', kategori: 'Beban' }
    },

    render: function() {
        var html = '<div class="page-enter max-w-7xl">';
        html += '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '    <div>';
        html += '      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Akuntansi & Jurnal</h2>';
        html += '      <p class="text-sm text-slate-500 dark:text-slate-400">Catat jurnal manual, lihat neraca & laba rugi</p>';
        html += '    </div>';
        html += '    <div class="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">';
        html += '      <input type="month" id="filter-bulan-akuntansi" value="' + new Date().toISOString().slice(0, 7) + '" class="px-3 py-1.5 bg-transparent dark:text-white text-sm rounded-md outline-none">';
        html += '      <button onclick="AppKeuanganAkuntansi.init()" class="bg-primary-600 text-white text-sm px-4 py-1.5 rounded-md font-medium">Tampilkan</button>';
        html += '    </div>';
        html += '  </div>';
        
        // Tabs
        html += '<div class="flex gap-1 mb-4 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-full max-w-md">';
        html += '<button onclick="AppKeuanganAkuntansi.switchTab(\'jurnal\')" id="tab-jurnal" class="flex-1 py-2 text-sm rounded-md bg-white dark:bg-slate-700 shadow-sm font-semibold text-primary-600">Jurnal Umum</button>';
        html += '<button onclick="AppKeuanganAkuntansi.switchTab(\'neraca\')" id="tab-neraca" class="flex-1 py-2 text-sm rounded-md text-slate-500 font-medium">Neraca & L/R</button>';
        html += '</div>';

        html += '  <div id="akuntansi-content"><div class="flex justify-center py-20"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        var monthInput = document.getElementById('filter-bulan-akuntansi');
        if (!monthInput) return;
        var bulan = monthInput.value;
        var startDate = bulan + '-01';
        var endDate = bulan + '-31';

        // Ambil semua data keuangan bulan ini
        var pTrx = db.collection('transaksi').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get();
        var pKasKeluar = db.collection('kasKeluar').where('status', '==', 'approved').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get();
        var pJurnalManual = db.collection('jurnalManual').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get();
        var pSaldoAwal = db.collection('jurnalManual').where('keterangan', '==', 'SALDO AWAL').get(); // Asumsi saldo awal pakai keterangan ini

        Promise.all([pTrx, pKasKeluar, pJurnalManual, pSaldoAwal]).then(function(results) {
            self.dataJurnalOtomatis = [];
            self.dataJurnalManual = [];
            self.dataSaldoAwal = [];

            // 1. Saldo Awal (Bulan sebelumnya)
            results[3].forEach(function(doc) {
                var d = doc.data(); d.id = doc.id;
                self.dataSaldoAwal.push(d);
            });

            // 2. Transaksi Penjualan (Jurnal Otomatis)
            results[0].forEach(function(doc) {
                var t = doc.data();
                var omzetObat = t.items ? t.items.reduce(function(s, i) { return s + (i.jumlah * i.hargaJual); }, 0) : 0;
                var hpp = t.items ? t.items.reduce(function(s, i) { return s + (i.jumlah * (i.hargaBeli || 0)); }, 0) : 0;
                var pendapatanLain = (t.totalRacik || 0) + (t.totalTindakan || 0) + (t.jasaResep || 0);
                var kasBank = t.totalAkhir || 0;

                // Jurnal Penjualan
                self.dataJurnalOtomatis.push({ tanggal: t.tanggal, keterangan: 'Penjualan ' + t.tipe, akunDebit: t.metodeBayar === 'cash' ? '1-1000' : '1-2000', debit: kasBank, kredit: 0 });
                self.dataJurnalOtomatis.push({ tanggal: t.tanggal, keterangan: 'Penjualan ' + t.tipe, akunDebit: '0', debit: 0, kredit: 0 }); // Separator
                self.dataJurnalOtomatis.push({ tanggal: t.tanggal, keterangan: 'Pendapatan Obat', akunDebit: '', debit: 0, kredit: omzetObat, akunKredit: '4-1000' });
                if (pendapatanLain > 0) self.dataJurnalOtomatis.push({ tanggal: t.tanggal, keterangan: 'Pendapatan Jasa/Tindakan', akunDebit: '', debit: 0, kredit: pendapatanLain, akunKredit: '4-2000' });
                
                // Jurnal HPP
                if (hpp > 0) {
                    self.dataJurnalOtomatis.push({ tanggal: t.tanggal, keterangan: 'HPP Penjualan', akunDebit: '5-1000', debit: hpp, kredit: 0 });
                    self.dataJurnalOtomatis.push({ tanggal: t.tanggal, keterangan: 'HPP Penjualan', akunDebit: '', debit: 0, kredit: hpp, akunKredit: '1-3000' });
                }
            });

            // 3. Pengeluaran Kas (Jurnal Otomatis)
            results[1].forEach(function(doc) {
                var p = doc.data();
                self.dataJurnalOtomatis.push({ tanggal: p.tanggal, keterangan: p.keterangan, akunDebit: '5-2000', debit: p.jumlah, kredit: 0 });
                self.dataJurnalOtomatis.push({ tanggal: p.tanggal, keterangan: p.keterangan, akunDebit: '', debit: 0, kredit: p.jumlah, akunKredit: '1-1000' });
            });

            // 4. Jurnal Manual
            results[2].forEach(function(doc) {
                var d = doc.data(); d.id = doc.id;
                if (d.keterangan !== 'SALDO AWAL') self.dataJurnalManual.push(d);
            });

            self.renderJurnalTab();
        }).catch(function(err) {
            Utils.toast('Gagal memuat akuntansi: ' + err.message, 'error');
            console.error(err);
        });
    },

    switchTab: function(tab) {
        var btnJurnal = document.getElementById('tab-jurnal');
        var btnNeraca = document.getElementById('tab-neraca');
        btnJurnal.className = 'flex-1 py-2 text-sm rounded-md text-slate-500 font-medium';
        btnNeraca.className = 'flex-1 py-2 text-sm rounded-md text-slate-500 font-medium';

        if (tab === 'jurnal') {
            btnJurnal.className = 'flex-1 py-2 text-sm rounded-md bg-white dark:bg-slate-700 shadow-sm font-semibold text-primary-600';
            this.renderJurnalTab();
        } else {
            btnNeraca.className = 'flex-1 py-2 text-sm rounded-md bg-white dark:bg-slate-700 shadow-sm font-semibold text-primary-600';
            this.renderNeracaTab();
        }
    },

    // ===== TAB JURNAL UMUM =====
    renderJurnalTab: function() {
        var container = document.getElementById('akuntansi-content');
        var html = '<div class="flex justify-end mb-4 gap-2">';
        html += '<button onclick="AppKeuanganAkuntansi.openFormJurnal()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> Input Jurnal Manual</button>';
        html += '<button onclick="AppKeuanganAkuntansi.exportExcel()" class="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2"><i data-lucide="file-spreadsheet" class="w-4 h-4"></i> Export Excel</button>';
        html += '</div>';

        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<table class="w-full text-xs">';
        html += '<thead><tr class="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase">';
        html += '<th class="px-3 py-3 text-left">Tanggal</th><th class="px-3 py-3 text-left">Keterangan</th><th class="px-3 py-3 text-left">Akun</th><th class="px-3 py-3 text-right">Debit</th><th class="px-3 py-3 text-right">Kredit</th>';
        html += '</tr></thead><tbody>';

        var allJurnal = this.dataSaldoAwal.concat(this.dataJurnalManual, this.dataJurnalOtomatis);
        allJurnal.sort(function(a,b) { return (a.tanggal || '').localeCompare(b.tanggal || ''); });

        allJurnal.forEach(function(j) {
            var akunDebitNama = j.akunDebit ? (AppKeuanganAkuntansi.chartOfAccounts[j.akunDebit] ? AppKeuanganAkuntansi.chartOfAccounts[j.akunDebit].nama : '-') : '';
            var akunKreditNama = j.akunKredit ? (AppKeuanganAkuntansi.chartOfAccounts[j.akunKredit] ? AppKeuanganAkuntansi.chartOfAccounts[j.akunKredit].nama : '-') : '';
            var akunDisplay = akunDebitNama ? '<span class="text-blue-600">' + akunDebitNama + '</span>' : (akunKreditNama ? '<span class="text-purple-600">' + akunKreditNama + '</span>' : '<span class="text-slate-300 italic">--- Lanjutan ---</span>');
            
            if (j.keterangan === 'SALDO AWAL') akunDisplay = '<span class="text-amber-600 font-bold">SALDO AWAL</span>';

            html += '<tr class="border-t border-slate-100 dark:border-slate-700">';
            html += '<td class="px-3 py-2 text-slate-500">' + (j.tanggal || '-') + '</td>';
            html += '<td class="px-3 py-2 text-gray-800 dark:text-white">' + Utils.escapeHtml(j.keterangan || '-') + '</td>';
            html += '<td class="px-3 py-2">' + akunDisplay + '</td>';
            html += '<td class="px-3 py-2 text-right text-slate-600">' + (j.debit > 0 ? Utils.formatRupiah(j.debit) : '-') + '</td>';
            html += '<td class="px-3 py-2 text-right text-slate-600">' + (j.kredit > 0 ? Utils.formatRupiah(j.kredit) : '-') + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
        lucide.createIcons();
    },

    openFormJurnal: function() {
        var optHtml = '';
        for (var key in this.chartOfAccounts) {
            optHtml += '<option value="' + key + '">' + key + ' - ' + this.chartOfAccounts[key].nama + '</option>';
        }

        var html = '<div class="p-6">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold">Input Jurnal Manual</h3><button onclick="Utils.closeModal()" class="text-slate-400"><i data-lucide="x" class="w-5 h-5"></i></button></div>';
        html += '<form id="form-jurnal" class="space-y-4">';
        
        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div><label class="block text-sm font-medium mb-1">Tanggal *</label><input type="date" id="jr-tanggal" required class="w-full px-3 py-2 border dark:bg-slate-700 dark:text-white rounded-lg text-sm" value="' + new Date().toISOString().split('T')[0] + '"></div>';
        html += '<div><label class="block text-sm font-medium mb-1">Keterangan *</label><input type="text" id="jr-ket" required placeholder="Contoh: Prive Owner, Beli Meja" class="w-full px-3 py-2 border dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        html += '</div>';

        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div><label class="block text-sm font-medium mb-1">Akun Debit *</label><select id="jr-debit" class="w-full px-3 py-2 border dark:bg-slate-700 dark:text-white rounded-lg text-sm">' + optHtml + '</select></div>';
        html += '<div><label class="block text-sm font-medium mb-1">Akun Kredit *</label><select id="jr-kredit" class="w-full px-3 py-2 border dark:bg-slate-700 dark:text-white rounded-lg text-sm">' + optHtml + '</select></div>';
        html += '</div>';

        html += '<div><label class="block text-sm font-medium mb-1">Nominal (Rp) *</label><input type="number" id="jr-nominal" required min="0" class="w-full px-3 py-2 border dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="500000"></div>';

        html += '<div class="flex justify-end pt-4 border-t"><button type="submit" class="bg-primary-600 text-white font-semibold px-6 py-2 rounded-lg text-sm">Simpan Jurnal</button></div>';
        html += '</form></div>';

        Utils.openModal(html);
        lucide.createIcons();

        setTimeout(function() {
            document.getElementById('form-jurnal').addEventListener('submit', function(e) {
                e.preventDefault();
                AppKeuanganAkuntansi.simpanJurnal();
            });
        }, 100);
    },

    simpanJurnal: function() {
        var obj = {
            tanggal: document.getElementById('jr-tanggal').value,
            keterangan: document.getElementById('jr-ket').value.trim(),
            akunDebit: document.getElementById('jr-debit').value,
            akunKredit: document.getElementById('jr-kredit').value,
            debit: parseFloat(document.getElementById('jr-nominal').value) || 0,
            kredit: parseFloat(document.getElementById('jr-nominal').value) || 0,
            inputOleh: window.currentUserName || 'Keuangan',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (obj.debit <= 0 || obj.akunDebit === obj.akunKredit) {
            Utils.toast('Akun debit/kredit tidak boleh sama, dan nominal harus > 0', 'error'); return;
        }

        db.collection('jurnalManual').add(obj).then(function() {
            Utils.toast('Jurnal manual tersimpan!', 'success');
            Utils.closeModal();
            AppKeuanganAkuntansi.init();
        }).catch(function(err) { Utils.toast('Gagal: ' + err.message, 'error'); });
    },

    // ===== TAB NERACA & LABA RUGI =====
    renderNeracaTab: function() {
        var container = document.getElementById('akuntansi-content');
        var self = this;

        // Hitung Saldo Akun
        var saldos = {};
        for (var key in this.chartOfAccounts) saldos[key] = 0;

        var prosesJurnal = function(j) {
            if (saldos[j.akunDebit] !== undefined) saldos[j.akunDebit] += (j.debit || 0);
            if (saldos[j.akunKredit] !== undefined) saldos[j.akunKredit] -= (j.kredit || 0);
        };

        this.dataSaldoAwal.forEach(prosesJurnal);
        this.dataJurnalManual.forEach(prosesJurnal);
        this.dataJurnalOtomatis.forEach(prosesJurnal);

        // Kalkulasi Laba Rugi
        var totalPendapatan = (saldos['4-1000'] * -1) + (saldos['4-2000'] * -1);
        var totalBeban = saldos['5-1000'] + saldos['5-2000'] + saldos['5-3000'] + saldos['5-4000'];
        var labaBersih = totalPendapatan - totalBeban;

        var html = '<div class="flex justify-end mb-4 gap-2">';
        html += '<button onclick="AppKeuanganAkuntansi.exportPDF()" class="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2"><i data-lucide="file-text" class="w-4 h-4"></i> Export PDF</button>';
        html += '</div>';

        html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
        
        // Kartu Laba Rugi
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border p-5">';
        html += '<h3 class="font-bold text-lg mb-4 text-gray-800 dark:text-white">Laporan Laba Rugi</h3>';
        html += '<div class="space-y-2 text-sm">';
        html += '<div class="flex justify-between"><span class="text-slate-500">Pendapatan Penjualan Obat</span><span class="font-medium">' + Utils.formatRupiah(saldos['4-1000'] * -1) + '</span></div>';
        html += '<div class="flex justify-between"><span class="text-slate-500">Pendapatan Jasa & Tindakan</span><span class="font-medium">' + Utils.formatRupiah(saldos['4-2000'] * -1) + '</span></div>';
        html += '<div class="flex justify-between border-t pt-2 font-bold"><span>Total Pendapatan</span><span>' + Utils.formatRupiah(totalPendapatan) + '</span></div>';
        html += '<div class="flex justify-between mt-4"><span class="text-slate-500">HPP</span><span class="text-red-500">(-) ' + Utils.formatRupiah(saldos['5-1000']) + '</span></div>';
        html += '<div class="flex justify-between"><span class="text-slate-500">Beban Operasional</span><span class="text-red-500">(-) ' + Utils.formatRupiah(saldos['5-2000']) + '</span></div>';
        html += '<div class="flex justify-between"><span class="text-slate-500">Beban Gaji</span><span class="text-red-500">(-) ' + Utils.formatRupiah(saldos['5-3000']) + '</span></div>';
        html += '<div class="flex justify-between"><span class="text-slate-500">Beban Lain-lain</span><span class="text-red-500">(-) ' + Utils.formatRupiah(saldos['5-4000']) + '</span></div>';
        html += '<div class="flex justify-between border-t pt-2 font-bold"><span>Total Beban</span><span class="text-red-500">' + Utils.formatRupiah(totalBeban) + '</span></div>';
        html += '<div class="flex justify-between border-t-2 mt-2 pt-3 text-lg font-bold ' + (labaBersih >= 0 ? 'text-emerald-600' : 'text-red-600') + '"><span>LABA BERSIH</span><span>' + Utils.formatRupiah(labaBersih) + '</span></div>';
        html += '</div></div>';

        // Kartu Neraca
        var totalAset = saldos['1-1000'] + saldos['1-2000'] + saldos['1-3000'] + saldos['1-4000'];
        var totalKewajiban = saldos['2-1000'] * -1;
        var totalEkuitas = (saldos['3-1000'] * -1) + saldos['3-2000'] + labaBersih; // Prive di debit (+), Modal di kredit (-)

        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border p-5">';
        html += '<h3 class="font-bold text-lg mb-4 text-gray-800 dark:text-white">Neraca (Balance Sheet)</h3>';
        html += '<div class="space-y-2 text-sm">';
        html += '<p class="font-semibold text-slate-600 dark:text-slate-400 border-b pb-1">ASET</p>';
        html += '<div class="flex justify-between"><span class="text-slate-500 pl-4">Kas & Bank</span><span>' + Utils.formatRupiah(saldos['1-1000'] + saldos['1-2000']) + '</span></div>';
        html += '<div class="flex justify-between"><span class="text-slate-500 pl-4">Persediaan Obat</span><span>' + Utils.formatRupiah(saldos['1-3000']) + '</span></div>';
        html += '<div class="flex justify-between"><span class="text-slate-500 pl-4">Peralatan</span><span>' + Utils.formatRupiah(saldos['1-4000']) + '</span></div>';
        html += '<div class="flex justify-between border-t pt-2 font-bold"><span>Total Aset</span><span>' + Utils.formatRupiah(totalAset) + '</span></div>';
        
        html += '<p class="font-semibold text-slate-600 dark:text-slate-400 border-b pb-1 mt-4">KEWAJIBAN & EKUITAS</p>';
        html += '<div class="flex justify-between"><span class="text-slate-500 pl-4">Hutang Usaha</span><span>' + Utils.formatRupiah(totalKewajiban) + '</span></div>';
        html += '<div class="flex justify-between"><span class="text-slate-500 pl-4">Modal Pemilik</span><span>' + Utils.formatRupiah(saldos['3-1000'] * -1) + '</span></div>';
        html += '<div class="flex justify-between"><span class="text-slate-500 pl-4">Prive Pemilik</span><span class="text-red-500">(-) ' + Utils.formatRupiah(saldos['3-2000']) + '</span></div>';
        html += '<div class="flex justify-between"><span class="text-slate-500 pl-4">Laba Bulan Ini</span><span>' + Utils.formatRupiah(labaBersih) + '</span></div>';
        html += '<div class="flex justify-between border-t pt-2 font-bold"><spanTotal Pasiva</span><span>' + Utils.formatRupiah(totalKewajiban + totalEkuitas) + '</span></div>';
        html += '</div></div>';

        html += '</div>';
        container.innerHTML = html;
        lucide.createIcons();
    },

    // ===== EXPORT EXCEL & PDF =====
    exportExcel: function() {
        var data = [['Tanggal', 'Keterangan', 'Akun', 'Debit', 'Kredit']];
        var allJurnal = this.dataSaldoAwal.concat(this.dataJurnalManual, this.dataJurnalOtomatis);
        allJurnal.sort(function(a,b) { return (a.tanggal || '').localeCompare(b.tanggal || ''); });

        allJurnal.forEach(function(j) {
            var akunDebitNama = j.akunDebit ? (AppKeuanganAkuntansi.chartOfAccounts[j.akunDebit] ? AppKeuanganAkuntansi.chartOfAccounts[j.akunDebit].nama : '-') : '';
            var akunKreditNama = j.akunKredit ? (AppKeuanganAkuntansi.chartOfAccounts[j.akunKredit] ? AppKeuanganAkuntansi.chartOfAccounts[j.akunKredit].nama : '-') : '';
            data.push([j.tanggal, j.keterangan, akunDebitNama || akunKreditNama || '---', j.debit || 0, j.kredit || 0]);
        });

        var ws = XLSX.utils.aoa_to_sheet(data);
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Jurnal Umum");
        XLSX.writeFile(wb, "Jurnal_Umum_Aulia.xlsx");
        Utils.toast('Excel berhasil diexport!', 'success');
    },

    exportPDF: function() {
        const { jsPDF } = window.jspdf;
        var doc = new jsPDF();
        var bulan = document.getElementById('filter-bulan-akuntansi').value;

        doc.setFontSize(18);
        doc.text("Laporan Keuangan - Aulia Apotek Klinik", 105, 15, { align: 'center' });
        doc.setFontSize(12);
        doc.text("Periode: " + bulan, 105, 22, { align: 'center' });

        // Hitung saldo utk PDF
        var saldos = {};
        for (var key in this.chartOfAccounts) saldos[key] = 0;
        var prosesJurnal = function(j) {
            if (saldos[j.akunDebit] !== undefined) saldos[j.akunDebit] += (j.debit || 0);
            if (saldos[j.akunKredit] !== undefined) saldos[j.akunKredit] -= (j.kredit || 0);
        };
        this.dataSaldoAwal.forEach(prosesJurnal);
        this.dataJurnalManual.forEach(prosesJurnal);
        this.dataJurnalOtomatis.forEach(prosesJurnal);

        var totalPendapatan = (saldos['4-1000'] * -1) + (saldos['4-2000'] * -1);
        var totalBeban = saldos['5-1000'] + saldos['5-2000'] + saldos['5-3000'] + saldos['5-4000'];
        var labaBersih = totalPendapatan - totalBeban;

        // Tabel Laba Rugi
        doc.autoTable({
            startY: 30,
            head: [['Laporan Laba Rugi', 'Nominal (Rp)']],
            body: [
                ['Pendapatan Penjualan Obat', Utils.formatRupiah(saldos['4-1000'] * -1)],
                ['Pendapatan Jasa & Tindakan', Utils.formatRupiah(saldos['4-2000'] * -1)],
                [{ content: 'Total Pendapatan', styles: { fontStyle: 'bold' } }, { content: Utils.formatRupiah(totalPendapatan), styles: { fontStyle: 'bold' } }],
                ['HPP', '(-) ' + Utils.formatRupiah(saldos['5-1000'])],
                ['Beban Operasional', '(-) ' + Utils.formatRupiah(saldos['5-2000'])],
                ['Beban Gaji', '(-) ' + Utils.formatRupiah(saldos['5-3000'])],
                ['Beban Lain-lain', '(-) ' + Utils.formatRupiah(saldos['5-4000'])],
                [{ content: 'LABA BERSIH', styles: { fontStyle: 'bold', fillColor: [22, 163, 74], textColor: 255 } }, { content: Utils.formatRupiah(labaBersih), styles: { fontStyle: 'bold', fillColor: [22, 163, 74], textColor: 255 } }]
            ],
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235] }
        });

        // Tabel Neraca
        var totalAset = saldos['1-1000'] + saldos['1-2000'] + saldos['1-3000'] + saldos['1-4000'];
        var totalKewajiban = saldos['2-1000'] * -1;
        var totalEkuitas = (saldos['3-1000'] * -1) - saldos['3-2000'] + labaBersih;

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 10,
            head: [['Neraca (Balance Sheet)', 'Nominal (Rp)']],
            body: [
                [{ content: 'ASET', styles: { fontStyle: 'bold' } }, ''],
                ['Kas & Bank', Utils.formatRupiah(saldos['1-1000'] + saldos['1-2000'])],
                ['Persediaan Obat', Utils.formatRupiah(saldos['1-3000'])],
                ['Peralatan', Utils.formatRupiah(saldos['1-4000'])],
                [{ content: 'Total Aset', styles: { fontStyle: 'bold' } }, { content: Utils.formatRupiah(totalAset), styles: { fontStyle: 'bold' } }],
                [{ content: 'KEWAJIBAN & EKUITAS', styles: { fontStyle: 'bold' } }, ''],
                ['Hutang Usaha', Utils.formatRupiah(totalKewajiban)],
                ['Modal Pemilik', Utils.formatRupiah(saldos['3-1000'] * -1)],
                ['Prive Pemilik', '(-) ' + Utils.formatRupiah(saldos['3-2000'])],
                ['Laba Bulan Ini', Utils.formatRupiah(labaBersih)],
                [{ content: 'Total Pasiva', styles: { fontStyle: 'bold' } }, { content: Utils.formatRupiah(totalKewajiban + totalEkuitas), styles: { fontStyle: 'bold' } }]
            ],
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235] }
        });

        doc.save("Laporan_Keuangan_Aulia_" + bulan + ".pdf");
        Utils.toast('PDF berhasil diexport!', 'success');
    }
};
