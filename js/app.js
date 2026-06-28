// ==========================================
// FIREBASE CONFIG (PROJECT BARU)
// ==========================================
const firebaseConfig = {

  apiKey: "AIzaSyALaYgptR_MQSVSmQN4ag6ByI5A78SUssA",

  authDomain: "aulia-apotek-klinik-b07f1.firebaseapp.com",

  projectId: "aulia-apotek-klinik-b07f1",

  storageBucket: "aulia-apotek-klinik-b07f1.firebasestorage.app",

  messagingSenderId: "702935233155",

  appId: "1:702935233155:web:f03acb219633ca4df2e1b6",

  measurementId: "G-93Q7J2B077"

};


firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ==========================================
// GLOBAL STATE & UTILS
// ==========================================
window.Utils = {
    formatRupiah: (num) => 'Rp ' + (num || 0).toLocaleString('id-ID'),
    escapeHtml: (text) => {
        if (!text) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(text));
        return div.innerHTML;
    },
    thisMonth: () => {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    },
    toast: (msg, type = 'info') => {
        if(type === 'error') alert('❌ ERROR: ' + msg);
        else if(type === 'success') alert('✅ ' + msg);
        else alert('ℹ️ ' + msg);
    },
    showLoading: (containerId) => {
        var el = document.getElementById(containerId);
        if(el) el.innerHTML = '<div class="flex justify-center py-10"><div class="spinner"></div></div>';
    },
    openModal: (htmlContent) => {
        var existing = document.getElementById('global-modal');
        if(existing) existing.remove();

        var modal = document.createElement('div');
        modal.id = 'global-modal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50';
        modal.innerHTML = '<div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">' + htmlContent + '</div>';
        document.body.appendChild(modal);
        lucide.createIcons();
    },
    closeModal: () => {
        var modal = document.getElementById('global-modal');
        if(modal) modal.remove();
    }
};

// ==========================================
// THEME MANAGEMENT (DARK/LIGHT)
// ==========================================
function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

(function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
})();

// ==========================================
// ROUTING & SIDEBAR MENU
// ==========================================
const menuStructure = {
    utama: [
        { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', module: 'dashboard' }
    ],
    klinik: [
        { id: 'antrian', label: 'Antrian', icon: 'list-ordered', module: 'klinik/antrian' },
        { id: 'rekam-medis', label: 'Rekam Medis', icon: 'file-heart', module: 'klinik/rekamMedis' },
        { id: 'resep', label: 'Resep', icon: 'file-text', module: 'klinik/resep' },
        { id: 'pasien', label: 'Pasien', icon: 'users', module: 'klinik/pasien' }
    ],
    apotek: [
        { id: 'transaksi', label: 'Transaksi', icon: 'shopping-cart', module: 'apotek/transaksi' },
        { id: 'obat', label: 'Obat & Stock', icon: 'pill', module: 'apotek/obat' },
        { id: 'pembelian', label: 'Pembelian', icon: 'truck', module: 'apotek/pembelian' },
        { id: 'stockOpname', label: 'Stock Opname', icon: 'clipboard-check', module: 'apotek/stockOpname' },
        { id: 'retur', label: 'Retur Supplier', icon: 'package-open', module: 'apotek/retur' },
        { id: 'notifikasi', label: 'Alert Stok', icon: 'bell', module: 'apotek/notifikasi' }
    ],
    laporan: [
        { id: 'hutang', label: 'Hutang Usaha', icon: 'file-text', module: 'laporan/hutang' },
        { id: 'pengeluaran', label: 'Pengeluaran', icon: 'receipt', module: 'laporan/pengeluaran' },
        { id: 'piutang', label: 'Piutang Karyawan', icon: 'wallet', module: 'laporan/piutang' },
        { id: 'penjualanHarian', label: 'Penjualan Harian', icon: 'trending-up', module: 'laporan/penjualanHarian' }
    ],
    manajemen: [
        { id: 'karyawan', label: 'Karyawan', icon: 'user-check', module: 'manajemen/karyawan' },
        { id: 'absensi', label: 'Absensi', icon: 'calendar-check', module: 'manajemen/absensi' }
    ],
    keuangan: [
        { id: 'payroll', label: 'Payroll', icon: 'calculator', module: 'keuangan/payroll' },
        { id: 'laporan-keuangan', label: 'Lap. Keuangan', icon: 'bar-chart-3', module: 'keuangan/laporanKeuangan' },
        { id: 'akuntansi', label: 'Akuntansi', icon: 'book-open', module: 'keuangan/akuntansi' }
    ],
    pengaturan: [
        { id: 'profil', label: 'Profil Instansi', icon: 'building-2', module: 'pengaturan/profil' },
        { id: 'pembagian', label: 'Pembagian Hasil', icon: 'pie-chart', module: 'pengaturan/pembagian' },
        { id: 'tindakan', label: 'Master Tindakan', icon: 'stethoscope', module: 'pengaturan/tindakan' },
        { id: 'gaji', label: 'Pengaturan Gaji', icon: 'wallet', module: 'pengaturan/gaji' },
        { id: 'users', label: 'Kelola Users', icon: 'user-cog', module: 'pengaturan/users' }
    ]
};

const roleAccess = {
    klinik: ['utama', 'klinik', 'manajemen.absensi'], 
    apotek: ['utama', 'apotek', 'laporan.pengeluaran', 'manajemen.absensi'], 
    admin: ['utama', 'klinik', 'apotek', 'laporan', 'manajemen', 'pengaturan.profil', 'pengaturan.tindakan'],
    keuangan: ['utama', 'klinik', 'apotek', 'laporan', 'manajemen', 'keuangan', 'pengaturan'] 
};

function renderSidebar(role) {
    const allowed = roleAccess[role] || [];
    const menuContainer = document.getElementById('sidebar-menu');
    let html = '';
    
    const sections = [
        { key: 'utama', title: 'Menu Utama', icon: 'home' },
        { key: 'klinik', title: 'Operasional Klinik', icon: 'activity' },
        { key: 'apotek', title: 'Operasional Apotek', icon: 'cross' },
        { key: 'laporan', title: 'Laporan', icon: 'file-bar-chart' },
        { key: 'manajemen', title: 'Manajemen', icon: 'users' },
        { key: 'keuangan', title: 'Keuangan', icon: 'landmark' },
        { key: 'pengaturan', title: 'Pengaturan', icon: 'settings' }
    ];

    sections.forEach(section => {
        const hasAccess = allowed.includes(section.key) || allowed.some(a => a.startsWith(section.key));
        if (!hasAccess) return;

        html += `<div>`;
        html += `<p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><i data-lucide="${section.icon}" class="w-3.5 h-3.5"></i>${section.title}</p>`;
        html += `<ul class="space-y-1">`;
        
        menuStructure[section.key].forEach(menu => {
            const specificAccess = allowed.find(a => a === `${section.key}.${menu.id}`);
            if (!allowed.includes(section.key) && !specificAccess) return;

            html += `<li>
                <button onclick="navigateTo('${menu.module}', '${menu.label}')" class="nav-btn w-full text-left px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-3" data-page="${menu.id}">
                    <i data-lucide="${menu.icon}" class="w-4 h-4"></i>
                    <span>${menu.label}</span>
                </button>
            </li>`;
        });
        html += `</ul></div>`;
    });

    menuContainer.innerHTML = html;
    lucide.createIcons();
}

// ==========================================
// DYNAMIC SCRIPT LOADER (ZERO BUILD APPROACH)
// ==========================================
let currentModule = null;
const loadedScripts = {}; // Cache biar ga load 2x

function loadScript(url) {
    return new Promise((resolve, reject) => {
        if (loadedScripts[url]) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => {
            loadedScripts[url] = true;
            resolve();
        };
        script.onerror = () => {
            console.error('FILE TIDAK DITEMUKAN DI: ' + window.location.origin + '/' + url);
            reject(new Error('File tidak ditemukan di: ' + url));
        };
        document.head.appendChild(script);
    });
}

window.navigateTo = async function(modulePath, title) {
    document.getElementById('page-title').textContent = title;
    document.getElementById('app-content').innerHTML = '<div class="flex justify-center py-20"><div class="spinner"></div></div>';
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-primary-50', 'dark:bg-slate-700', 'text-primary-600', 'dark:text-primary-400', 'font-semibold');
    });
    const activeBtn = document.querySelector(`[data-page="${modulePath.split('/').pop()}"]`);
    if(activeBtn) activeBtn.classList.add('bg-primary-50', 'dark:bg-slate-700', 'text-primary-600', 'dark:text-primary-400', 'font-semibold');

    if(window.innerWidth < 1024) toggleMobileSidebar();

    try {
        const scriptUrl = `js/${modulePath}.js`;
        await loadScript(scriptUrl);
        
        const moduleName = 'App' + modulePath.split('/').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
        
        const Module = window[moduleName];
        
        if (!Module || typeof Module.render !== 'function') {
            throw new Error(`Objek ${moduleName} tidak ditemukan. Pastikan nama variabel di file JS sesuai.`);
        }

        currentModule = Module;
        document.getElementById('app-content').innerHTML = Module.render();
        lucide.createIcons();
        if (typeof Module.init === 'function') Module.init();
        
    } catch (error) {
        console.error("Gagal load module:", error);
        document.getElementById('app-content').innerHTML = `
            <div class="text-center py-20">
                <i data-lucide="file-x" class="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4"></i>
                <h3 class="text-lg font-bold text-slate-500 dark:text-slate-400">Halaman Belum Tersedia</h3>
                <p class="text-sm text-slate-400 dark:text-slate-500 mt-2">${error.message}</p>
                <p class="text-xs text-slate-300 dark:text-slate-600 mt-1">Path: js/${modulePath}.js</p>
            </div>`;
        lucide.createIcons();
    }
};

// FIX: hapus duplikat toggleMobileSidebar() ini — definisi yang benar ada di index.html
//      (menargetkan #mobile-sidebar). Versi lama menargetkan #sidebar dan menyebabkan bug toggle.

// ==========================================
// AUTH STATE LISTENER (PERMISSION GATE)
// ==========================================
function startApp(userRole, userName) {
    window.currentRole = userRole;
    window.currentUserName = userName;
    
    // FIX: null/empty-safe (sebelumnya crash bila nama/role kosong)
    var nameSafe = (userName || 'User').toString();
    var roleSafe = (userRole || 'user').toString();
    document.getElementById('user-name').textContent = nameSafe;
    document.getElementById('user-role').textContent = roleSafe.charAt(0).toUpperCase() + roleSafe.slice(1);
    document.getElementById('user-avatar').textContent = (nameSafe.trim().charAt(0) || '?').toUpperCase();
    
    renderSidebar(userRole);
    navigateTo('dashboard', 'Dashboard');  
}

firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        var overlay = document.getElementById('login-overlay');
        if (overlay) overlay.remove();

        db.collection('users').doc(user.uid).get().then(function(doc) {
            if (doc.exists) {
                var userData = doc.data();
                if (userData.status === 'nonaktif') {
                    Utils.toast('Akun Anda dinonaktifkan. Hubungi Admin.', 'error');
                    firebase.auth().signOut();
                    return;
                }
                startApp(userData.role || 'user', userData.nama || (user.email || 'User'));
            } else {
                // FIX: beri feedback agar user tahu kenapa di-signout.
                Utils.toast('Profil user tidak ditemukan. Hubungi Admin.', 'error');
                firebase.auth().signOut();
            }
        }).catch(function(err) {
            Utils.toast('Gagal memuat profil: ' + err.message, 'error');
            firebase.auth().signOut();
        });
    } else {
        window.AppAuth.renderLogin();
    }
});

// FIX: registrasi Service Worker sudah ditangani di index.html dengan path relatif './sw.js'.
//      Hapus duplikat di sini agar tidak konflik scope.
