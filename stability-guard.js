(() => {
  'use strict';

  /* Expired Supabase invite/recovery links leave an error in the URL hash.
     The app only consumes valid access_token hashes, so remove error hashes
     before auth startup can repeatedly see the same failed callback. */
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

  /* The catalog is the one request that leaves the whole app looking frozen
     if it never settles. Give it a timeout and one cache-bypassing retry. */
  try {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async function(input, init = {}) {
      let url;
      try {
        url = new URL(typeof input === 'string' ? input : input.url, location.href);
      } catch {
        return nativeFetch(input, init);
      }

      const isCatalog = url.origin === location.origin && /\/data\/cards\.json$/.test(url.pathname);
      if (!isCatalog) return nativeFetch(input, init);

      const attempt = async (cacheMode, bustCache) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        try {
          const requestUrl = new URL(url.href);
          if (bustCache) requestUrl.searchParams.set('_rv', Date.now().toString());
          const requestInit = {...init, cache: cacheMode};
          if (!requestInit.signal) requestInit.signal = controller.signal;
          return await nativeFetch(requestUrl.href, requestInit);
        } finally {
          clearTimeout(timer);
        }
      };

      try {
        return await attempt('no-store', false);
      } catch (firstError) {
        try {
          return await attempt('reload', true);
        } catch {
          throw firstError;
        }
      }
    };
  } catch {}

  /* Never leave a partially booted page looking alive forever. This covers
     the case where an older cached script prevents the core app from reaching
     its own catalog error handler. */
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

  /* The restored app still schedules a preload of roughly half the catalog
     after its first render. That is unnecessary startup work on both desktop
     and mobile, so suppress only that one idle callback. Normal idle work is
     restored immediately afterward. */
  try {
    window.addEventListener('riftbound-catalog-ready', () => {
      const hadIdle = 'requestIdleCallback' in window;
      const nativeIdle = window.requestIdleCallback;
      let intercepted = false;

      window.requestIdleCallback = function(callback, options) {
        if (!intercepted) {
          intercepted = true;
          if (hadIdle) window.requestIdleCallback = nativeIdle;
          else {
            try { delete window.requestIdleCallback; } catch { window.requestIdleCallback = undefined; }
          }
          window.dispatchEvent(new CustomEvent('riftbound-card-preload-complete',{detail:{count:0,skipped:true}}));
          return 0;
        }
        return nativeIdle ? nativeIdle.call(window, callback, options) : setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 1);
      };

      setTimeout(() => {
        if (!intercepted) {
          if (hadIdle) window.requestIdleCallback = nativeIdle;
          else {
            try { delete window.requestIdleCallback; } catch { window.requestIdleCallback = undefined; }
          }
        }
      }, 2500);
    }, { once: true });
  } catch {}
})();
