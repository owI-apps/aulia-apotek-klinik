// ==========================================
// FIREBASE CONFIG (GANTI DENGAN MILIKMU)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyXXXXXXXXXXXXXXX",
    authDomain: "apotek-aulia.firebaseapp.com",
    projectId: "apotek-aulia",
    storageBucket: "apotek-aulia.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
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
        // Fungsi toast sederhana, nanti bisa dikembangkan
        alert((type === 'error' ? 'ERROR: ' : '') + msg);
    },
    showLoading: (containerId) => {
        var el = document.getElementById(containerId);
        if(el) el.innerHTML = '<div class="flex justify-center py-10"><div class="spinner"></div></div>';
    },
    openModal: (html) => { /* Nanti dibuat */ },
    closeModal: () => { /* Nanti dibuat */ }
};

// ==========================================
// THEME MANAGEMENT (DARK/LIGHT)
// ==========================================
function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Init Theme
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
        { id: 'rekam-medis', label: 'Rekam Medis', icon: 'file-heart', module: 'klinik/rekam-medis' },
        { id: 'resep', label: 'Resep', icon: 'prescription', module: 'klinik/resep' },
        { id: 'pasien', label: 'Pasien', icon: 'users', module: 'klinik/pasien' }
    ],
    apotek: [
        { id: 'transaksi', label: 'Transaksi', icon: 'shopping-cart', module: 'apotek/transaksi' },
        { id: 'obat', label: 'Obat & Stock', icon: 'pill', module: 'apotek/obat' },
        { id: 'pembelian', label: 'Pembelian', icon: 'truck', module: 'apotek/pembelian' },
        { id: 'stock-opname', label: 'Stock Opname', icon: 'clipboard-check', module: 'apotek/stock-opname' }
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
        { id: 'users', label: 'Kelola Users', icon: 'user-cog', module: 'pengaturan/users' }
    ]
};

// Akses berdasarkan Role (SESUAI FINAL BLUEPRINT)
const roleAccess = {
    klinik: ['klinik', 'manajemen.absensi'], // absensi sendiri
    apotek: ['apotek', 'laporan.pengeluaran', 'manajemen.absensi'], // pengeluaran harian (pending)
    admin: ['klinik', 'apotek', 'laporan', 'manajemen', 'pengaturan'], // approve pengeluaran
    keuangan: ['klinik', 'apotek', 'laporan', 'manajemen', 'keuangan', 'pengaturan'] // FULL ACCESS (PSA)
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
        // Cek apakah role punya akses ke section ini (bisa full section atau spesifik sub-menu)
        const hasAccess = allowed.includes(section.key) || 
                          allowed.some(a => a.startsWith(section.key));
        if (!hasAccess) return;

        html += `<div>`;
        html += `<p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><i data-lucide="${section.icon}" class="w-3.5 h-3.5"></i>${section.title}</p>`;
        html += `<ul class="space-y-1">`;
        
        menuStructure[section.key].forEach(menu => {
            // Cek akses spesifik (misal: manajemen.absensi)
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
// ROUTER (Lazy Loading Scripts)
// ==========================================
let currentModule = null;

window.navigateTo = async function(modulePath, title) {
    // Update UI
    document.getElementById('page-title').textContent = title;
    document.getElementById('app-content').innerHTML = '<div class="flex justify-center py-20"><div class="spinner"></div></div>';
    
    // Highlight active menu
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-primary-50', 'dark:bg-slate-700', 'text-primary-600', 'dark:text-primary-400', 'font-semibold');
    });
    const activeBtn = document.querySelector(`[data-page="${modulePath.split('/')[1]}"]`);
    if(activeBtn) activeBtn.classList.add('bg-primary-50', 'dark:bg-slate-700', 'text-primary-600', 'dark:text-primary-400', 'font-semibold');

    // Close mobile sidebar
    if(window.innerWidth < 1024) toggleMobileSidebar();

    try {
        // Dynamically load the JS file
        const { default: Module } = await import(`./${modulePath}.js`);
        currentModule = Module;
        
        // Render & Init
        document.getElementById('app-content').innerHTML = Module.render();
        lucide.createIcons();
        if (Module.init) Module.init();
    } catch (error) {
        console.error("Gagal load module:", error);
        document.getElementById('app-content').innerHTML = `
            <div class="text-center py-20">
                <i data-lucide="file-x" class="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4"></i>
                <h3 class="text-lg font-bold text-slate-500">Halaman Belum Tersedia</h3>
                <p class="text-sm text-slate-400">Module: js/${modulePath}.js belum dibuat.</p>
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
// AUTH LISTENER (Simulasi dulu, nanti ganti real Auth)
// ==========================================
// Untuk sekarang, biar bisa keliatan, kita set manual Keuangan (Full Access)
// Nanti tinggal ganti ini dengan: auth.onAuthStateChanged(user => { ... })
function startApp(role = 'keuangan', name = 'Akun PSA') {
    document.getElementById('user-name').textContent = name;
    document.getElementById('user-role').textContent = role.charAt(0).toUpperCase() + role.slice(1);
    document.getElementById('user-avatar').textContent = name.charAt(0);
    
    renderSidebar(role);
    navigateTo('dashboard', 'Dashboard'); // Arahkan ke dashboard pertama kali
}

// Jalankan Aplikasi
startApp('keuangan', 'Keuangan PSA');

// Register Service Worker untuk PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}
