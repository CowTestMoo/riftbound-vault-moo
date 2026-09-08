(() => {
  'use strict';

  /* Expired Supabase invite/recovery links can leave an error in the URL hash.
     Clear failed callback data before auth startup can repeatedly reprocess it. */
  try {
    if (location.hash) {
      const params = new URLSearchParams(location.hash.slice(1));
      if (params.has('error') || params.has('error_code')) {
        const message = params.get('error_description') || params.get('error') || 'Authentication link expired.';
        sessionStorage.setItem('riftbound-vault-last-auth-error', message);
        history.replaceState(null, '', location.pathname + location.search);
      }
    }
  } catch {}

  /* Never leave a partially booted page looking alive forever. The core app
     owns catalog timeout/retry behavior; this only provides a final UI fallback. */
  try {
    document.addEventListener('click', event => {
      if (!event.target.closest?.('[data-retry-catalog]')) return;
      event.preventDefault();
      event.stopPropagation();
      if (window.RiftboundCatalog?.reload) window.RiftboundCatalog.reload();
      else location.reload();
    }, true);

    setTimeout(() => {
      const status = document.getElementById('catalogStatus');
      const grid = document.getElementById('cardGrid');
      if (!status || !grid || !/^\s*Loading Riftbound catalog/i.test(status.textContent || '')) return;
      status.textContent = 'Catalog is taking longer than expected.';
      grid.innerHTML = '<div class="empty-state catalog-error"><strong>The catalog did not finish loading.</strong><p>You can retry without losing your collection.</p><button type="button" class="ghost-btn" data-retry-catalog>Reload catalog</button></div>';
    }, 20000);
  } catch {}
})();
