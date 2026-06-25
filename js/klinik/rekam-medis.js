/**
 * js/klinik/rekam-medis.js
 * Rekam Medis Pasien (Bisa diakses langsung atau dari Antrian)
 */

window.AppKlinikRekamMedis = {
    data: [],
    tindakanList: [],

    render: function() {
        var html = '<div class="page-enter max-w-4xl">';
        html += '  <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-1">Rekam Medis</h2>';
        html += '  <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Input pemeriksaan dan tindakan dokter</p>';
        html += '  <div id="rm-content"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        var pTindakan = db.collection('masterTindakan').where('aktif', '==', true).where('kategori', '==', 'klinik').get();
        
        pTindakan.then(snap => {
            AppKlinikRekamMedis.tindakanList = [];
            snap.forEach(doc => { var d = doc.data(); d.id = doc.id; AppKlinikRekamMedis.tindakanList.push(d); });

            // Cek apakah dibuka dari Antrian atau dari menu langsung
            if (window.TEMP_ANTRIAN_ID) {
                var antId = window.TEMP_ANTRIAN_ID;
                delete window.TEMP_ANTRIAN_ID; // Hapus langsung supaya tidak nyangkut saat reload
                
                db.collection('antrian').doc(antId).get().then(doc => {
                    if (doc.exists) {
                        var a = doc.data();
                        // Pastikan status antrian jadi dilayani
                        if (a.status === 'menunggu') {
                            db.collection('antrian').doc(antId).update({ status: 'dilayani', waktuMulai: firebase.firestore.FieldValue.serverTimestamp() });
                        }
                        AppKlinikRekamMedis.renderForm({
                            antrianId: antId,
                            pasienId: a.pasienId,
                            nomorRM: a.nomorRM,
                            namaPasien: a.namaPasien,
                            dokterId: a.dokterId,
                            namaDokter: a.namaDokter,
                            keluhan: a.keluhan || ''
                        });
                    } else {
                        AppKlinikRekamMedis.renderForm(null);
                    }
                });
            } else {
                AppKlinikRekamMedis.renderForm(null);
            }
        }).catch(err => Utils.toast('Gagal memuat master tindakan: ' + err.message, 'error'));
    },

    renderForm: function(prefill) {
        var p = prefill || {};
        var today = new Date().toISOString().split('T')[0];

        var html = '<form id="form-rm" class="space-y-4">';
        
        // INFO PASIEN & DOKTER
        html += '<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">';
        html += '<div><label class="block text-xs text-blue-600 dark:text-blue-400 mb-1">No. RM</label><input type="text" id="rm-norm" value="' + Utils.escapeHtml(p.nomorRM || '') + '" class="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg text-sm" required></div>';
        html += '<div><label class="block text-xs text-blue-600 dark:text-blue-400 mb-1">Nama Pasien</label><input type="text" id="rm-pasien" value="' + Utils.escapeHtml(p.namaPasien || '') + '" class="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg text-sm" required></div>';
        html += '<div><label class="block text-xs text-blue-600 dark:text-blue-400 mb-1">Dokter</label><input type="text" id="rm-dokter" value="' + Utils.escapeHtml(p.namaDokter || '') + '" class="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg text-sm"></div>';
        html += '<div><label class="block text-xs text-blue-600 dark:text-blue-400 mb-1">Tanggal</label><input type="date" id="rm-tgl" value="' + today + '" class="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg text-sm"></div>';
        html += '</div>';
        
        if (p.antrianId) html += '<input type="hidden" id="rm-antId" value="' + p.antrianId + '">';
        if (p.pasienId) html += '<input type="hidden" id="rm-pasienId" value="' + p.pasienId + '">';
        if (p.dokterId) html += '<input type="hidden" id="rm-dokterId" value="' + p.dokterId + '">';

        // CATATAN MEDIS
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">';
        html += '<h3 class="font-semibold text-gray-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Catatan Medis</h3>';
        
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Keluhan Utama</label><textarea id="rm-keluhan" rows="2" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">' + Utils.escapeHtml(p.keluhan || '') + '</textarea></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Anamnesis</label><textarea id="rm-anamnesis" rows="2" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Riwayat penyakit sekarang, riwayat penyakit dahulu, alergi..."></textarea></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pemeriksaan Fisik</label><textarea id="rm-fisik" rows="2" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="TD, Nadi, RR, Suhu, GCS, Status Generalis..."></textarea></div>';
        html += '<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Diagnosa</label><input type="text" id="rm-diagnosa" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Suspek ISPA, Myalgia, dll"></div>';
        html += '</div>';

        // TINDAKAN
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">';
        html += '<div class="flex justify-between items-center mb-3"><h3 class="font-semibold text-gray-800 dark:text-white">Tindakan Klinik</h3><button type="button" onclick="AppKlinikRekamMedis.addTindakan()" class="text-sm bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-3 py-1.5 rounded-lg font-medium hover:bg-purple-100">+ Tambah Tindakan</button></div>';
        html += '<div id="rm-tindakan-list" class="space-y-2">';
        html += '<p class="text-sm text-slate-400 italic p-2">Belum ada tindakan.</p>';
        html += '</div></div>';

        // CATATAN TAMBAHAN & TOMBOL SIMPAN
        html += '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">';
        html += '<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Catatan / Resep (Opsional)</label>';
        html += '<textarea id="rm-catatan" rows="2" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Informasi tambahan untuk apotek atau tindak lanjut..."></textarea>';
        html += '</div>';

        html += '<div class="flex justify-end">';
        html += '<button type="submit" class="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg transition-all text-sm flex items-center gap-2"><i data-lucide="save" class="w-4 h-4"></i> Simpan Rekam Medis</button>';
        html += '</div>';

        html += '</form>';
        document.getElementById('rm-content').innerHTML = html;
        lucide.createIcons();

        // Event Listener Form Submit
        setTimeout(() => {
            document.getElementById('form-rm').addEventListener('submit', function(e) {
                e.preventDefault();
                AppKlinikRekamMedis.simpan();
            });
        }, 100);
    },

    addTindakan: function() {
        var container = document.getElementById('rm-tindakan-list');
        // Hapus tulisan "Belum ada tindakan" jika ada
        if (container.querySelector('p.italic')) container.innerHTML = '';

        var idx = container.children.length;
        var html = '<div id="rm-tindakan-' + idx + '" class="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">';
        html += '<select id="rm-tind-id-' + idx + '" class="w-full sm:w-1/2 px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" onchange="AppKlinikRekamMedis.updateTindakanInfo(' + idx + ')">';
        html += '<option value="">-- Pilih Tindakan --</option>';
        this.tindakanList.forEach(t => {
            html += '<option value="' + t.id + '">' + Utils.escapeHtml(t.nama) + ' (' + Utils.formatRupiah(t.hargaJual) + ')</option>';
        });
        html += '</select>';
        html += '<div class="flex items-center gap-2 text-xs text-slate-500 w-full sm:w-1/3" id="rm-tind-info-' + idx + '">Pilih tindakan</div>';
        html += '<button type="button" onclick="document.getElementById(\'rm-tindakan-' + idx + '\').remove()" class="p-2 text-red-400 hover:text-red-600"><i data-lucide="x" class="w-4 h-4"></i></button>';
        html += '</div>';

        container.insertAdjacentHTML('beforeend', html);
        lucide.createIcons({ nodes: [container] });
    },

    updateTindakanInfo: function(idx) {
        var selectId = document.getElementById('rm-tind-id-' + idx).value;
        var infoEl = document.getElementById('rm-tind-info-' + idx);
        if (!infoEl) return;

        if (selectId) {
            var t = this.tindakanList.find(x => x.id === selectId);
            if (t) {
                var tuslah = (t.hargaJual || 0) - (t.modal || 0);
                infoEl.innerHTML = '<span class="text-green-600 font-medium">Tuslah: ' + Utils.formatRupiah(tuslah) + '</span>';
                return;
            }
        }
        infoEl.innerHTML = 'Pilih tindakan';
    },

    simpan: function() {
        // Kumpulkan Tindakan
        var tindakanItems = [];
        var tindakanRows = document.querySelectorAll('[id^="rm-tindakan-"]');
        tindakanRows.forEach(row => {
            var idx = row.id.split('-').pop();
            var tindId = document.getElementById('rm-tind-id-' + idx)?.value;
            if (tindId) {
                var tData = this.tindakanList.find(t => t.id === tindId);
                if (tData) {
                    tindakanItems.push({
                        tindakanId: tindId,
                        namaTindakan: tData.nama,
                        hargaJual: tData.hargaJual,
                        modal: tData.modal
                    });
                }
            }
        });

        var obj = {
            tanggal: document.getElementById('rm-tgl').value,
            nomorRM: document.getElementById('rm-norm').value.trim(),
            namaPasien: document.getElementById('rm-pasien').value.trim(),
            dokterId: document.getElementById('rm-dokterId')?.value || '',
            namaDokter: document.getElementById('rm-dokter').value.trim(),
            antrianId: document.getElementById('rm-antId')?.value || null,
            pasienId: document.getElementById('rm-pasienId')?.value || '',
            keluhan: document.getElementById('rm-keluhan').value.trim(),
            anamnesis: document.getElementById('rm-anamnesis').value.trim(),
            pemeriksaanFisik: document.getElementById('rm-fisik').value.trim(),
            diagnosa: document.getElementById('rm-diagnosa').value.trim(),
            tindakanItems: tindakanItems,
            catatan: document.getElementById('rm-catatan').value.trim(),
            status: 'selesai',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection('rekamMedis').add(obj).then(function() {
            Utils.toast('Rekam medis berhasil disimpan!', 'success');
            // Kembali ke antrian jika datang dari sana, atau ke daftar RM
            if (obj.antrianId) {
                navigateTo('klinik/antrian', 'Antrian');
            } else {
                document.getElementById('rm-content').innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl border p-8 text-center text-green-600"><i data-lucide="check-circle" class="w-12 h-12 mx-auto mb-3"></i><p class="font-semibold">Data Berhasil Disimpan</p></div>';
                lucide.createIcons();
            }
        }).catch(err => Utils.toast('Gagal menyimpan: ' + err.message, 'error'));
    }
};
