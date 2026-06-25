/**
 * js/pengaturan/users.js
 * Manajemen User (CRUD & Role) - Hanya untuk Admin/Keuangan
 */

window.AppPengaturanUsers = {
    data: [],

    render: function() {
        var html = '<div class="page-enter max-w-4xl">';
        html += '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">';
        html += '  <div>';
        html += '    <h2 class="text-xl font-bold text-gray-800 dark:text-white">Manajemen User</h2>';
        html += '    <p class="text-sm text-slate-500 dark:text-slate-400">Kelola akun login & hak akses karyawan</p>';
        html += '  </div>';
        html += '  <button onclick="AppPengaturanUsers.openForm()" class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2 self-start"><i data-lucide="user-plus" class="w-4 h-4"></i> Tambah User</button>';
        html += '</div>';
        html += '<div id="user-list"><div class="flex justify-center py-10"><div class="spinner"></div></div></div>';
        html += '</div>';
        return html;
    },

    init: function() {
        // Keamanan tambahan: Cek role
        if (window.currentRole !== 'admin' && window.currentRole !== 'keuangan') {
            document.getElementById('user-list').innerHTML = '<div class="bg-red-50 text-red-600 p-4 rounded-lg">Akses Ditolak. Halaman ini khusus Admin/Keuangan.</div>';
            return;
        }

        db.collection('users').orderBy('nama').get().then(snap => {
            AppPengaturanUsers.data = [];
            snap.forEach(doc => { var d = doc.data(); d.id = doc.id; AppPengaturanUsers.data.push(d); });
            AppPengaturanUsers.renderList();
        }).catch(err => Utils.toast('Gagal memuat: ' + err.message, 'error'));
    },

    renderList: function() {
        var container = document.getElementById('user-list');
        if (!container) return;
        
        var html = '<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">';
        html += '<table class="w-full text-sm">';
        html += '<thead><tr class="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase tracking-wider">';
        html += '<th class="px-4 py-3 text-left">Nama</th>';
        html += '<th class="px-4 py-3 text-left">Email</th>';
        html += '<th class="px-4 py-3 text-left">Role</th>';
        html += '<th class="px-4 py-3 text-center">Status</th>';
        html += '<th class="px-4 py-3 text-right">Aksi</th>';
        html += '</tr></thead><tbody>';

        this.data.forEach(u => {
            var roleBadge = '';
            if(u.role === 'admin') roleBadge = '<span class="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">Admin</span>';
            else if(u.role === 'keuangan') roleBadge = '<span class="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">Keuangan</span>';
            else if(u.role === 'klinik') roleBadge = '<span class="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Klinik</span>';
            else roleBadge = '<span class="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full">Apotek</span>';

            var statusBadge = u.status === 'aktif' ? 
                '<span class="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Aktif</span>' : 
                '<span class="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">Nonaktif</span>';
            
            var safeName = (u.nama || '-').replace(/'/g, "\\'");

            html += '<tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">';
            html += '<td class="px-4 py-3 font-medium text-gray-800 dark:text-white">' + Utils.escapeHtml(u.nama) + '</td>';
            html += '<td class="px-4 py-3 text-slate-500 text-xs">' + Utils.escapeHtml(u.email) + '</td>';
            html += '<td class="px-4 py-3">' + roleBadge + '</td>';
            html += '<td class="px-4 py-3 text-center">' + statusBadge + '</td>';
            html += '<td class="px-4 py-3 text-right space-x-1">';
            html += '<button onclick="AppPengaturanUsers.openForm(\'' + u.id + '\')" class="p-1.5 text-slate-400 hover:text-primary-600 rounded"><i data-lucide="pencil" class="w-4 h-4"></i></button>';
            if (u.id !== firebase.auth().currentUser.uid) {
                html += '<button onclick="AppPengaturanUsers.toggleStatus(\'' + u.id + '\', \'' + u.status + '\')" class="p-1.5 text-slate-400 hover:text-amber-600 rounded"><i data-lucide="power" class="w-4 h-4"></i></button>';
            }
            html += '</td></tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
        lucide.createIcons();
    },

    openForm: function(id) {
        var isEdit = !!id;
        var u = isEdit ? this.data.find(x => x.id === id) : {};
        
        var html = '<div class="p-6">';
        html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-semibold text-gray-800 dark:text-white">' + (isEdit ? 'Edit' : 'Tambah') + ' User</h3><button onclick="Utils.closeModal()" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="x" class="w-5 h-5 text-slate-400"></i></button></div>';
        html += '<form id="form-user" class="space-y-4">';
        
        html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap *</label><input type="text" id="fu-nama" value="' + Utils.escapeHtml(u.nama || '') + '" required class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm"></div>';
        
        html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Email *</label><input type="email" id="fu-email" value="' + Utils.escapeHtml(u.email || '') + '" required ' + (isEdit ? 'readonly' : '') + ' class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm ' + (isEdit ? 'bg-slate-100 cursor-not-allowed' : '') + '"></div>';
        
        if (!isEdit) {
            html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Password *</label><input type="password" id="fu-pass" required class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm" placeholder="Min 6 karakter"></div>';
        }
        
        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Role *</label><select id="fu-role" required class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm">';
        html += '<option value="apotek"' + (u.role==='apotek'?' selected':'') + '>Apotek</option>';
        html += '<option value="klinik"' + (u.role==='klinik'?' selected':'') + '>Klinik</option>';
        html += '<option value="admin"' + (u.role==='admin'?' selected':'') + '>Admin (Kepala)</option>';
        html += '<option value="keuangan"' + (u.role==='keuangan'?' selected':'') + '>Keuangan (PSA)</option>';
        html += '</select></div>';
        
        html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Status</label><select id="fu-status" class="w-full px-3 py-2 border border-slate-300 dark:bg-slate-700 dark:text-white rounded-lg text-sm"><option value="aktif"' + (u.status!=='nonaktif'?' selected':'') + '>Aktif</option><option value="nonaktif"' + (u.status==='nonaktif'?' selected':'') + '>Nonaktif</option></select></div>';
        html += '</div>';

        html += '<div class="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">';
        html += '<button type="button" onclick="Utils.closeModal()" class="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>';
        html += '<button type="submit" class="px-6 py-2.5 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg">Simpan</button>';
        html += '</div>';
        
        if (isEdit) html += '<input type="hidden" id="fu-id" value="' + u.id + '">';
        html += '</form></div>';

        Utils.openModal(html);
        
        setTimeout(() => {
            document.getElementById('form-user').addEventListener('submit', function(e) {
                e.preventDefault();
                AppPengaturanUsers.simpan();
            });
        }, 100);
    },

    simpan: function() {
        var idField = document.getElementById('fu-id');
        var isEdit = !!idField;
        
        var nama = document.getElementById('fu-nama').value.trim();
        var email = document.getElementById('fu-email').value.trim();
        var role = document.getElementById('fu-role').value;
        var status = document.getElementById('fu-status').value;

        if (isEdit) {
            // Update data Firestore saja (Email & Password tidak bisa diubah disini demi keamanan)
            db.collection('users').doc(idField.value).update({
                nama: nama, role: role, status: status, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                Utils.toast('Data user berhasil diupdate!', 'success');
                Utils.closeModal();
                AppPengaturanUsers.init();
            }).catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
        } else {
            var pass = document.getElementById('fu-pass').value;
            
            // TRIK: Gunakan Secondary App agar Admin tidak ke-logout saat membuat user baru
            var secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");
            secondaryApp.auth().createUserWithEmailAndPassword(email, pass)
                .then(function(userCredential) {
                    // Berhasil buat Auth, lanjut simpan ke Firestore
                    return db.collection('users').doc(userCredential.user.uid).set({
                        nama: nama, email: email, role: role, status: status,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                })
                .then(function() {
                    Utils.toast('User baru berhasil ditambahkan!', 'success');
                    Utils.closeModal();
                    AppPengaturanUsers.init();
                })
                .catch(function(err) {
                    Utils.toast('Gagal buat user: ' + err.message, 'error');
                })
                .finally(function() {
                    secondaryApp.delete(); // Hapus secondary app biar nggak numpuk
                });
        }
    },

    toggleStatus: function(id, currentStatus) {
        var newStatus = currentStatus === 'aktif' ? 'nonaktif' : 'aktif';
        db.collection('users').doc(id).update({ status: newStatus })
            .then(() => {
                Utils.toast('Status user diubah menjadi ' + newStatus, 'success');
                AppPengaturanUsers.init();
            })
            .catch(err => Utils.toast('Gagal: ' + err.message, 'error'));
    }
};
