/**
 * js/keuangan/payroll.js
 * Proses Payroll (Gaji & Pembagian Hasil) Bulanan
 */

window.AppKeuanganPayroll = {
    dataKaryawan: [],
    dataTransaksi: [],
    dataAbsensi: [],
    configGaji: null,
    configPembagian: null,
    kalkulasiGaji: [],

    render: function() {
        var d = new Date();
        var defaultMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');

        var html = '<div class="page-enter max-w-6xl">';
        html += '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '    <div>';
        html += '      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Payroll Karyawan</h2>';
        html += '      <p class="text-sm text-slate-500 dark:text-slate-400">Hitung gaji & pembagian hasil bulanan</p>';
        html += '    </div>';
        html += '    <div class="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">';
        html += '      <input type="month" id="filter-bulan-payroll" value="' + defaultMonth + '" class="px-3 py-1.5 bg-transparent dark:text-white text-sm rounded-md outline-none">';
        html += '      <button onclick="AppKeuanganPayroll.init()" class="bg-primary-600 text-white text-sm px-4 py-1.5 rounded-md font-medium">Hitung</button>';
        html += '    </div>';
        html += '  </div>';
        
        html += '  <div id="payroll-content"><div class="flex justify-center py-20"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var self = this;
        var role = window.currentRole || 'apotek';
        
        // Keamanan Matrix: Hanya Keuangan yang bisa akses
        if (role !== 'keuangan') {
            document.getElementById('payroll-content').innerHTML = '<div class="bg-red-50 text-red-600 p-4 rounded-lg text-center font-semibold">Akses Ditolak. Halaman ini khusus Keuangan/PSA.</div>';
            return;
        }

        var monthInput = document.getElementById('filter-bulan-payroll');
        if (!monthInput) return;
        var bulan = monthInput.value; // Format: YYYY-MM
        var startDate = bulan + '-01';
        var endDate = bulan + '-31';

        // Fetch semua data yang dibutuhkan
        var pKary = db.collection('karyawan').where('status', '==', 'aktif').get();
        var pTrx = db.collection('transaksi').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get();
        var pAbsen = db.collection('absensi').where('tanggal', '>=', startDate).where('tanggal', '<=', endDate).get();
        var pCfgGaji = db.collection('pengaturanGaji').doc('global').get();
        var pCfgBagi = db.collection('pengaturanPembagian').doc('global').get();

        Promise.all([pKary, pTrx, pAbsen, pCfgGaji, pCfgBagi]).then(function(results) {
            self.dataKaryawan = [];
            results[0].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.dataKaryawan.push(d); });

            self.dataTransaksi = [];
            results[1].forEach(function(doc) { var d = doc.data(); d.id = doc.id; self.dataTransaksi.push(d); });

            self.dataAbsensi = [];
            results[2].forEach(function(doc) { self.dataAbsensi.push(doc.data()); });

            self.configGaji = results[3].exists ? results[3].data() : { apotek: [], klinik: [] };
            self.configPembagian = results[4].exists ? results[4].data() : {};

            self.hitungPayroll();
        }).catch(function(err) {
            Utils.toast('Gagal memuat data payroll: ' + err.message, 'error');
            console.error(err);
        });
    },

        hitungPayroll: function() {
        var self = this;
        this.kalkulasiGaji = [];

        // 1. Hitung Total Jasa Resep & Tindakan dari Transaksi Bulan Ini
        var rekapDokter = {}; // Group by dokterId
        var totalTuslahKlinik = 0;
        var totalTuslahApotek = 0;

        this.dataTransaksi.forEach(function(t) {
            // Jasa Resep Klinik
            if (t.tipe === 'resep_klinik' && t.dokterId) {
                if (!rekapDokter[t.dokterId]) rekapDokter[t.dokterId] = { jasaResep: 0, jumlahResep: 0 };
                rekapDokter[t.dokterId].jasaResep += (t.jasaResep || 0);
                rekapDokter[t.dokterId].jumlahResep += 1;
            }
            // Tindakan Tuslah
            if (t.tindakanItems && t.tindakanItems.length > 0) {
                t.tindakanItems.forEach(function(tin) {
                    if (tin.kategori === 'klinik') totalTuslahKlinik += (tin.hargaJual - (tin.modal || 0));
                    else if (tin.kategori === 'apotek') totalTuslahApotek += (tin.hargaJual - (tin.modal || 0));
                });
            }
        });

        // 2. Proses per Karyawan
        this.dataKaryawan.forEach(function(k) {
            var gajiPokok = 0;
            var depKey = (k.departemen || '').toLowerCase();
            var cfgGajiDep = self.configGaji[depKey] || [];
            var gajiCfg = cfgGajiDep.find(function(g) { return g.karyawanId === k.id; });
            if (gajiCfg) gajiPokok = gajiCfg.gajiPokok || 0;

            // Hitung Hari Kerja (Absensi)
            var hadir = self.dataAbsensi.filter(function(a) { return a.userId === k.userId || a.namaKaryawan === k.nama; }).length;

            // Hitung Jasa Resep (Jika dia dokter)
            var jasaResep = 0;
            if (rekapDokter[k.userId]) {
                jasaResep = rekapDokter[k.userId].jasaResep;
            }

            // Hitung Bagian Tindakan (Tuslah) berdasarkan slot persen di pengaturan
            var bagianTindakan = 0;
            var depTindakanKey = (depKey === 'klinik') ? 'tindakanKlinik' : 'tindakanApotek';
            var slotsTindakan = self.configPembagian[depTindakanKey] || [];
            var mySlot = slotsTindakan.find(function(s) { return s.karyawanId === k.id; });
            if (mySlot && mySlot.persen > 0) {
                // FIX TYPO: totalTusalahApotek -> totalTuslahApotek
                var totalTuslahDep = (depKey === 'klinik') ? totalTuslahKlinik : totalTuslahApotek;
                bagianTindakan = (totalTuslahDep * mySlot.persen) / 100;
            }

            var totalGaji = gajiPokok + jasaResep + bagianTindakan;

            self.kalkulasiGaji.push({
                karyawanId: k.id,
                nama: k.nama,
                departemen: k.departemen,
                jabatan: k.jabatan,
                hariKerja: hadir,
                gajiPokok: gajiPokok,
                jasaResep: jasaResep,
                bagianTindakan: bagianTindakan,
                tunjanganLain: 0, // Manual input nanti
                potongan: 0, // Manual input nanti
                totalGaji: totalGaji
            });
        });

        self.renderTable();
    },
    renderTable: function() {
        var container = document.getElementById('payroll-content');
        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<div class="overflow-x-auto">';
        html += '<table class="w-full text-sm">';
        html += '<thead><tr class="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase tracking-wider">';
        html += '<th class="px-4 py-3 text-left">Karyawan</th>';
        html += '<th class="px-4 py-3 text-center">Hadir</th>';
        html += '<th class="px-4 py-3 text-right">Gaji Pokok</th>';
        html += '<th class="px-4 py-3 text-right">Jasa Resep</th>';
        html += '<th class="px-4 py-3 text-right">Tuslah/Tindakan</th>';
        html += '<th class="px-4 py-3 text-right">Tunjangan</th>';
        html += '<th class="px-4 py-3 text-right">Potongan</th>';
        html += '<th class="px-4 py-3 text-right">Total Gaji</th>';
        html += '<th class="px-4 py-3 text-center">Aksi</th>';
        html += '</tr></thead><tbody>';

        if (this.kalkulasiGaji.length === 0) {
            html += '<tr><td colspan="9" class="text-center py-6 text-slate-400">Tidak ada karyawan aktif.</td></tr>';
        } else {
            this.kalkulasiGaji.forEach(function(k, idx) {
                html += '<tr class="border-t border-slate-100 dark:border-slate-700">';
                html += '<td class="px-4 py-3"><p class="font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(k.nama) + '</p><p class="text-xs text-slate-400">' + Utils.escapeHtml(k.departemen || '-') + '</p></td>';
                html += '<td class="px-4 py-3 text-center">' + k.hariKerja + ' H</td>';
                html += '<td class="px-4 py-3 text-right text-slate-600 dark:text-slate-300">' + Utils.formatRupiah(k.gajiPokok) + '</td>';
                html += '<td class="px-4 py-3 text-right text-blue-600">' + Utils.formatRupiah(k.jasaResep) + '</td>';
                html += '<td class="px-4 py-3 text-right text-purple-600">' + Utils.formatRupiah(k.bagianTindakan) + '</td>';
                html += '<td class="px-4 py-3 text-right"><input type="number" id="tunjangan-' + idx + '" value="0" oninput="AppKeuanganPayroll.updateTotal(' + idx + ')" class="w-24 px-2 py-1 border border-slate-300 dark:bg-slate-700 dark:text-white rounded text-xs text-right"></td>';
                html += '<td class="px-4 py-3 text-right"><input type="number" id="potongan-' + idx + '" value="0" oninput="AppKeuanganPayroll.updateTotal(' + idx + ')" class="w-24 px-2 py-1 border border-slate-300 dark:bg-slate-700 dark:text-white rounded text-xs text-right"></td>';
                html += '<td class="px-4 py-3 text-right font-bold text-emerald-600" id="total-' + idx + '">' + Utils.formatRupiah(k.totalGaji) + '</td>';
                html += '<td class="px-4 py-3 text-center"><button onclick="AppKeuanganPayroll.cetakSlip(' + idx + ')" class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded">Slip</button></td>';
                html += '</tr>';
            });
        }

        html += '</tbody></table></div></div>';

        // Tombol Simpan Payroll Bulanan
        html += '<div class="flex justify-end mt-4">';
        html += '<button onclick="AppKeuanganPayroll.simpanPayroll()" class="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm flex items-center gap-2"><i data-lucide="save" class="w-4 h-4"></i> Simpan & Kunci Payroll Bulan Ini</button>';
        html += '</div>';

        container.innerHTML = html;
        lucide.createIcons();
    },

    // Update realtime saat kasir masukin tunjangan/potongan manual
    updateTotal: function(idx) {
        var tunjangan = parseFloat(document.getElementById('tunjangan-' + idx).value) || 0;
        var potongan = parseFloat(document.getElementById('potongan-' + idx).value) || 0;
        
        var k = this.kalkulasiGaji[idx];
        k.tunjanganLain = tunjangan;
        k.potongan = potongan;
        
        var totalAkhir = (k.gajiPokok + k.jasaResep + k.bagianTindakan + tunjangan) - potongan;
        document.getElementById('total-' + idx).textContent = Utils.formatRupiah(totalAkhir);
        k.totalGaji = totalAkhir;
    },

    cetakSlip: function(idx) {
        var k = this.kalkulasiGaji[idx];
        var bulan = document.getElementById('filter-bulan-payroll').value;
        var w = window.open('', '', 'width=400,height=600');

        var html = '<html><head><title>Slip Gaji ' + k.nama + '</title>';
        html += '<style>body{font-family:monospace;font-size:12px;width:80mm;margin:0;padding:10px;color:#000;} h2,p{text-align:center;margin:0;} table{width:100%;} .right{text-align:right;} .bold{font-weight:bold;} hr{border-top:1px dashed #000;margin:8px 0;}</style></head><body>';
        
        html += '<h2 class="bold">SLIP GAJI KARYAWAN</h2>';
        html += '<p>Aulia Apotek Klinik</p><hr>';
        html += '<table>';
        html += '<tr><td>Periode</td><td>: ' + bulan + '</td></tr>';
        html += '<tr><td>Nama</td><td>: ' + k.nama + '</td></tr>';
        html += '<tr><td>Jabatan</td><td>: ' + k.jabatan + '</td></tr>';
        html += '<tr><td>Hadir</td><td>: ' + k.hariKerja + ' Hari</td></tr>';
        html += '</table><hr>';
        
        html += '<table>';
        html += '<tr><td>Gaji Pokok</td><td class="right">' + Utils.formatRupiah(k.gajiPokok) + '</td></tr>';
        html += '<tr><td>Jasa Resep</td><td class="right">' + Utils.formatRupiah(k.jasaResep) + '</td></tr>';
        html += '<tr><td>Tuslah/Tindakan</td><td class="right">' + Utils.formatRupiah(k.bagianTindakan) + '</td></tr>';
        html += '<tr><td>Tunjangan Lain</td><td class="right">' + Utils.formatRupiah(k.tunjanganLain) + '</td></tr>';
        html += '<tr><td>Potongan</td><td class="right">(-) ' + Utils.formatRupiah(k.potongan) + '</td></tr>';
        html += '</table><hr>';
        
        html += '<table>';
        html += '<tr class="bold"><td>TOTAL DITERIMA</td><td class="right">' + Utils.formatRupiah(k.totalGaji) + '</td></tr>';
        html += '</table><hr>';
        
        html += '<p>Penerima,</p><br><br><br>';
        html += '<p class="bold">( ' + k.nama + ' )</p>';
        
        html += '<script>window.onload = function() { window.print(); }<\/script>';
        html += '</body></html>';

        w.document.write(html);
        w.document.close();
    },

    simpanPayroll: function() {
        if (!confirm('Kunci & simpan payroll bulan ini? Data tidak bisa diubah setelah dikunci.')) return;

        var bulan = document.getElementById('filter-bulan-payroll').value;
        var batch = db.batch();

        this.kalkulasiGaji.forEach(function(k) {
            var ref = db.collection('payrollHistory').doc();
            batch.set(ref, {
                bulan: bulan,
                karyawanId: k.karyawanId,
                namaKaryawan: k.nama,
                departemen: k.departemen,
                hariKerja: k.hariKerja,
                gajiPokok: k.gajiPokok,
                jasaResep: k.jasaResep,
                bagianTindakan: k.bagianTindakan,
                tunjanganLain: k.tunjanganLain,
                potongan: k.potongan,
                totalGaji: k.totalGaji,
                status: 'paid',
                diprosesOleh: window.currentUserName || 'Keuangan',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        batch.commit().then(function() {
            Utils.toast('Payroll berhasil disimpan & dikunci!', 'success');
        }).catch(function(err) {
            Utils.toast('Gagal simpan payroll: ' + err.message, 'error');
        });
    }
};
