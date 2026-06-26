/**
 * js/keuangan/akuntansi.js
 * Modul Akuntansi Lengkap (Double-Entry) - SAK Indonesia
 * FIX: End Date dinamis, Pisah Saldo Awal, PPN Masukan neto, Anti double gaji, Ikhtisar L/R.
 */

window.AppKeuanganAkuntansi = {
    COA: {
        '1-1100': { nama: 'Kas', kategori: 'Aset', saldoNormal: 'Debit' },
        '1-1200': { nama: 'Bank / Transfer / QRIS', kategori: 'Aset', saldoNormal: 'Debit' },
        '1-1300': { nama: 'Piutang Usaha', kategori: 'Aset', saldoNormal: 'Debit' },
        '1-1400': { nama: 'Persediaan Obat (Non-PPN)', kategori: 'Aset', saldoNormal: 'Debit' },
        '1-1410': { nama: 'Persediaan Obat (PPN 11%)', kategori: 'Aset', saldoNormal: 'Debit' },
        '1-1500': { nama: 'Perlengkapan & ATK', kategori: 'Aset', saldoNormal: 'Debit' },
        '1-2100': { nama: 'Peralatan Medis', kategori: 'Aset', saldoNormal: 'Debit' },
        '1-2200': { nama: 'Peralatan Apotek & Furniture', kategori: 'Aset', saldoNormal: 'Debit' },
        '1-2900': { nama: 'Akumulasi Penyusutan', kategori: 'Aset', saldoNormal: 'Kredit' },
        '2-1100': { nama: 'Hutang Usaha (Supplier Obat)', kategori: 'Kewajiban', saldoNormal: 'Kredit' },
        '2-1200': { nama: 'Hutang PPN (PPN Keluaran - PPN Masukan)', kategori: 'Kewajiban', saldoNormal: 'Kredit' },
        '2-1300': { nama: 'Hutang Gaji', kategori: 'Kewajiban', saldoNormal: 'Kredit' },
        '2-1400': { nama: 'Kewajiban Lain-lain', kategori: 'Kewajiban', saldoNormal: 'Kredit' },
        '3-1000': { nama: 'Modal Pemilik', kategori: 'Ekuitas', saldoNormal: 'Kredit' },
        '3-2000': { nama: 'Prive Pemilik', kategori: 'Ekuitas', saldoNormal: 'Debit' },
        '3-3000': { nama: 'Laba Ditahan', kategori: 'Ekuitas', saldoNormal: 'Kredit' },
        '3-9000': { nama: 'Ikhtisar Laba Rugi', kategori: 'Ekuitas', saldoNormal: 'Kredit' }, // Ditambahkan
        '4-1100': { nama: 'Penjualan Obat Non-PPN (Generik)', kategori: 'Pendapatan', saldoNormal: 'Kredit' },
        '4-1200': { nama: 'Penjualan Obat PPN (OTC & Ethical)', kategori: 'Pendapatan', saldoNormal: 'Kredit' },
        '4-1300': { nama: 'Pendapatan Jasa Tindakan Medis', kategori: 'Pendapatan', saldoNormal: 'Kredit' },
        '4-1400': { nama: 'Pendapatan Jasa Resep / Racik', kategori: 'Pendapatan', saldoNormal: 'Kredit' },
        '4-1500': { nama: 'Pendapatan Lain-lain', kategori: 'Pendapatan', saldoNormal: 'Kredit' },
        '5-1100': { nama: 'HPP Obat Non-PPN', kategori: 'Beban', saldoNormal: 'Debit' },
        '5-1200': { nama: 'HPP Obat PPN', kategori: 'Beban', saldoNormal: 'Debit' },
        '5-2100': { nama: 'Beban Gaji Karyawan', kategori: 'Beban', saldoNormal: 'Debit' },
        '5-2200': { nama: 'Beban Tunjangan', kategori: 'Beban', saldoNormal: 'Debit' },
        '5-2300': { nama: 'Beban Operasional (Listrik, ATK)', kategori: 'Beban', saldoNormal: 'Debit' },
        '5-2400': { nama: 'Beban Penyusutan Aset', kategori: 'Beban', saldoNormal: 'Debit' },
        '5-2500': { nama: 'Beban PPN Masukan', kategori: 'Beban', saldoNormal: 'Debit' },
        '5-3000': { nama: 'Beban Lain-lain', kategori: 'Beban', saldoNormal: 'Debit' }
    },

    dataJurnal: [],
    dataSaldoAwal: [],
    currentMonth: new Date().toISOString().slice(0, 7),

    render: function() {
        var html = '<div class="page-enter max-w-7xl">';
        html += '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '    <div><h2 class="text-xl font-bold text-gray-800 dark:text-white">Akuntansi & Keuangan</h2>';
        html += '    <p class="text-sm text-slate-500 dark:text-slate-400">Sistem pencatatan double-entry standar SAK</p></div>';
        html += '    <div class="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">';
        html += '      <input type="month" id="filter-bulan-akuntansi" value="' + this.currentMonth + '" class="px-3 py-1.5 bg-transparent dark:text-white text-sm rounded-md outline-none">';
        html += '      <button onclick="AppKeuanganAkuntansi.init()" class="bg-primary-600 text-white text-sm px-4 py-1.5 rounded-md font-medium">Tampilkan</button>';
        html += '    </div>';
        html += '  </div>';
        
        html += '<div class="flex gap-1 mb-4 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 overflow-x-auto">';
        var tabs = [
            {id:'jurnal', label:'Jurnal Umum'}, {id:'bukuBesar', label:'Buku Besar'}, 
            {id:'neracaSaldo', label:'Neraca Saldo'}, {id:'labaRugi', label:'Laba Rugi'}, 
            {id:'neraca', label:'Neraca'}, {id:'penutup', label:'Jurnal Penutup'}, {id:'saldoAwal', label:'Saldo Awal'}
        ];
        tabs.forEach(function(t) {
            html += '<button onclick="AppKeuanganAkuntansi.switchTab(\'' + t.id + '\')" id="tab-' + t.id + '" class="flex-1 min-w-max py-2 px-4 text-sm rounded-md text-slate-500 font-medium hover:text-primary-600">' + t.label + '</button>';
        });
        html += '</div>';

        html += '  <div id="akuntansi-content"><div class="flex justify-center py-20"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        var monthInput = document.getElementById('filter-bulan-akuntansi');
        if (!monthInput) return;
        this.currentMonth = monthInput.value;
        var bulan = this.currentMonth;
        var startDate = bulan + '-01';
        
        // FIX #1: Tanggal akhir bulan dinamis
        var parts = bulan.split('-');
        var endDate = new Date(parts[0], parts[1], 0).toISOString().slice(0, 10);

        var pTrx = db.collection('transaksi').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get();
        var pKasKeluar = db.collection('kasKeluar').where('status', '==', 'approved').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get();
        var pBeliStok = db.collection('pembelianStok').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get();
        var pGaji = db.collection('penggajian').where('bulan', '==', bulan).get();
        var pJurnalManual = db.collection('jurnalManual').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get();
        var pSaldoAwal = db.collection('saldoAwal').where('periode', '<=', bulan).get();

        Promise.all([pTrx, pKasKeluar, pBeliStok, pGaji, pJurnalManual, pSaldoAwal]).then(function(results) {
            self.dataJurnal = [];
            self.dataSaldoAwal = [];

            // FIX #2: Saldo Awal dipisah, tidak masuk dataJurnal
            results[5].forEach(function(doc) {
                var d = doc.data(); d.id = doc.id;
                self.dataSaldoAwal.push(d);
            });

            // Jurnal Otomatis Transaksi Penjualan
            results[0].forEach(function(doc) {
                var t = doc.data();
                var omzetNonPPN = 0, omzetPPNGross = 0, hppNonPPN = 0, hppPPN = 0;
                
                if (t.items) {
                    t.items.forEach(function(it) {
                        var subJual = it.jumlah * it.hargaJual;
                        var subBeli = it.jumlah * (it.hargaBeli || 0);
                        if (it.isPPN) { omzetPPNGross += subJual; hppPPN += subBeli; } 
                        else { omzetNonPPN += subJual; hppNonPPN += subBeli; }
                    });
                }

                var ppnKeluaran = Math.round(omzetPPNGross - (omzetPPNGross / 1.11));
                var omzetPPNNeto = omzetPPNGross - ppnKeluaran;
                var pendapatanJasa = (t.totalTindakan || 0) + (t.totalRacik || 0) + (t.jasaResep || 0);
                var kasBank = t.metodeBayar === 'cash' ? '1-1100' : '1-1200';

                self.dataJurnal.push({ tanggal: t.tanggal, keterangan: 'Penjualan ' + t.tipe, akunDebit: kasBank, akunKredit: '', debit: t.totalAkhir || 0, kredit: 0, isManual: false, tipeJurnal: 'Otomatis' });
                if (omzetNonPPN > 0) self.dataJurnal.push({ tanggal: t.tanggal, keterangan: 'Penjualan Obat Non-PPN', akunDebit: '', akunKredit: '4-1100', debit: 0, kredit: omzetNonPPN, isManual: false, tipeJurnal: 'Otomatis' });
                if (omzetPPNNeto > 0) self.dataJurnal.push({ tanggal: t.tanggal, keterangan: 'Penjualan Obat PPN', akunDebit: '', akunKredit: '4-1200', debit: 0, kredit: omzetPPNNeto, isManual: false, tipeJurnal: 'Otomatis' });
                if (ppnKeluaran > 0) self.dataJurnal.push({ tanggal: t.tanggal, keterangan: 'PPN Keluaran', akunDebit: '', akunKredit: '2-1200', debit: 0, kredit: ppnKeluaran, isManual: false, tipeJurnal: 'Otomatis' });
                if (pendapatanJasa > 0) {
                    self.dataJurnal.push({ tanggal: t.tanggal, keterangan: 'Pendapatan Tindakan Medis', akunDebit: '', akunKredit: '4-1300', debit: 0, kredit: t.totalTindakan || 0, isManual: false, tipeJurnal: 'Otomatis' });
                    self.dataJurnal.push({ tanggal: t.tanggal, keterangan: 'Pendapatan Jasa Resep/Racik', akunDebit: '', akunKredit: '4-1400', debit: 0, kredit: (t.totalRacik || 0) + (t.jasaResep || 0), isManual: false, tipeJurnal: 'Otomatis' });
                }

                // FIX #6: Jurnal Penjualan Balance dengan selisih
                var totalKreditSementara = omzetNonPPN + omzetPPNNeto + ppnKeluaran + pendapatanJasa;
                var selisih = (t.totalAkhir || 0) - totalKreditSementara;
                if (Math.abs(selisih) > 0) {
                    if (selisih > 0) self.dataJurnal.push({ tanggal: t.tanggal, keterangan: 'Pendapatan Pembulatan/Lain', akunDebit: '', akunKredit: '4-1500', debit: 0, kredit: selisih, isManual: false, tipeJurnal: 'Otomatis' });
                    else self.dataJurnal.push({ tanggal: t.tanggal, keterangan: 'Beban Selisih Kas/Lain', akunDebit: '5-3000', akunKredit: '', debit: Math.abs(selisih), kredit: 0, isManual: false, tipeJurnal: 'Otomatis' });
                }

                // Jurnal HPP
                if (hppNonPPN > 0) {
                    self.dataJurnal.push({ tanggal: t.tanggal, keterangan: 'HPP Obat Non-PPN', akunDebit: '5-1100', akunKredit: '', debit: hppNonPPN, kredit: 0, isManual: false, tipeJurnal: 'Otomatis' });
                    self.dataJurnal.push({ tanggal: t.tanggal, keterangan: 'Kredit Persediaan Non-PPN', akunDebit: '', akunKredit: '1-1400', debit: 0, kredit: hppNonPPN, isManual: false, tipeJurnal: 'Otomatis' });
                }
                if (hppPPN > 0) {
                    self.dataJurnal.push({ tanggal: t.tanggal, keterangan: 'HPP Obat PPN', akunDebit: '5-1200', akunKredit: '', debit: hppPPN, kredit: 0, isManual: false, tipeJurnal: 'Otomatis' });
                    self.dataJurnal.push({ tanggal: t.tanggal, keterangan: 'Kredit Persediaan PPN', akunDebit: '', akunKredit: '1-1410', debit: 0, kredit: hppPPN, isManual: false, tipeJurnal: 'Otomatis' });
                }
            });

            // Jurnal Otomatis Pembelian Stok
            results[2].forEach(function(doc) {
                var b = doc.data();
                var valNonPPN = 0, valPPNGross = 0;
                if (b.items) {
                    b.items.forEach(function(it) {
                        if (it.isPPN) valPPNGross += (it.jumlah * it.hargaBeli);
                        else valNonPPN += (it.jumlah * it.hargaBeli);
                    });
                }
                
                // FIX #4: PPN Masukan dihitung dari Harga Beli (Gross)
                var ppnMasukan = Math.round(valPPNGross - (valPPNGross / 1.11));
                var valPersediaanPPN = valPPNGross - ppnMasukan;

                if (valNonPPN > 0) self.dataJurnal.push({ tanggal: b.tanggal, keterangan: 'Beli Stok Non-PPN', akunDebit: '1-1400', akunKredit: '', debit: valNonPPN, kredit: 0, isManual: false, tipeJurnal: 'Otomatis' });
                if (valPersediaanPPN > 0) self.dataJurnal.push({ tanggal: b.tanggal, keterangan: 'Beli Stok PPN', akunDebit: '1-1410', akunKredit: '', debit: valPersediaanPPN, kredit: 0, isManual: false, tipeJurnal: 'Otomatis' });
                if (ppnMasukan > 0) self.dataJurnal.push({ tanggal: b.tanggal, keterangan: 'PPN Masukan', akunDebit: '2-1200', akunKredit: '', debit: ppnMasukan, kredit: 0, isManual: false, tipeJurnal: 'Otomatis' });

                var akunKredit = b.metodeBayar === 'kredit' ? '2-1100' : (b.metodeBayar === 'cash' ? '1-1100' : '1-1200');
                self.dataJurnal.push({ tanggal: b.tanggal, keterangan: 'Pembayaran ke Supplier', akunDebit: '', akunKredit: akunKredit, debit: 0, kredit: b.totalTagihan || 0, isManual: false, tipeJurnal: 'Otomatis' });
            });

            // Jurnal Otomatis Pengeluaran Kas
            results[1].forEach(function(doc) {
                var p = doc.data();
                
                // FIX #5: Skip gaji & tunjangan di kasKeluar agar tidak double dengan penggajian
                if (p.kategori === 'gaji' || p.kategori === 'tunjangan') return; 
                
                var akunBeban = '5-2300'; // Default Operasional
                self.dataJurnal.push({ tanggal: p.tanggal, keterangan: p.keterangan, akunDebit: akunBeban, akunKredit: '', debit: p.jumlah || 0, kredit: 0, isManual: false, tipeJurnal: 'Otomatis' });
                self.dataJurnal.push({ tanggal: p.tanggal, keterangan: 'Kas Keluar', akunDebit: '', akunKredit: '1-1100', debit: 0, kredit: p.jumlah || 0, isManual: false, tipeJurnal: 'Otomatis' });
            });

            // Jurnal Otomatis Penggajian
            results[3].forEach(function(doc) {
                var g = doc.data();
                var totalGaji = 0, totalTunjangan = 0;
                if (g.dataPenggajian) {
                    g.dataPenggajian.forEach(function(dp) {
                        totalGaji += dp.totalGaji || 0;
                        totalTunjangan += dp.totalTunjangan || 0;
                    });
                }
                if(totalGaji > 0) self.dataJurnal.push({ tanggal: g.tanggal, keterangan: 'Pembayaran Gaji', akunDebit: '5-2100', akunKredit: '', debit: totalGaji, kredit: 0, isManual: false, tipeJurnal: 'Otomatis' });
                if(totalTunjangan > 0) self.dataJurnal.push({ tanggal: g.tanggal, keterangan: 'Pembayaran Tunjangan', akunDebit: '5-2200', akunKredit: '', debit: totalTunjangan, kredit: 0, isManual: false, tipeJurnal: 'Otomatis' });
                if(totalGaji > 0 || totalTunjangan > 0) self.dataJurnal.push({ tanggal: g.tanggal, keterangan: 'Kas Keluar Payroll', akunDebit: '', akunKredit: '1-1100', debit: 0, kredit: totalGaji + totalTunjangan, isManual: false, tipeJurnal: 'Otomatis' });
            });

            // Jurnal Manual
            results[4].forEach(function(doc) {
                var j = doc.data(); j.id = doc.id; j.isManual = true; j.tipeJurnal = j.isJurnalPenutup ? 'Penutup' : 'Manual';
                self.dataJurnal.push(j);
            });

            self.switchTab('jurnal');
        }).catch(function(err) {
            Utils.toast('Gagal memuat data akuntansi: ' + err.message, 'error');
            console.error(err);
        });
    },

    switchTab: function(tab) {
        var tabs = ['jurnal', 'bukuBesar', 'neracaSaldo', 'labaRugi', 'neraca', 'penutup', 'saldoAwal'];
        var self = this;
        tabs.forEach(function(t) {
            var btn = document.getElementById('tab-' + t);
            if (btn) {
                btn.className = 'flex-1 min-w-max py-2 px-4 text-sm rounded-md text-slate-500 font-medium hover:text-primary-600';
                if (t === tab) btn.className = 'flex-1 min-w-max py-2 px-4 text-sm rounded-md bg-white dark:bg-slate-700 shadow-sm font-semibold text-primary-600';
            }
        });

        if (tab === 'jurnal') this.renderJurnalUmum();
        else if (tab === 'bukuBesar') this.renderBukuBesar();
        else if (tab === 'neracaSaldo') this.renderNeracaSaldo();
        else if (tab === 'labaRugi') this.renderLabaRugi();
        else if (tab === 'neraca') this.renderNeraca();
        else if (tab === 'penutup') this.renderJurnalPenutup();
        else if (tab === 'saldoAwal') this.renderSaldoAwal();
    },

    // ========== TAB 1: JURNAL UMUM ==========
    renderJurnalUmum: function() {
        var container = document.getElementById('akuntansi-content');
        var html = '<div class="flex justify-end mb-4 gap-2">';
        html += '<button onclick="AppKeuanganAkuntansi.openFormJurnal()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> Input Jurnal Manual</button>';
        html += '<button onclick="AppKeuanganAkuntansi.exportJurnalExcel()" class="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2"><i data-lucide="file-spreadsheet" class="w-4 h-4"></i> Export Excel</button>';
        html += '</div>';

        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border overflow-hidden overflow-x-auto">';
        html += '<table class="w-full text-xs"><thead><tr class="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase">';
        html += '<th class="px-3 py-3 text-left">Tanggal</th><th class="px-3 py-3 text-left">Keterangan</th><th class="px-3 py-3 text-left">Akun</th><th class="px-3 py-3 text-right">Debit</th><th class="px-3 py-3 text-right">Kredit</th><th class="px-3 py-3 text-center">Aksi</th>';
        html += '</tr></thead><tbody>';

        var sortedJurnal = this.dataJurnal.slice().sort(function(a,b) { return (a.tanggal || '').localeCompare(b.tanggal || ''); });
        sortedJurnal.forEach(function(j) {
            var namaDebit = j.akunDebit ? (AppKeuanganAkuntansi.COA[j.akunDebit] ? AppKeuanganAkuntansi.COA[j.akunDebit].nama : j.akunDebit) : '';
            var namaKredit = j.akunKredit ? (AppKeuanganAkuntansi.COA[j.akunKredit] ? AppKeuanganAkuntansi.COA[j.akunKredit].nama : j.akunKredit) : '';
            var akunDisplay = namaDebit ? '<span class="text-blue-600 font-medium">' + namaDebit + '</span>' : '<span class="text-purple-600 pl-4">' + namaKredit + '</span>';
            var badgeTipe = j.tipeJurnal === 'Penutup' ? '<span class="text-[10px] bg-red-100 text-red-600 px-1 rounded">Penutup</span>' : '';
            
            html += '<tr class="border-t border-slate-100 dark:border-slate-700">';
            html += '<td class="px-3 py-2 text-slate-500 whitespace-nowrap">' + (j.tanggal || '-') + '</td>';
            html += '<td class="px-3 py-2 text-gray-800 dark:text-white">' + Utils.escapeHtml(j.keterangan || '-') + ' ' + badgeTipe + '</td>';
            html += '<td class="px-3 py-2">' + akunDisplay + '</td>';
            html += '<td class="px-3 py-2 text-right text-slate-600">' + (j.debit > 0 ? Utils.formatRupiah(j.debit) : '-') + '</td>';
            html += '<td class="px-3 py-2 text-right text-slate-600">' + (j.kredit > 0 ? Utils.formatRupiah(j.kredit) : '-') + '</td>';
            html += '<td class="px-3 py-2 text-center">' + (j.isManual ? '<button onclick="AppKeuanganAkuntansi.hapusJurnal(\'' + j.id + '\')" class="text-red-500 hover:underline">Hapus</button>' : '-') + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
        lucide.createIcons();
    },

    openFormJurnal: function() {
        var optHtml = '';
        for (var key in this.COA) {
            optHtml += '<option value="' + key + '">' + key + ' - ' + this.COA[key].nama + '</option>';
        }
        var html = '<div class="p-6"><div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold">Input Jurnal Manual</h3><button onclick="Utils.closeModal()" class="text-slate-400"><i data-lucide="x" class="w-5 h-5"></i></button></div>';
        html += '<form id="form-jurnal" class="space-y-4">';
        html += '<div class="grid grid-cols-2 gap-4"><div><label class="block text-sm font-medium mb-1">Tanggal *</label><input type="date" id="jr-tanggal" required class="w-full px-3 py-2 border dark:bg-slate-700 dark:text-white rounded-lg text-sm" value="' + new Date().toISOString().split('T')[0] + '"></div>';
        html += '<div><label class="block text-sm font-medium mb-1">Keterangan *</label><input type="text" id="jr-ket" required class="w-full px-3 py-2 border dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div></div>';
        html += '<div class="grid grid-cols-2 gap-4"><div><label class="block text-sm font-medium mb-1">Akun Debit *</label><select id="jr-debit" class="w-full px-3 py-2 border dark:bg-slate-700 dark:text-white rounded-lg text-sm">' + optHtml + '</select></div>';
        html += '<div><label class="block text-sm font-medium mb-1">Akun Kredit *</label><select id="jr-kredit" class="w-full px-3 py-2 border dark:bg-slate-700 dark:text-white rounded-lg text-sm">' + optHtml + '</select></div></div>';
        html += '<div><label class="block text-sm font-medium mb-1">Nominal (Rp) *</label><input type="number" id="jr-nominal" required min="0" class="w-full px-3 py-2 border dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        html += '<div class="flex justify-end pt-4 border-t"><button type="submit" class="bg-primary-600 text-white font-semibold px-6 py-2 rounded-lg text-sm">Simpan</button></div></form></div>';
        
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
            isJurnalPenutup: false
        };
        if (obj.debit <= 0 || obj.akunDebit === obj.akunKredit) { Utils.toast('Input tidak valid', 'error'); return; }

        db.collection('jurnalManual').add(obj).then(function() {
            Utils.toast('Jurnal tersimpan!', 'success');
            Utils.closeModal();
            AppKeuanganAkuntansi.init();
        });
    },

    hapusJurnal: function(id) {
        if (!confirm('Hapus jurnal manual ini?')) return;
        db.collection('jurnalManual').doc(id).delete().then(function() {
            Utils.toast('Jurnal dihapus.', 'info');
            AppKeuanganAkuntansi.init();
        });
    },

    // ========== TAB 2: BUKU BESAR ==========
    renderBukuBesar: function() {
        var container = document.getElementById('akuntansi-content');
        var optHtml = '<option value="">-- Pilih Akun --</option>';
        for (var key in this.COA) {
            optHtml += '<option value="' + key + '">' + key + ' - ' + this.COA[key].nama + '</option>';
        }

        var html = '<div class="bg-white dark:bg-slate-800 p-4 rounded-xl border mb-4 flex gap-4 items-end">';
        html += '<div class="flex-1"><label class="block text-sm font-medium mb-1">Pilih Akun</label><select id="bb-akun" onchange="AppKeuanganAkuntansi.renderBukuBesarDetail()" class="w-full px-3 py-2 border dark:bg-slate-700 dark:text-white rounded-lg text-sm">' + optHtml + '</select></div>';
        html += '</div>';
        html += '<div id="bb-detail" class="bg-white dark:bg-slate-800 rounded-xl border overflow-hidden"><p class="text-slate-400 text-sm p-8 text-center">Silakan pilih akun untuk melihat mutasi.</p></div>';
        
        container.innerHTML = html;
    },

    renderBukuBesarDetail: function() {
        var akunId = document.getElementById('bb-akun').value;
        if (!akunId) return;
        var akun = this.COA[akunId];
        var saldo = 0;
        
        // FIX #9: Saldo awal dihitung terpisah dan benar
        this.dataSaldoAwal.forEach(function(sa) {
            if (sa.akunId === akunId) {
                saldo = (sa.tipe === 'debit') ? sa.nominal : -sa.nominal;
            }
        });

        var html = '<table class="w-full text-xs"><thead><tr class="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase">';
        html += '<th class="px-3 py-3 text-left">Tanggal</th><th class="px-3 py-3 text-left">Keterangan</th><th class="px-3 py-3 text-right">Debit</th><th class="px-3 py-3 text-right">Kredit</th><th class="px-3 py-3 text-right">Saldo</th>';
        html += '</tr></thead><tbody>';
        
        html += '<tr class="border-t font-bold"><td colspan="4" class="px-3 py-2">Saldo Awal</td><td class="px-3 py-2 text-right">' + Utils.formatRupiah(Math.abs(saldo)) + ' (' + (saldo >= 0 ? 'D' : 'K') + ')</td></tr>';

        this.dataJurnal.filter(function(j) { return j.akunDebit === akunId || j.akunKredit === akunId; }).sort(function(a,b){return (a.tanggal||'').localeCompare(b.tanggal||'');}).forEach(function(j) {
            var debit = j.akunDebit === akunId ? (j.debit || 0) : 0;
            var kredit = j.akunKredit === akunId ? (j.kredit || 0) : 0;
            saldo += (debit - kredit);
            
            html += '<tr class="border-t border-slate-100 dark:border-slate-700">';
            html += '<td class="px-3 py-2 text-slate-500">' + (j.tanggal || '-') + '</td>';
            html += '<td class="px-3 py-2 text-gray-800 dark:text-white">' + Utils.escapeHtml(j.keterangan || '-') + '</td>';
            html += '<td class="px-3 py-2 text-right text-blue-600">' + (debit > 0 ? Utils.formatRupiah(debit) : '-') + '</td>';
            html += '<td class="px-3 py-2 text-right text-purple-600">' + (kredit > 0 ? Utils.formatRupiah(kredit) : '-') + '</td>';
            html += '<td class="px-3 py-2 text-right font-medium">' + Utils.formatRupiah(Math.abs(saldo)) + ' (' + (saldo >= 0 ? 'D' : 'K') + ')</td>';
            html += '</tr>';
        });

        html += '</tbody></table>';
        document.getElementById('bb-detail').innerHTML = html;
    },

    // ========== TAB 3: NERACA SALDO ==========
    renderNeracaSaldo: function() {
        var container = document.getElementById('akuntansi-content');
        var saldos = this.hitungSaldoAkun();

        var totalD = 0, totalK = 0;
        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border overflow-hidden overflow-x-auto">';
        html += '<table class="w-full text-xs"><thead><tr class="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase">';
        html += '<th class="px-3 py-3 text-left">Kode</th><th class="px-3 py-3 text-left">Nama Akun</th><th class="px-3 py-3 text-right">Debit</th><th class="px-3 py-3 text-right">Kredit</th>';
        html += '</tr></thead><tbody>';

        for (var k in this.COA) {
            var d = saldos[k].debit;
            var c = saldos[k].kredit;
            if (d === 0 && c === 0) continue; 

            if (this.COA[k].saldoNormal === 'Debit') {
                var balD = d - c; totalD += balD > 0 ? balD : 0; totalK += balD < 0 ? Math.abs(balD) : 0;
                if(balD !== 0) html += '<tr class="border-t border-slate-100 dark:border-slate-700"><td class="px-3 py-2 font-mono">' + k + '</td><td class="px-3 py-2">' + this.COA[k].nama + '</td><td class="px-3 py-2 text-right">' + (balD > 0 ? Utils.formatRupiah(balD) : '-') + '</td><td class="px-3 py-2 text-right">' + (balD < 0 ? Utils.formatRupiah(Math.abs(balD)) : '-') + '</td></tr>';
            } else {
                var balK = c - d; totalK += balK > 0 ? balK : 0; totalD += balK < 0 ? Math.abs(balK) : 0;
                if(balK !== 0) html += '<tr class="border-t border-slate-100 dark:border-slate-700"><td class="px-3 py-2 font-mono">' + k + '</td><td class="px-3 py-2">' + this.COA[k].nama + '</td><td class="px-3 py-2 text-right">' + (balK < 0 ? Utils.formatRupiah(Math.abs(balK)) : '-') + '</td><td class="px-3 py-2 text-right">' + (balK > 0 ? Utils.formatRupiah(balK) : '-') + '</td></tr>';
            }
        }

        var isBalance = totalD === totalK;
        html += '<tr class="font-bold border-t-2 border-slate-200 ' + (isBalance ? 'text-emerald-600' : 'text-red-600') + '"><td colspan="2" class="px-3 py-3">TOTAL</td><td class="px-3 py-3 text-right">' + Utils.formatRupiah(totalD) + '</td><td class="px-3 py-3 text-right">' + Utils.formatRupiah(totalK) + '</td></tr>';
        if (!isBalance) html += '<tr class="bg-red-50 text-red-600 text-center"><td colspan="4" class="py-2 font-semibold">⚠️ Neraca Saldo Tidak Balance! Selisih: ' + Utils.formatRupiah(Math.abs(totalD - totalK)) + '</td></tr>';

        html += '</tbody></table></div>';
        container.innerHTML = html;
    },

    // ========== TAB 4: LAPORAN LABA RUGI ==========
    renderLabaRugi: function() {
        var container = document.getElementById('akuntansi-content');
        var saldos = this.hitungSaldoAkun();

        var penjNonPPN = saldos['4-1100'].kredit;
        var penjPPN = saldos['4-1200'].kredit;
        var jasaMedis = saldos['4-1300'].kredit;
        var jasaResep = saldos['4-1400'].kredit;
        var pendLain = saldos['4-1500'].kredit;
        
        var totalPendapatan = penjNonPPN + penjPPN + jasaMedis + jasaResep + pendLain;
        
        var hppNonPPN = saldos['5-1100'].debit;
        var hppPPN = saldos['5-1200'].debit;
        var totalHPP = hppNonPPN + hppPPN;
        
        var labaKotor = totalPendapatan - totalHPP;

        var bebanGaji = saldos['5-2100'].debit;
        var bebanTunjangan = saldos['5-2200'].debit;
        var bebanOp = saldos['5-2300'].debit;
        var bebanPenyusutan = saldos['5-2400'].debit;
        var bebanPPNMasuk = saldos['5-2500'].debit;
        var bebanLain = saldos['5-3000'].debit;
        var totalBebanOp = bebanGaji + bebanTunjangan + bebanOp + bebanPenyusutan + bebanPPNMasuk + bebanLain;

        var labaBersih = labaKotor - totalBebanOp;

        var html = '<div class="flex justify-end mb-4"><button onclick="AppKeuanganAkuntansi.exportPDF(\'labaRugi\')" class="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2"><i data-lucide="file-text" class="w-4 h-4"></i> Export PDF</button></div>';
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border p-6 max-w-3xl mx-auto">';
        html += '<h3 class="text-center font-bold text-lg mb-1">Laporan Laba Rugi</h3>';
        html += '<p class="text-center text-sm text-slate-500 mb-6">Periode: ' + this.currentMonth + '</p>';
        html += '<table class="w-full text-sm">';
        html += '<tr><td colspan="2" class="font-bold pb-2 text-slate-600 border-b">PENDAPATAN</td></tr>';
        html += '<tr><td class="py-1 pl-4">Penjualan Obat Non-PPN</td><td class="text-right">' + Utils.formatRupiah(penjNonPPN) + '</td></tr>';
        html += '<tr><td class="py-1 pl-4">Penjualan Obat PPN</td><td class="text-right">' + Utils.formatRupiah(penjPPN) + '</td></tr>';
        html += '<tr><td class="py-1 pl-4">Pendapatan Jasa Tindakan Medis</td><td class="text-right">' + Utils.formatRupiah(jasaMedis) + '</td></tr>';
        html += '<tr><td class="py-1 pl-4">Pendapatan Jasa Resep / Racik</td><td class="text-right">' + Utils.formatRupiah(jasaResep) + '</td></tr>';
        html += '<tr><td class="py-1 pl-4">Pendapatan Lain-lain</td><td class="text-right">' + Utils.formatRupiah(pendLain) + '</td></tr>';
        html += '<tr class="font-bold border-t"><td class="py-2">Total Pendapatan</td><td class="text-right">' + Utils.formatRupiah(totalPendapatan) + '</td></tr>';
        
        html += '<tr><td colspan="2" class="font-bold pt-4 pb-2 text-slate-600 border-b">HARGA POKOK PENJUALAN (HPP)</td></tr>';
        html += '<tr><td class="py-1 pl-4">HPP Obat Non-PPN</td><td class="text-right text-red-500">(-) ' + Utils.formatRupiah(hppNonPPN) + '</td></tr>';
        html += '<tr><td class="py-1 pl-4">HPP Obat PPN</td><td class="text-right text-red-500">(-) ' + Utils.formatRupiah(hppPPN) + '</td></tr>';
        html += '<tr class="font-bold border-t"><td class="py-2">Total HPP</td><td class="text-right text-red-500">(-) ' + Utils.formatRupiah(totalHPP) + '</td></tr>';
        
        html += '<tr class="font-bold text-lg text-primary-600 border-t-2"><td class="py-3">LABA KOTOR</td><td class="text-right">' + Utils.formatRupiah(labaKotor) + '</td></tr>';

        html += '<tr><td colspan="2" class="font-bold pt-4 pb-2 text-slate-600 border-b">BEBAN OPERASIONAL</td></tr>';
        html += '<tr><td class="py-1 pl-4">Beban Gaji Karyawan</td><td class="text-right text-red-500">(-) ' + Utils.formatRupiah(bebanGaji) + '</td></tr>';
        html += '<tr><td class="py-1 pl-4">Beban Tunjangan</td><td class="text-right text-red-500">(-) ' + Utils.formatRupiah(bebanTunjangan) + '</td></tr>';
        html += '<tr><td class="py-1 pl-4">Beban Operasional (Listrik, ATK)</td><td class="text-right text-red-500">(-) ' + Utils.formatRupiah(bebanOp) + '</td></tr>';
        html += '<tr><td class="py-1 pl-4">Beban Penyusutan Aset</td><td class="text-right text-red-500">(-) ' + Utils.formatRupiah(bebanPenyusutan) + '</td></tr>';
        html += '<tr><td class="py-1 pl-4">Beban PPN Masukan</td><td class="text-right text-red-500">(-) ' + Utils.formatRupiah(bebanPPNMasuk) + '</td></tr>';
        html += '<tr><td class="py-1 pl-4">Beban Lain-lain</td><td class="text-right text-red-500">(-) ' + Utils.formatRupiah(bebanLain) + '</td></tr>';
        html += '<tr class="font-bold border-t"><td class="py-2">Total Beban Operasional</td><td class="text-right text-red-500">(-) ' + Utils.formatRupiah(totalBebanOp) + '</td></tr>';

        html += '<tr class="font-bold text-lg ' + (labaBersih >= 0 ? 'text-emerald-600' : 'text-red-600') + ' border-t-2 border-slate-300"><td class="py-3">LABA BERSIH</td><td class="text-right">' + Utils.formatRupiah(labaBersih) + '</td></tr>';
        html += '</table></div>';

        container.innerHTML = html;
        lucide.createIcons();
    },

    // ========== TAB 5: NERACA ==========
    renderNeraca: function() {
        var container = document.getElementById('akuntansi-content');
        var saldos = this.hitungSaldoAkun();

        var totalPendapatan = saldos['4-1100'].kredit + saldos['4-1200'].kredit + saldos['4-1300'].kredit + saldos['4-1400'].kredit + saldos['4-1500'].kredit;
        var totalHPP = saldos['5-1100'].debit + saldos['5-1200'].debit;
        var totalBebanOp = saldos['5-2100'].debit + saldos['5-2200'].debit + saldos['5-2300'].debit + saldos['5-2400'].debit + saldos['5-2500'].debit + saldos['5-3000'].debit;
        var labaBersih = totalPendapatan - totalHPP - totalBebanOp;

        var html = '<div class="flex justify-end mb-4"><button onclick="AppKeuanganAkuntansi.exportPDF(\'neraca\')" class="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2"><i data-lucide="file-text" class="w-4 h-4"></i> Export PDF</button></div>';
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border p-6 max-w-4xl mx-auto">';
        html += '<h3 class="text-center font-bold text-lg mb-1">Neraca (Balance Sheet)</h3>';
        html += '<p class="text-center text-sm text-slate-500 mb-6">Per ' + new Date().toLocaleDateString('id-ID') + '</p>';
        html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-8">';
        
        var totalAset = 0;
        html += '<div><h4 class="font-bold text-slate-600 border-b pb-2 mb-2">ASET</h4><table class="w-full text-sm">';
        for (var k in this.COA) {
            if (this.COA[k].kategori === 'Aset') {
                var bal = saldos[k].debit - saldos[k].kredit;
                if (bal !== 0) {
                    totalAset += bal;
                    html += '<tr><td class="py-1 pl-4">' + this.COA[k].nama + '</td><td class="text-right">' + Utils.formatRupiah(bal) + '</td></tr>';
                }
            }
        }
        html += '<tr class="font-bold border-t-2"><td class="py-2">Total Aset</td><td class="text-right">' + Utils.formatRupiah(totalAset) + '</td></tr></table></div>';

        var totalKewajiban = 0, totalEkuitas = 0;
        html += '<div><h4 class="font-bold text-slate-600 border-b pb-2 mb-2">KEWAJIBAN & EKUITAS</h4><table class="w-full text-sm">';
        html += '<tr><td colspan="2" class="font-semibold text-slate-500 pt-2">Kewajiban</td></tr>';
        for (var k2 in this.COA) {
            if (this.COA[k2].kategori === 'Kewajiban') {
                var balK = saldos[k2].kredit - saldos[k2].debit;
                if (balK !== 0) {
                    totalKewajiban += balK;
                    html += '<tr><td class="py-1 pl-4">' + this.COA[k2].nama + '</td><td class="text-right">' + Utils.formatRupiah(balK) + '</td></tr>';
                }
            }
        }
        
        html += '<tr><td colspan="2" class="font-semibold text-slate-500 pt-4">Ekuitas</td></tr>';
        var modal = saldos['3-1000'].kredit - saldos['3-1000'].debit;
        var prive = saldos['3-2000'].debit - saldos['3-2000'].kredit;
        var labaDitahan = saldos['3-3000'].kredit - saldos['3-3000'].debit;
        
        if(modal !== 0) { html += '<tr><td class="py-1 pl-4">Modal Pemilik</td><td class="text-right">' + Utils.formatRupiah(modal) + '</td></tr>'; totalEkuitas += modal; }
        if(prive !== 0) { html += '<tr><td class="py-1 pl-4">Prive Pemilik</td><td class="text-right text-red-500">(-) ' + Utils.formatRupiah(prive) + '</td></tr>'; totalEkuitas -= prive; }
        if(labaDitahan !== 0) { html += '<tr><td class="py-1 pl-4">Laba Ditahan</td><td class="text-right">' + Utils.formatRupiah(labaDitahan) + '</td></tr>'; totalEkuitas += labaDitahan; }
        
        html += '<tr><td class="py-1 pl-4">Laba Periode Berjalan</td><td class="text-right ' + (labaBersih >= 0 ? 'text-emerald-500' : 'text-red-500') + '">' + Utils.formatRupiah(labaBersih) + '</td></tr>';
        totalEkuitas += labaBersih;

        var totalPasiva = totalKewajiban + totalEkuitas;
        html += '<tr class="font-bold border-t-2"><td class="py-2">Total Kewajiban & Ekuitas</td><td class="text-right">' + Utils.formatRupiah(totalPasiva) + '</td></tr>';
        html += '</table></div>';

        html += '</div>';
        
        if (Math.abs(totalAset - totalPasiva) > 100) { 
            html += '<div class="mt-6 bg-red-50 text-red-600 p-4 rounded-lg text-center font-semibold">⚠️ NERACA TIDAK BALANCE! <br>Aset: ' + Utils.formatRupiah(totalAset) + ' vs Pasiva: ' + Utils.formatRupiah(totalPasiva) + '</div>';
        }

        container.innerHTML = html;
        lucide.createIcons();
    },

    // ========== TAB 6: JURNAL PENUTUP ==========
    renderJurnalPenutup: function() {
        var container = document.getElementById('akuntansi-content');
        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border p-6 max-w-2xl mx-auto">';
        html += '<h3 class="font-bold text-lg mb-2">Jurnal Penutup Akhir Periode</h3>';
        html += '<p class="text-sm text-slate-500 mb-4">Proses ini akan menutup semua akun nominal (Pendapatan & Beban) ke akun Ikhtisar L/R (3-9000), lalu memindahkan saldonya ke Laba Ditahan (3-3000). Prive (3-2000) ditutup ke Modal (3-1000).</p>';
        
        html += '<div class="bg-amber-50 border border-amber-200 p-4 rounded-lg text-sm text-amber-700 mb-4"><p class="font-semibold">⚠️ Peringatan:</p><p>Pastikan semua transaksi bulan ini sudah diinput. Sistem mencegah double-posting.</p></div>';

        html += '<button onclick="AppKeuanganAkuntansi.postingJurnalPenutup()" class="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm w-full">Posting Jurnal Penutup Periode ' + this.currentMonth + '</button>';
        html += '</div>';

        container.innerHTML = html;
        lucide.createIcons();
    },

    postingJurnalPenutup: function() {
        var self = this;
        var bulan = this.currentMonth;
        
        db.collection('jurnalManual').where('isJurnalPenutup', '==', true).where('tanggal', '>=', bulan + '-01').where('tanggal', '<=', bulan + '-31').get().then(function(snap) {
            if (!snap.empty) {
                Utils.toast('Jurnal penutup untuk periode ini sudah pernah dibuat!', 'error');
                return;
            }

            var saldos = self.hitungSaldoAkun();
            var batch = db.batch();
            var parts = bulan.split('-');
            var tanggalAkhir = new Date(parts[0], parts[1], 0).toISOString().slice(0, 10);

            var totalPendapatan = 0;
            var totalBeban = 0;

            // 1. Tutup Pendapatan (Debit Pendapatan, Kredit Ikhtisar L/R)
            for (var k in self.COA) {
                if (self.COA[k].kategori === 'Pendapatan') {
                    var balK = saldos[k].kredit - saldos[k].debit;
                    if (balK > 0) {
                        totalPendapatan += balK;
                        var ref1 = db.collection('jurnalManual').doc();
                        batch.set(ref1, { tanggal: tanggalAkhir, keterangan: 'Tutup Pendapatan ' + self.COA[k].nama, akunDebit: k, akunKredit: '3-9000', debit: balK, kredit: balK, isJurnalPenutup: true, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                    }
                }
            }

            // 2. Tutup Beban (Debit Ikhtisar L/R, Kredit Beban)
            for (var k2 in self.COA) {
                if (self.COA[k2].kategori === 'Beban') {
                    var balD = saldos[k2].debit - saldos[k2].kredit;
                    if (balD > 0) {
                        totalBeban += balD;
                        var ref2 = db.collection('jurnalManual').doc();
                        batch.set(ref2, { tanggal: tanggalAkhir, keterangan: 'Tutup Beban ' + self.COA[k2].nama, akunDebit: '3-9000', akunKredit: k2, debit: balD, kredit: balD, isJurnalPenutup: true, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                    }
                }
            }

            // 3. Tutup Ikhtisar L/R ke Laba Ditahan
            var labaBersih = totalPendapatan - totalBeban;
            if (labaBersih !== 0) {
                var ref3 = db.collection('jurnalManual').doc();
                if (labaBersih > 0) { // Untung
                    batch.set(ref3, { tanggal: tanggalAkhir, keterangan: 'Tutup Ikhtisar L/R (Laba)', akunDebit: '3-9000', akunKredit: '3-3000', debit: labaBersih, kredit: labaBersih, isJurnalPenutup: true, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                } else { // Rugi
                    batch.set(ref3, { tanggal: tanggalAkhir, keterangan: 'Tutup Ikhtisar L/R (Rugi)', akunDebit: '3-3000', akunKredit: '3-9000', debit: Math.abs(labaBersih), kredit: Math.abs(labaBersih), isJurnalPenutup: true, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                }
            }

            // 4. Tutup Prive ke Modal
            var priveBal = saldos['3-2000'].debit - saldos['3-2000'].kredit;
            if (priveBal > 0) {
                var ref4 = db.collection('jurnalManual').doc();
                batch.set(ref4, { tanggal: tanggalAkhir, keterangan: 'Tutup Prive ke Modal', akunDebit: '3-1000', akunKredit: '3-2000', debit: priveBal, kredit: priveBal, isJurnalPenutup: true, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            }

            batch.commit().then(function() {
                Utils.toast('Jurnal penutup berhasil diposting!', 'success');
                self.init();
            }).catch(function(err) {
                Utils.toast('Gagal posting: ' + err.message, 'error');
            });
        });
    },

    // ========== TAB 7: SALDO AWAL ==========
    renderSaldoAwal: function() {
        var container = document.getElementById('akuntansi-content');
        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border p-6 max-w-3xl mx-auto">';
        html += '<h3 class="font-bold text-lg mb-2">Input Saldo Awal</h3>';
        html += '<p class="text-sm text-slate-500 mb-4">Masukkan saldo awal untuk semua akun (hanya diisi sekali saat migrasi sistem). Saldo awal akan otomatis terbawa di awal periode bulan ini.</p>';
        html += '<form id="form-saldo-awal" class="space-y-3">';
        
        for (var k in this.COA) {
            var existing = this.dataSaldoAwal.find(function(sa) { return sa.akunId === k; });
            var val = existing ? existing.nominal : 0;
            var tipe = existing ? existing.tipe : (this.COA[k].saldoNormal === 'Debit' ? 'debit' : 'kredit');
            
            html += '<div class="flex items-center gap-2">';
            html += '<span class="font-mono text-xs w-20">' + k + '</span>';
            html += '<span class="text-sm flex-1">' + this.COA[k].nama + '</span>';
            html += '<select id="sa-tipe-' + k + '" class="px-2 py-1 border dark:bg-slate-700 dark:text-white rounded text-xs">';
            html += '<option value="debit" ' + (tipe === 'debit' ? 'selected' : '') + '>Debit</option>';
            html += '<option value="kredit" ' + (tipe === 'kredit' ? 'selected' : '') + '>Kredit</option></select>';
            html += '<input type="number" id="sa-nominal-' + k + '" value="' + val + '" class="w-32 px-2 py-1 border dark:bg-slate-700 dark:text-white rounded text-sm text-right">';
            html += '</div>';
        }
        html += '<button type="submit" class="bg-primary-600 text-white font-semibold px-6 py-2.5 rounded-lg text-sm w-full mt-4">Simpan Saldo Awal</button>';
        html += '</form></div>';
        
        container.innerHTML = html;
        var self = this;
        setTimeout(function() {
            document.getElementById('form-saldo-awal').addEventListener('submit', function(e) {
                e.preventDefault();
                self.simpanSaldoAwal();
            });
        }, 100);
    },

    simpanSaldoAwal: function() {
        var self = this;
        var batch = db.batch();
        var periode = this.currentMonth;

        // FIX #11: Validasi konfirmasi sebelum hapus/timpa data
        if (!confirm('PERINGATAN: Data saldo awal periode ' + periode + ' akan ditimpa. Lanjutkan?')) return;

        this.dataSaldoAwal.forEach(function(sa) {
            if (sa.periode === periode) batch.delete(db.collection('saldoAwal').doc(sa.id));
        });

        for (var k in this.COA) {
            var nominal = parseFloat(document.getElementById('sa-nominal-' + k).value) || 0;
            var tipe = document.getElementById('sa-tipe-' + k).value;
            if (nominal > 0) {
                var ref = db.collection('saldoAwal').doc();
                batch.set(ref, { akunId: k, nominal: nominal, tipe: tipe, periode: periode, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            }
        }

        batch.commit().then(function() {
            Utils.toast('Saldo awal tersimpan!', 'success');
            self.init();
        });
    },

    // ========== HELPER FUNCTIONS ==========
    // FIX #3: hitungSaldoAkun menginclude Saldo Awal
    hitungSaldoAkun: function() {
        var saldos = {};
        for (var key in this.COA) saldos[key] = { debit: 0, kredit: 0 };

        // 1. Init dengan Saldo Awal
        this.dataSaldoAwal.forEach(function(sa) {
            if (saldos[sa.akunId]) {
                if (sa.tipe === 'debit') saldos[sa.akunId].debit += sa.nominal;
                else saldos[sa.akunId].kredit += sa.nominal;
            }
        });

        // 2. Tambahkan dengan Jurnal
        this.dataJurnal.forEach(function(j) {
            if (j.akunDebit && saldos[j.akunDebit]) saldos[j.akunDebit].debit += (j.debit || 0);
            if (j.akunKredit && saldos[j.akunKredit]) saldos[j.akunKredit].kredit += (j.kredit || 0);
        });
        return saldos;
    },

    // FIX #10: Export Excel Jurnal menampilkan Tipe Jurnal
    exportJurnalExcel: function() {
        var data = [['Tanggal', 'Keterangan', 'Akun', 'Debit', 'Kredit', 'Tipe Jurnal']];
        var sortedJurnal = this.dataJurnal.slice().sort(function(a,b) { return (a.tanggal || '').localeCompare(b.tanggal || ''); });
        
        sortedJurnal.forEach(function(j) {
            var namaDebit = j.akunDebit ? (AppKeuanganAkuntansi.COA[j.akunDebit] ? AppKeuanganAkuntansi.COA[j.akunDebit].nama : j.akunDebit) : '';
            var namaKredit = j.akunKredit ? (AppKeuanganAkuntansi.COA[j.akunKredit] ? AppKeuanganAkuntansi.COA[j.akunKredit].nama : j.akunKredit) : '';
            data.push([j.tanggal, j.keterangan, namaDebit || namaKredit, j.debit || 0, j.kredit || 0, j.tipeJurnal || 'Otomatis']);
        });

        var ws = XLSX.utils.aoa_to_sheet(data);
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Jurnal Umum");
        XLSX.writeFile(wb, "Jurnal_Umum_" + this.currentMonth + ".xlsx");
        Utils.toast('Excel berhasil diexport!', 'success');
    },

    exportPDF: function(tipe) {
        const { jsPDF } = window.jspdf;
        var doc = new jsPDF();
        var saldos = this.hitungSaldoAkun();

        if (tipe === 'labaRugi') {
            doc.text("Laporan Laba Rugi - Aulia Apotek Klinik", 105, 15, { align: 'center' });
            doc.text("Periode: " + this.currentMonth, 105, 22, { align: 'center' });
            
            var totalPendapatan = saldos['4-1100'].kredit + saldos['4-1200'].kredit + saldos['4-1300'].kredit + saldos['4-1400'].kredit + saldos['4-1500'].kredit;
            var totalHPP = saldos['5-1100'].debit + saldos['5-1200'].debit;
            var totalBebanOp = saldos['5-2100'].debit + saldos['5-2200'].debit + saldos['5-2300'].debit + saldos['5-2400'].debit + saldos['5-2500'].debit + saldos['5-3000'].debit;
            var labaBersih = totalPendapatan - totalHPP - totalBebanOp;

            doc.autoTable({
                startY: 30, head: [['Deskripsi', 'Nominal (Rp)']],
                body: [
                    ['PENDAPATAN', ''],
                    ['Penjualan Obat Non-PPN', Utils.formatRupiah(saldos['4-1100'].kredit)],
                    ['Penjualan Obat PPN', Utils.formatRupiah(saldos['4-1200'].kredit)],
                    ['Pendapatan Tindakan Medis', Utils.formatRupiah(saldos['4-1300'].kredit)],
                    ['Pendapatan Jasa Resep/Racik', Utils.formatRupiah(saldos['4-1400'].kredit)],
                    [{ content: 'Total Pendapatan', styles: { fontStyle: 'bold' } }, { content: Utils.formatRupiah(totalPendapatan), styles: { fontStyle: 'bold' } }],
                    ['HPP', ''],
                    ['HPP Obat Non-PPN', '(-) ' + Utils.formatRupiah(saldos['5-1100'].debit)],
                    ['HPP Obat PPN', '(-) ' + Utils.formatRupiah(saldos['5-1200'].debit)],
                    [{ content: 'Total HPP', styles: { fontStyle: 'bold' } }, { content: '(-) ' + Utils.formatRupiah(totalHPP), styles: { fontStyle: 'bold' } }],
                    [{ content: 'LABA KOTOR', styles: { fontStyle: 'bold' } }, { content: Utils.formatRupiah(totalPendapatan - totalHPP), styles: { fontStyle: 'bold' } }],
                    ['BEBAN OPERASIONAL', ''],
                    ['Beban Gaji', '(-) ' + Utils.formatRupiah(saldos['5-2100'].debit)],
                    ['Beban Tunjangan', '(-) ' + Utils.formatRupiah(saldos['5-2200'].debit)],
                    ['Beban Operasional', '(-) ' + Utils.formatRupiah(saldos['5-2300'].debit)],
                    ['Beban Penyusutan', '(-) ' + Utils.formatRupiah(saldos['5-2400'].debit)],
                    ['Beban Lain-lain', '(-) ' + Utils.formatRupiah(saldos['5-3000'].debit)],
                    [{ content: 'Total Beban', styles: { fontStyle: 'bold' } }, { content: '(-) ' + Utils.formatRupiah(totalBebanOp), styles: { fontStyle: 'bold' } }],
                    [{ content: 'LABA BERSIH', styles: { fontStyle: 'bold', fillColor: [22, 163, 74], textColor: 255 } }, { content: Utils.formatRupiah(labaBersih), styles: { fontStyle: 'bold', fillColor: [22, 163, 74], textColor: 255 } }]
                ], theme: 'grid', headStyles: { fillColor: [37, 99, 235] }
            });
            doc.save("Laba_Rugi_" + this.currentMonth + ".pdf");
        } else if (tipe === 'neraca') {
            doc.text("Neraca - Aulia Apotek Klinik", 105, 15, { align: 'center' });
            doc.text("Per " + new Date().toLocaleDateString('id-ID'), 105, 22, { align: 'center' });

            var totalAset = 0; var bodyAset = [];
            for (var k in this.COA) {
                if (this.COA[k].kategori === 'Aset') {
                    var bal = saldos[k].debit - saldos[k].kredit;
                    if (bal !== 0) { totalAset += bal; bodyAset.push([this.COA[k].nama, Utils.formatRupiah(bal)]); }
                }
            }
            bodyAset.push([{ content: 'Total Aset', styles: { fontStyle: 'bold' } }, { content: Utils.formatRupiah(totalAset), styles: { fontStyle: 'bold' } }]);
            doc.autoTable({ startY: 30, head: [['ASET', 'Nominal (Rp)']], body: bodyAset, theme: 'grid', headStyles: { fillColor: [37, 99, 235] } });

            var totalKewajiban = 0, totalEkuitas = 0; var bodyPasiva = [];
            bodyPasiva.push([{ content: 'KEWAJIBAN', styles: { fontStyle: 'bold' } }, '']);
            for (var k2 in this.COA) {
                if (this.COA[k2].kategori === 'Kewajiban') {
                    var balK = saldos[k2].kredit - saldos[k2].debit;
                    if (balK !== 0) { totalKewajiban += balK; bodyPasiva.push([this.COA[k2].nama, Utils.formatRupiah(balK)]); }
                }
            }
            bodyPasiva.push([{ content: 'EKUITAS', styles: { fontStyle: 'bold' } }, '']);
            var modal = saldos['3-1000'].kredit - saldos['3-1000'].debit;
            var prive = saldos['3-2000'].debit - saldos['3-2000'].kredit;
            var labaDitahan = saldos['3-3000'].kredit - saldos['3-3000'].debit;
            var totalPendapatan2 = saldos['4-1100'].kredit + saldos['4-1200'].kredit + saldos['4-1300'].kredit + saldos['4-1400'].kredit + saldos['4-1500'].kredit;
            var totalHPP2 = saldos['5-1100'].debit + saldos['5-1200'].debit;
            var totalBebanOp2 = saldos['5-2100'].debit + saldos['5-2200'].debit + saldos['5-2300'].debit + saldos['5-2400'].debit + saldos['5-2500'].debit + saldos['5-3000'].debit;
            var labaBersih2 = totalPendapatan2 - totalHPP2 - totalBebanOp2;

            if(modal !== 0) { bodyPasiva.push(['Modal Pemilik', Utils.formatRupiah(modal)]); totalEkuitas += modal; }
            if(prive !== 0) { bodyPasiva.push(['Prive Pemilik', '(-) ' + Utils.formatRupiah(prive)]); totalEkuitas -= prive; }
            if(labaDitahan !== 0) { bodyPasiva.push(['Laba Ditahan', Utils.formatRupiah(labaDitahan)]); totalEkuitas += labaDitahan; }
            bodyPasiva.push(['Laba Periode Berjalan', Utils.formatRupiah(labaBersih2)]); totalEkuitas += labaBersih2;
            bodyPasiva.push([{ content: 'Total Kewajiban & Ekuitas', styles: { fontStyle: 'bold' } }, { content: Utils.formatRupiah(totalKewajiban + totalEkuitas), styles: { fontStyle: 'bold' } }]);
            doc.autoTable({ startY: doc.lastAutoTable.finalY + 10, head: [['KEWAJIBAN & EKUITAS', 'Nominal (Rp)']], body: bodyPasiva, theme: 'grid', headStyles: { fillColor: [37, 99, 235] } });
            doc.save("Neraca_" + this.currentMonth + ".pdf");
        }
        Utils.toast('PDF berhasil diexport!', 'success');
    }
};
