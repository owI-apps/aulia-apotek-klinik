/**
 * js/dashboard.js
 * Dashboard Role-Based (Klinik, Apotek, Admin, Keuangan)
 */

window.AppDashboard = {
    render: function() {
        return [
            '<div class="page-enter">',
            '  <div id="dashboard-content"><div class="flex justify-center py-20"><div class="spinner"></div></div></div>',
            '</div>'
        ].join('');
    },

    init: function() {
        var role = window.currentRole || 'apotek';
        if (role === 'klinik') this.renderKlinik();
        else if (role === 'apotek') this.renderApotek();
        else if (role === 'admin') this.renderAdmin();
        else if (role === 'keuangan') this.renderKeuangan();
        else this.renderDefault();
    },

    // Helper kartu statistik
    card: function(title, value, icon, color, desc) {
        return '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm flex items-center gap-4">' +
            '<div class="w-12 h-12 rounded-full bg-' + color + '-100 dark:bg-' + color + '-900/30 flex items-center justify-center flex-shrink-0">' +
            '<i data-lucide="' + icon + '" class="w-6 h-6 text-' + color + '-600 dark:text-' + color + '-400"></i></div>' +
            '<div><p class="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">' + title + '</p>' +
            '<h3 class="text-xl font-bold text-gray-800 dark:text-white">' + value + '</h3>' +
            (desc ? '<p class="text-[10px] text-slate-400 mt-1">' + desc + '</p>' : '') + '</div></div>';
    },

    // ===== DASHBOARD KLINIK =====
    renderKlinik: function() {
        var self = this;
        var today = new Date().toISOString().split('T')[0];
        var pAntrian = db.collection('antrian').where('tanggal', '==', today).get();
        var pResep = db.collection('rekamMedis').where('status', '==', 'selesai').get();

        Promise.all([pAntrian, pResep]).then(function(results) {
            var menunggu = 0, dilayani = 0;
            results[0].forEach(function(doc) {
                var d = doc.data();
                if (d.status === 'menunggu') menunggu++;
                else if (d.status === 'dilayani') dilayani++;
            });

            var resepMenunggu = 0;
            results[1].forEach(function(doc) {
                var d = doc.data();
                if (!d.statusResep || d.statusResep === 'menunggu') resepMenunggu++;
            });

            var html = '<h2 class="text-xl font-bold text-gray-800 dark:text-white mb-4">Dashboard Klinik</h2>';
            html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">';
            html += self.card('Antrian Menunggu', menunggu + ' Pasien', 'clock', 'amber', 'Segera panggil pasien');
            html += self.card('Sedang Dilayani', dilayani + ' Pasien', 'activity', 'blue', 'Dalam ruang periksa');
            html += self.card('Resep Belum Diproses', resepMenunggu + ' Resep', 'file-text', 'rose', 'Menunggu di apotek');
            html += '</div>';

            html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border"><h3 class="font-bold mb-3 text-gray-800 dark:text-white">Aksi Cepat</h3>';
            html += '<button onclick="navigateTo(\'klinik/antrian\', \'Antrian\')" class="w-full bg-primary-600 text-white p-3 rounded-lg mb-2 flex items-center gap-2"><i data-lucide="list-ordered" class="w-4 h-4"></i> Buka Antrian</button>';
            html += '<button onclick="navigateTo(\'klinik/rekamMedis\', \'Rekam Medis\')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-lg flex items-center gap-2"><i data-lucide="file-heart" class="w-4 h-4"></i> Input Rekam Medis</button>';
            html += '</div></div>';

            document.getElementById('dashboard-content').innerHTML = html;
            lucide.createIcons();
        });
    },

    // ===== DASHBOARD APOTEK =====
    renderApotek: function() {
        var self = this;
        var today = new Date().toISOString().split('T')[0];
        var pTrx = db.collection('transaksi').where('tanggal', '==', today).get();
        var pObat = db.collection('obat').get();
        var pResep = db.collection('rekamMedis').where('status', '==', 'selesai').get();

        Promise.all([pTrx, pObat, pResep]).then(function(results) {
            var cash = 0, transfer = 0, qris = 0;
            results[0].forEach(function(doc) {
                var t = doc.data();
                if (t.metodeBayar === 'cash') cash += t.totalAkhir || 0;
                else if (t.metodeBayar === 'transfer') transfer += t.totalAkhir || 0;
                else if (t.metodeBayar === 'qris') qris += t.totalAkhir || 0;
            });

            var stokMenipis = 0;
            results[1].forEach(function(doc) {
                var o = doc.data();
                if ((o.stok || 0) <= (o.stokMinimum || 0)) stokMenipis++;
            });

            var resepMenunggu = 0;
            results[2].forEach(function(doc) {
                var d = doc.data();
                if (!d.statusResep || d.statusResep === 'menunggu') resepMenunggu++;
            });

            var html = '<h2 class="text-xl font-bold text-gray-800 dark:text-white mb-4">Dashboard Apotek</h2>';
            html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">';
            html += self.card('Kas Masuk (Cash)', Utils.formatRupiah(cash), 'banknote', 'green', 'Hari ini');
            html += self.card('Kas Masuk (Transfer)', Utils.formatRupiah(transfer), 'send', 'blue', 'Hari ini');
            html += self.card('Kas Masuk (QRIS)', Utils.formatRupiah(qris), 'qr-code', 'purple', 'Hari ini');
            html += self.card('Peringatan Stok', stokMenipis + ' Obat', 'alert-triangle', 'red', 'Stok menipis/Habis');
            html += '</div>';

            html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border"><h3 class="font-bold mb-3 text-gray-800 dark:text-white">Antrian Resep Dokter</h3>';
            html += '<p class="text-3xl font-bold text-rose-600 mb-2">' + resepMenunggu + ' Resep</p><p class="text-sm text-slate-500 mb-4">Pasien menunggu obat diracik.</p>';
            html += '<button onclick="navigateTo(\'apotek/transaksi\', \'Transaksi\')" class="w-full bg-primary-600 text-white p-3 rounded-lg flex items-center justify-center gap-2"><i data-lucide="shopping-cart" class="w-4 h-4"></i> Buka Kasir</button>';
            html += '</div>';

            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border"><h3 class="font-bold mb-3 text-gray-800 dark:text-white">Aksi Cepat</h3>';
            html += '<button onclick="navigateTo(\'apotek/pembelian\', \'Pembelian\')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-lg mb-2 flex items-center gap-2"><i data-lucide="truck" class="w-4 h-4"></i> Input Faktur Pembelian</button>';
            html += '<button onclick="navigateTo(\'apotek/stockOpname\', \'Stock Opname\')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-lg flex items-center gap-2"><i data-lucide="clipboard-check" class="w-4 h-4"></i> Ajukan Stock Opname</button>';
            html += '</div></div>';

            document.getElementById('dashboard-content').innerHTML = html;
            lucide.createIcons();
        });
    },

    // ===== DASHBOARD ADMIN =====
    renderAdmin: function() {
        var self = this;
        var today = new Date().toISOString().split('T')[0];
        var pAbsen = db.collection('absensi').where('tanggal', '==', today).get();
        var pKary = db.collection('karyawan').where('status', '==', 'aktif').get();
        var pSO = db.collection('stockOpnameRequests').where('status', '==', 'pending').get();
        var pKas = db.collection('kasKeluar').where('status', '==', 'pending').get();

        Promise.all([pAbsen, pKary, pSO, pKas]).then(function(results) {
            var sudahAbsen = results[0].size;
            var totalKary = results[1].size;
            var belumAbsen = totalKary - sudahAbsen;

            var html = '<h2 class="text-xl font-bold text-gray-800 dark:text-white mb-4">Dashboard Admin (Kepala)</h2>';
            html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">';
            html += self.card('Absensi Hari Ini', sudahAbsen + ' / ' + totalKary, 'calendar-check', 'blue', belumAbsen + ' karyawan belum absen');
            html += self.card('Pengajuan Stok Opname', results[2].size + ' Pengajuan', 'clipboard-check', 'amber', 'Menunggu approval');
            html += self.card('Pengajuan Kas Keluar', results[3].size + ' Pengajuan', 'wallet', 'purple', 'Menunggu approval');
            html += '</div>';

            html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border"><h3 class="font-bold mb-3 text-gray-800 dark:text-white">Approval Center</h3>';
            html += '<button onclick="navigateTo(\'apotek/stockOpname\', \'Stock Opname\')" class="w-full bg-amber-100 text-amber-700 p-3 rounded-lg mb-2 flex items-center gap-2"><i data-lucide="clipboard-check" class="w-4 h-4"></i> Review Stock Opname</button>';
            html += '<button onclick="navigateTo(\'laporan/pengeluaran\', \'Pengeluaran Kas\')" class="w-full bg-purple-100 text-purple-700 p-3 rounded-lg flex items-center gap-2"><i data-lucide="wallet" class="w-4 h-4"></i> Review Pengeluaran Kas</button>';
            html += '</div>';

            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border"><h3 class="font-bold mb-3 text-gray-800 dark:text-white">Manajemen Operasional</h3>';
            html += '<button onclick="navigateTo(\'manajemen/karyawan\', \'Karyawan\')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-lg mb-2 flex items-center gap-2"><i data-lucide="users" class="w-4 h-4"></i> Data Karyawan</button>';
            html += '<button onclick="navigateTo(\'apotek/obat\', \'Obat\')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-lg flex items-center gap-2"><i data-lucide="pill" class="w-4 h-4"></i> Master Obat & Stok</button>';
            html += '</div></div>';

            document.getElementById('dashboard-content').innerHTML = html;
            lucide.createIcons();
        });
    },

    // ===== DASHBOARD KEUANGAN =====
    renderKeuangan: function() {
        var self = this;
        var today = new Date().toISOString().split('T')[0];
        var startMonth = today.slice(0, 8) + '01';

        var pTrx = db.collection('transaksi').where('tanggal', '>=', startMonth).where('tanggal', '<=', today).get();
        var pKasKeluar = db.collection('kasKeluar').where('status', '==', 'approved').where('tanggal', '>=', startMonth).where('tanggal', '<=', today).get();
        var pBeli = db.collection('pembelian').where('metodePembayaran', '==', 'tunai').where('tanggal', '>=', startMonth).where('tanggal', '<=', today).get();
        var pHutangJatuhTempo = db.collection('pembelian').where('statusPelunasan', '!=', 'lunas').get();

        Promise.all([pTrx, pKasKeluar, pBeli, pHutangJatuhTempo]).then(function(results) {
            var omzetBulan = 0, hppBulan = 0;
            results[0].forEach(function(doc) {
                var t = doc.data();
                var omzet = t.items ? t.items.reduce(function(s, i) { return s + (i.jumlah * i.hargaJual); }, 0) : 0;
                var hpp = t.items ? t.items.reduce(function(s, i) { return s + (i.jumlah * (i.hargaBeli || 0)); }, 0) : 0;
                omzetBulan += omzet + (t.totalRacik || 0) + (t.totalTindakan || 0) + (t.jasaResep || 0);
                hppBulan += hpp;
            });

            var bebanOp = 0;
            results[1].forEach(function(doc) { bebanOp += doc.data().jumlah || 0; });

            var beliTunai = 0;
            results[2].forEach(function(doc) { beliTunai += doc.data().totalHarga || 0; });

            var labaKotor = omzetBulan - hppBulan;
            var labaBersih = labaKotor - bebanOp;

            var hutangAktif = results[3].size;

            var html = '<h2 class="text-xl font-bold text-gray-800 dark:text-white mb-4">Dashboard Keuangan (PSA)</h2>';
            html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">';
            html += self.card('Omzet Bulan Ini', Utils.formatRupiah(omzetBulan), 'trending-up', 'blue', 'Penjualan obat & jasa');
            html += self.card('Laba Kotor (MTD)', Utils.formatRupiah(labaKotor), 'coins', 'green', 'Omzet - HPP');
            html += self.card('Estimasi Laba Bersih', Utils.formatRupiah(labaBersih), 'piggy-bank', labaBersih >= 0 ? 'emerald' : 'red', 'Laba Kotor - Beban Op');
            html += self.card('Hutang Belum Lunas', hutangAktif + ' Faktur', 'file-text', 'amber', 'Perlu penyelesaian');
            html += '</div>';

            html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border"><h3 class="font-bold mb-3 text-gray-800 dark:text-white">Arus Kas Bulan Ini</h3>';
            html += '<div class="flex justify-between mb-2 text-sm"><span class="text-slate-500">Kas Masuk (Omzet)</span><span class="font-bold text-green-600">+ ' + Utils.formatRupiah(omzetBulan) + '</span></div>';
            html += '<div class="flex justify-between mb-2 text-sm"><span class="text-slate-500">Beli Obat Tunai</span><span class="font-bold text-red-600">- ' + Utils.formatRupiah(beliTunai) + '</span></div>';
            html += '<div class="flex justify-between mb-2 text-sm"><span class="text-slate-500">Beban Operasional</span><span class="font-bold text-red-600">- ' + Utils.formatRupiah(bebanOp) + '</span></div>';
            html += '<div class="flex justify-between border-t mt-2 pt-2 text-sm font-bold"><span>Net Cash Flow</span><span class="' + ((omzetBulan - beliTunai - bebanOp) >= 0 ? 'text-green-600' : 'text-red-600') + '">' + Utils.formatRupiah(omzetBulan - beliTunai - bebanOp) + '</span></div>';
            html += '</div>';

            html += '<div class="bg-white dark:bg-slate-800 p-5 rounded-xl border"><h3 class="font-bold mb-3 text-gray-800 dark:text-white">Aksi Keuangan</h3>';
            html += '<button onclick="navigateTo(\'keuangan/payroll\', \'Payroll\')" class="w-full bg-primary-600 text-white p-3 rounded-lg mb-2 flex items-center gap-2"><i data-lucide="calculator" class="w-4 h-4"></i> Proses Payroll</button>';
            html += '<button onclick="navigateTo(\'keuangan/akuntansi\', \'Akuntansi\')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-lg mb-2 flex items-center gap-2"><i data-lucide="book-open" class="w-4 h-4"></i> Buku Besar & Neraca</button>';
            html += '<button onclick="navigateTo(\'laporan/hutang\', \'Hutang Usaha\')" class="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-3 rounded-lg flex items-center gap-2"><i data-lucide="receipt" class="w-4 h-4"></i> Lunasi Hutang Usaha</button>';
            html += '</div></div>';

            document.getElementById('dashboard-content').innerHTML = html;
            lucide.createIcons();
        });
    },

    renderDefault: function() {
        document.getElementById('dashboard-content').innerHTML = '<div class="bg-white p-6 rounded-xl border text-center">Selamat datang di Aulia Apotek Klinik</div>';
    }
};
