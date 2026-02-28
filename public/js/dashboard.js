// ─── Mobile Sidebar Toggle ───
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
        document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
    }
}

// Close sidebar on Escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const sidebar = document.querySelector('.sidebar.open');
        if (sidebar) toggleSidebar();
    }
});

// Make toggleSidebar globally available
window.toggleSidebar = toggleSidebar;

// ─── Auto-refresh stats on the overview page ───
(function () {
    const statsContainer = document.querySelector('.stats-grid');
    if (!statsContainer) return;

    async function refreshStats() {
        try {
            const res = await fetch('/api/stats');
            if (!res.ok) return;
            const stats = await res.json();

            const values = statsContainer.querySelectorAll('.stat-value');
            if (values[0]) values[0].textContent = stats.today;
            if (values[1]) values[1].textContent = stats.total;
            if (values[2]) values[2].textContent = stats.aiTranslated;
            if (values[3]) {
                const rate =
                    stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 100;
                values[3].textContent = rate + '%';
            }
        } catch (_) {
            // Silently fail on refresh
        }
    }

    // Refresh every 30 seconds
    setInterval(refreshStats, 30000);
})();

// ─── Auto-dismiss alerts after 5 seconds ───
(function () {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach((alert) => {
        setTimeout(() => {
            alert.style.transition = 'opacity 0.3s, transform 0.3s';
            alert.style.opacity = '0';
            alert.style.transform = 'translateY(-10px)';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    });
})();
