// ==========================================
// FIREBASE CONFIG (PROJECT BARU)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyD0FKYfxhmf7Rqf56ab0ENVOCUzx4U8gzQ",
    authDomain: "aulia-apotek-klinik.firebaseapp.com",
    projectId: "aulia-apotek-klinik",
    storageBucket: "aulia-apotek-klinik.firebasestorage.app",
    messagingSenderId: "1083434093638",
    appId: "1:1083434093638:web:d61f6ca9786ecbd9110e47",
    measurementId: "G-24HLYRDEGG"
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
    // FUNGSI BARU UNTUK MODAL/POPUP
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
        { id: 'stockOpname', label: 'Stock Opname', icon: 'clipboard-check', module: 'apotek/stockOpname' }
    ],
    laporan: [
        { id: 'hutang', label: 'Hutang Usaha', icon: 'file-text', module: 'laporan/hutang' },
        { id: 'pengeluaran', label: 'Pengeluaran', icon: 'receipt', module: 'laporan/pengeluaran' },
        { id: 'piutang', label: 'Piutang Karyawan', icon: 'wallet', module: 'laporan/piutang' }
    ],
    manajemen: [
        { id: 'karyawan', label: 'Karyawan', icon: 'user-check', module: 'manajemen/karyawan' },
        { id: 'absensi', label: 'Absensi', icon: 'calendar-check', module: 'manajemen/absensi' }
    ],
    keuangan: [
        { id: 'payroll', label: 'Payroll', icon: 'calculator', module: 'keuangan/payroll' },
        { id: 'laporan-keuangan', label: 'Lap. Keuangan', icon: 'bar-chart-3', module: 'keuangan/laporan-keuangan' },
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
    klinik: ['klinik', 'manajemen.absensi'], 
    apotek: ['apotek', 'laporan.pengeluaran', 'manajemen.absensi'], 
    admin: ['klinik', 'apotek', 'laporan', 'manajemen', 'pengaturan'], 
    keuangan: ['klinik', 'apotek', 'laporan', 'manajemen', 'keuangan', 'pengaturan'] 
};

function renderSidebar(role) {
    const allowed = roleAccess[role] || [];
    const menuContainer = document.getElementById('sidebar-menu');
    let html = '';
    
    const sections = [
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
            // Ini akan nge-print URL EXACT yang gagal, biar kita tau masalahnya dimana
            console.error('FILE TIDAK DITEMUKAN DI: ' + window.location.origin + '/' + url);
            reject(new Error('File tidak ditemukan di: ' + url));
        };
        document.head.appendChild(script);
    });
}
window.navigateTo = async function(modulePath, title) {
    document.getElementById('page-title').textContent = title;
    document.getElementById('app-content').innerHTML = '<div class="flex justify-center py-20"><div class="spinner"></div></div>';
    
    // Highlight active menu
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-primary-50', 'dark:bg-slate-700', 'text-primary-600', 'dark:text-primary-400', 'font-semibold');
    });
    const activeBtn = document.querySelector(`[data-page="${modulePath.split('/').pop()}"]`);
    if(activeBtn) activeBtn.classList.add('bg-primary-50', 'dark:bg-slate-700', 'text-primary-600', 'dark:text-primary-400', 'font-semibold');

    if(window.innerWidth < 1024) toggleMobileSidebar();

    try {
        // Load script secara dinamis (Cocok untuk GitHub Pages tanpa Webpack/Vite)
        const scriptUrl = `js/${modulePath}.js`;
        await loadScript(scriptUrl);
        
        // Konversi path jadi nama Object Window
        // Contoh: 'pengaturan/pembagian' -> 'AppPengaturanPembagian'
        // Contoh: 'dashboard' -> 'AppDashboard'
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

function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('hidden');
    sidebar.classList.toggle('fixed');
    sidebar.classList.toggle('z-50');
    sidebar.classList.toggle('h-full');
    overlay.classList.toggle('hidden');
}

// ==========================================
// AUTH STATE LISTENER (PERMISSION GATE)
// ==========================================
function startApp(userRole, userName) {
    window.currentRole = userRole;
    window.currentUserName = userName;
    
    document.getElementById('user-name').textContent = userName;
    document.getElementById('user-role').textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);
    document.getElementById('user-avatar').textContent = userName.charAt(0);
    
    renderSidebar(userRole);
    navigateTo('apotek/transaksi', 'Transaksi Penjualan'); 
}

// Cek apakah ada user yang sedang login
firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        // 1. HANCURKAN OVERLAY LOGIN JIKA ADA
        var overlay = document.getElementById('login-overlay');
        if (overlay) overlay.remove();

        // 2. Cek data user di Firestore
        db.collection('users').doc(user.uid).get().then(function(doc) {
            if (doc.exists) {
                var userData = doc.data();
                if (userData.status === 'nonaktif') {
                    Utils.toast('Akun Anda dinonaktifkan. Hubungi Admin.', 'error');
                    firebase.auth().signOut();
                    return;
                }
                // Panggil startApp dengan data asli dari database
                startApp(userData.role, userData.nama);
            } else {
                // Kalau auth ada, tapi data firestore gak ada, logout paksa
                firebase.auth().signOut();
            }
        });
    } else {
        // User belum login, tampilkan halaman Login
        window.AppAuth.renderLogin();
    }
});

// Register Service Worker untuk PWA (Aman jika file sw.js belum ada)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // Biarkan silent jika gagal, supaya tidak ngebug aplikasi utama
        });
    });
}
