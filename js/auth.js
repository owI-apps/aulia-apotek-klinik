/**
 * js/auth.js
 * Halaman Login (Mode Overlay) & Sistem Autentikasi
 */

window.AppAuth = {
    renderLogin: function() {
        var html = `
        <div class="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
            <div class="w-full max-w-md">
                <div class="text-center mb-8">
                    <img src="icon-512.png" alt="Logo Aulia" class="w-24 h-24 mx-auto mb-4 rounded-2xl shadow-lg object-cover">
                    <h1 class="text-2xl font-bold text-gray-800 dark:text-white">Aulia Apotek Klinik</h1>
                    <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Silakan login untuk melanjutkan</p>
                </div>
                
                <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <form id="form-login" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                            <input type="email" id="login-email" required class="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="admin@aulia.com">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                            <input type="password" id="login-pass" required class="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="••••••••">
                        </div>
                        <button type="submit" class="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2">
                            <i data-lucide="log-in" class="w-4 h-4"></i> Masuk
                        </button>
                    </form>
                </div>
                <p class="text-center text-xs text-slate-400 mt-4">© 2024 Aulia System. All rights reserved.</p>
            </div>
        </div>`;

        // Buat overlay fullscreen
        var existing = document.getElementById('login-overlay');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.id = 'login-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.zIndex = '9999';
        overlay.innerHTML = html;
        document.body.appendChild(overlay);
        
        lucide.createIcons();

        // Event Listener Submit Login
        var form = overlay.querySelector('#form-login');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                var email = overlay.querySelector('#login-email').value;
                var pass = overlay.querySelector('#login-pass').value;
                
                Utils.toast('Mencoba login...', 'info');
                firebase.auth().signInWithEmailAndPassword(email, pass)
                    .catch(function(err) {
                        Utils.toast('Login Gagal: ' + err.message, 'error');
                    });
            });
        }
    },

    logout: function() {
        firebase.auth().signOut().then(function() {
            Utils.toast('Berhasil logout.', 'success');
        }).catch(function(err) {
            Utils.toast('Gagal logout: ' + err.message, 'error');
        });
    }
};
