(() => {
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  const toast = document.querySelector('#form-toast');
  function useLogoFallback(logo) {
    const fallback = document.createElement('span');
    fallback.className = 'brand-logo brand-logo-fallback';
    fallback.setAttribute('aria-label', 'TAJ SPA');
    fallback.textContent = 'TAJ SPA';
    logo.replaceWith(fallback);
  }
  document.querySelectorAll('img.brand-logo').forEach((logo) => {
    if (logo.complete && logo.naturalWidth === 0) {
      useLogoFallback(logo);
    } else {
      logo.addEventListener('error', () => useLogoFallback(logo), { once: true });
    }
  });

  const url = String(window.TAJSPA_SUPABASE_URL || '').trim();
  const key = String(window.TAJSPA_SUPABASE_ANON_KEY || '').trim();
  const configured =
    window.supabase &&
    typeof window.supabase.createClient === 'function' &&
    /^https:\/\//i.test(url) &&
    !url.includes('YOUR-PROJECT') &&
    key.length > 25 &&
    !key.includes('YOUR_SUPABASE');
  const db = configured
    ? window.supabase.createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true }
      })
    : null;

  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        nav.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
      }
    });
  }

  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();

  let toastTimer;
  function showToast(message, isError = false) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.toggle('toast-error', Boolean(isError));
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 6500);
  }

  const kindMap = {
    'Шикоят': 'complaint',
    'Пешниҳод': 'suggestion',
    'Савол': 'question',
    'Ташаккур': 'thanks'
  };

  async function saveFeedback(event, formKind) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    if (!db) {
      showToast('Фиристодан ҳоло фаъол нест: администратор бояд Supabase-ро дар supabase-config.js пайваст кунад.', true);
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const previousText = submitButton ? submitButton.textContent : '';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Сабт шуда истодааст…';
    }

    try {
      const values = new FormData(form);
      const message = String(values.get('message') || '').trim();
      const name = String(values.get('name') || '').trim();
      const contact = String(values.get('contact') || '').trim();
      let payload;

      if (formKind === 'review') {
        payload = {
          kind: 'review',
          name: name || null,
          contact: null,
          rating: Number(values.get('rating')),
          message
        };
      } else {
        payload = {
          kind: kindMap[String(values.get('type') || '')] || 'complaint',
          name: name || null,
          contact: contact || null,
          rating: null,
          message
        };
      }

      const { error } = await db.from('spa_feedback').insert(payload);
      if (error) {
        console.error('TAJ SPA feedback save failed:', error);
        showToast('Паём сабт нашуд. Танзими пойгоҳи маълумот ё иҷозатҳои SQL-ро санҷед.', true);
        return;
      }

      form.reset();
      showToast(formKind === 'review'
        ? 'Отзыви шумо дархост шуд ва ба кабинети администратор сабт гардид.'
        : 'Муроҷиати шумо ба кабинети администратор бомуваффақият сабт шуд.');
    } catch (error) {
      console.error('TAJ SPA feedback save failed:', error);
      showToast('Хатои пайвастшавӣ. Интернет ва танзими Supabase-ро санҷед.', true);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = previousText;
      }
    }
  }

  const reviewForm = document.querySelector('#review-form');
  if (reviewForm) {
    reviewForm.addEventListener('submit', (event) => saveFeedback(event, 'review'));
  }
  const complaintForm = document.querySelector('#complaint-form');
  if (complaintForm) {
    complaintForm.addEventListener('submit', (event) => saveFeedback(event, 'complaint'));
  }
})();