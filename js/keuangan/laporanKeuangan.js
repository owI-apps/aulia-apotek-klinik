/**
 * js/keuangan/laporanKeuangan.js
 * Laporan Keuangan (Laba/Rugi & Arus Kas) - Hanya PSA/Keuangan
 */

window.AppKeuanganLaporanKeuangan = {
    dataTransaksi: [],
    dataPengeluaran: [],
    dataPembelian: [],

    render: function() {
        var d = new Date();
        var defaultMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');

        var html = '<div class="page-enter max-w-6xl">';
        html += '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '    <div>';
        html += '      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Laporan Keuangan</h2>';
        html += '      <p class="text-sm text-slate-500 dark:text-slate-400">Rekap arus kas & laba rugi bulanan</p>';
        html += '    </div>';
        html += '    <div class="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">';
        html += '      <input type="month" id="filter-bulan" value="' + defaultMonth + '" class="px-3 py-1.5 bg-transparent dark:text-white text-sm rounded-md outline-none">';
        html += '      <button onclick="AppKeuanganLaporanKeuangan.init()" class="bg-primary-600 text-white text-sm px-4 py-1.5 rounded-md font-medium">Tampilkan</button>';
        html += '    </div>';
        html += '  </div>';
        
        html += '  <div id="laporan-content"><div class="flex justify-center py-20"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        var monthInput = document.getElementById('filter-bulan');
        if (!monthInput) return;
        
        var bulan = monthInput.value; // Format: YYYY-MM
        var startDate = bulan + '-01';
        var endDate = bulan + '-31';

        // Query semua data di bulan tersebut
        var pTrx = db.collection('transaksi').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get();
        var pKeluar = db.collection('kasKeluar').where('status', '==', 'approved').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get();
        var pBeli = db.collection('pembelian').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get();

        Promise.all([pTrx, pKeluar, pBeli]).then(function(results) {
            self.dataTransaksi = [];
            results[0].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.dataTransaksi.push(d); });

            self.dataPengeluaran = [];
            results[1].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.dataPengeluaran.push(d); });

            self.dataPembelian = [];
            results[2].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.dataPembelian.push(d); });

            self.renderReport();
        }).catch(function(err) {
            Utils.toast('Gagal memuat laporan: ' + err.message, 'error');
            console.error(err);
        });
    },

    renderReport: function() {
        var container = document.getElementById('laporan-content');
        var self = this;

        // 1. KALKULASI PENDAPATAN (Dari Transaksi)
        var totalOmzet = 0, totalHPP = 0, totalLabaKotor = 0;
        var totalTindakan = 0, totalRacik = 0, totalJasaResep = 0;
        var cashMasuk = 0, transferMasuk = 0, qrisMasuk = 0;

        this.dataTransaksi.forEach(function(t) {
            var omzetObat = t.items ? t.items.reduce(function(s, i) { return s + (i.jumlah * i.hargaJual); }, 0) : 0;
            var hppObat = t.items ? t.items.reduce(function(s, i) { return s + (i.jumlah * (i.hargaBeli || 0)); }, 0) : 0;
            
            totalOmzet += omzetObat + (t.totalRacik || 0) + (t.totalTindakan || 0) + (t.jasaResep || 0);
            totalHPP += hppObat;
            totalTindakan += (t.totalTindakan || 0);
            totalRacik += (t.totalRacik || 0);
            totalJasaResep += (t.jasaResep || 0);
            totalLabaKotor += (omzetObat - hppObat) + (t.totalRacik || 0) + (t.totalTindakan || 0) + (t.jasaResep || 0);

            if (t.metodeBayar === 'cash') cashMasuk += t.totalAkhir || 0;
            else if (t.metodeBayar === 'transfer') transferMasuk += t.totalAkhir || 0;
            else if (t.metodeBayar === 'qris') qrisMasuk += t.totalAkhir || 0;
        });

        // 2. KALKULASI PENGELUARAN
        var totalOperasional = 0, totalBeliTunai = 0, totalBeliKredit = 0;
        
        this.dataPengeluaran.forEach(function(p) {
            totalOperasional += p.jumlah || 0;
        });

        this.dataPembelian.forEach(function(b) {
            if (b.metodePembayaran === 'tunai') totalBeliTunai += b.totalHarga || 0;
            else totalBeliKredit += b.totalHarga || 0;
        });

        var totalKasKeluar = totalOperasional + totalBeliTunai;
        var labaBersih = totalLabaKotor - totalOperasional;

        // 3. RENDER UI
        var html = '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">';
        
        // Kartu 1: Ringkasan Laba Rugi
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">';
        html += '  <h3 class="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><i data-lucide="trending-up" class="w-5 h-5 text-emerald-500"></i> Ringkasan Laba/Rugi</h3>';
        html += '  <div class="space-y-3 text-sm">';
        html += '    <div class="flex justify-between"><span class="text-slate-500">Omzet Penjualan</span><span class="font-semibold text-gray-800 dark:text-white">' + Utils.formatRupiah(totalOmzet) + '</span></div>';
        html += '    <div class="flex justify-between pl-4 text-xs"><span class="text-slate-400">- Modal Obat (HPP)</span><span class="text-red-500">' + Utils.formatRupiah(totalHPP) + '</span></div>';
        html += '    <div class="flex justify-between pl-4 text-xs"><span class="text-slate-400">+ Tindakan & Jasa</span><span class="text-emerald-500">' + Utils.formatRupiah(totalTindakan + totalJasaResep) + '</span></div>';
        html += '    <div class="flex justify-between pl-4 text-xs"><span class="text-slate-400">+ Racik & Lainnya</span><span class="text-emerald-500">' + Utils.formatRupiah(totalRacik) + '</span></div>';
        html += '    <div class="flex justify-between border-t border-slate-100 pt-2"><span class="font-semibold text-slate-600 dark:text-slate-300">Laba Kotor</span><span class="font-bold text-primary-600">' + Utils.formatRupiah(totalLabaKotor) + '</span></div>';
        html += '    <div class="flex justify-between pl-4 text-xs"><span class="text-slate-400">- Biaya Operasional</span><span class="text-red-500">' + Utils.formatRupiah(totalOperasional) + '</span></div>';
        html += '    <div class="flex justify-between border-t-2 border-slate-200 pt-3 mt-2"><span class="font-bold text-gray-800 dark:text-white">LABA BERSIH</span><span class="font-bold text-lg ' + (labaBersih >= 0 ? 'text-emerald-600' : 'text-red-600') + '">' + Utils.formatRupiah(labaBersih) + '</span></div>';
        html += '  </div>';
        html += '</div>';

        // Kartu 2: Arus Kas (Cash Flow)
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">';
        html += '  <h3 class="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><i data-lucide="wallet" class="w-5 h-5 text-sky-500"></i> Arus Kas Bulan Ini</h3>';
        html += '  <div class="space-y-3 text-sm">';
        html += '    <div class="flex justify-between"><span class="text-slate-500">Kas Masuk (Cash)</span><span class="font-semibold text-emerald-500">' + Utils.formatRupiah(cashMasuk) + '</span></div>';
        html += '    <div class="flex justify-between"><span class="text-slate-500">Kas Masuk (Transfer)</span><span class="font-semibold text-emerald-500">' + Utils.formatRupiah(transferMasuk) + '</span></div>';
        html += '    <div class="flex justify-between"><span class="text-slate-500">Kas Masuk (QRIS)</span><span class="font-semibold text-emerald-500">' + Utils.formatRupiah(qrisMasuk) + '</span></div>';
        html += '    <div class="flex justify-between border-t border-slate-100 pt-2"><span class="font-semibold text-slate-600 dark:text-slate-300">Total Kas Masuk</span><span class="font-bold text-emerald-600">' + Utils.formatRupiah(cashMasuk + transferMasuk + qrisMasuk) + '</span></div>';
        html += '    <div class="flex justify-between mt-4"><span class="text-slate-500">Beli Obat Tunai</span><span class="text-red-500">' + Utils.formatRupiah(totalBeliTunai) + '</span></div>';
        html += '    <div class="flex justify-between"><span class="text-slate-500">Pengeluaran Operasional</span><span class="text-red-500">' + Utils.formatRupiah(totalOperasional) + '</span></div>';
        html += '    <div class="flex justify-between border-t-2 border-slate-200 pt-3 mt-2"><span class="font-bold text-gray-800 dark:text-white">TOTAL KAS KELUAR</span><span class="font-bold text-lg text-red-600">' + Utils.formatRupiah(totalKasKeluar) + '</span></div>';
        html += '  </div>';
        html += '</div>';
        html += '</div>';

        // Kartu 3: Hutang & Piutang Info
        html += '<div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 flex items-center gap-4 mb-6">';
        html += '  <i data-lucide="alert-circle" class="w-8 h-8 text-amber-500 flex-shrink-0"></i>';
        html += '  <div class="text-sm text-amber-700 dark:text-amber-400">';
        html += '    <p class="font-semibold">Total Pembelian Kredit Bulan Ini: ' + Utils.formatRupiah(totalBeliKredit) + '</p>';
        html += '    <p class="text-xs mt-1">*Pembelian kredit tidak mempengaruhi Arus Kas bulan ini, tapi akan mempengaruhi saat faktur dilunasi di modul Hutang Usaha.</p>';
        html += '  </div>';
        html += '</div>';

        // Tabel Rincian Transaksi
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '  <div class="p-4 border-b border-slate-200 dark:border-slate-700"><h3 class="font-semibold text-gray-800 dark:text-white">Rincian Transaksi Penjualan</h3></div>';
        html += '  <div class="overflow-x-auto max-h-96 overflow-y-auto">';
        html += '    <table class="w-full text-sm">';
        html += '      <thead class="bg-slate-50 dark:bg-slate-900 sticky top-0"><tr class="text-xs text-slate-500 uppercase">';
        html += '        <th class="px-4 py-3 text-left">Tanggal</th><th class="px-4 py-3 text-left">Pasien</th><th class="px-4 py-3 text-left">Tipe</th><th class="px-4 py-3 text-left">Bayar</th><th class="px-4 py-3 text-right">Total</th>';
        html += '      </tr></thead><tbody>';
        
        if (this.dataTransaksi.length === 0) {
            html += '<tr><td colspan="5" class="text-center py-6 text-slate-400">Tidak ada transaksi bulan ini.</td></tr>';
        } else {
            this.dataTransaksi.forEach(function(t) {
                html += '<tr class="border-t border-slate-100 dark:border-slate-700">';
                html += '<td class="px-4 py-3 text-xs text-slate-500">' + (t.tanggal || '-') + '</td>';
                html += '<td class="px-4 py-3 font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(t.namaPasien || 'Bebas') + '</td>';
                html += '<td class="px-4 py-3 text-xs"><span class="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">' + Utils.escapeHtml(t.tipe || '-') + '</span></td>';
                html += '<td class="px-4 py-3 text-xs uppercase">' + Utils.escapeHtml(t.metodeBayar || '-') + '</td>';
                html += '<td class="px-4 py-3 text-right font-semibold text-gray-800 dark:text-white">' + Utils.formatRupiah(t.totalAkhir) + '</td>';
                html += '</tr>';
            });
        }
        html += '      </tbody></table>';
        html += '  </div>';
        html += '</div>';

        container.innerHTML = html;
        lucide.createIcons();
    }
};
