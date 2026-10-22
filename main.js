(() => {
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  const toast = document.querySelector('#form-toast');

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
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 5200);
  }

  async function copyMessage(message) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(message);
        return true;
      }
    } catch (_) {}
    try {
      const area = document.createElement('textarea');
      area.value = message;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand('copy');
      area.remove();
      return copied;
    } catch (_) {
      return false;
    }
  }

  async function handleFeedback(event, kind) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    let message = '';
    if (kind === 'review') {
      const name = (data.get('name') || '').toString().trim() || 'Меҳмон';
      message = [
        '⭐ ОТЗЫВ — TAJ SPA',
        'Ном: ' + name,
        'Баҳо: ' + data.get('rating'),
        'Назари ман: ' + (data.get('message') || '').toString().trim()
      ].join('\n');
    } else {
      message = [
        '✉️ МУРОҶИАТ БА TAJ SPA',
        'Навъ: ' + data.get('type'),
        'Ном: ' + ((data.get('name') || '').toString().trim() || 'Нишон дода нашудааст'),
        'Барои тамос: ' + ((data.get('contact') || '').toString().trim() || 'Нишон дода нашудааст'),
        'Паём: ' + (data.get('message') || '').toString().trim()
      ].join('\n');
    }

    window.open('https://www.instagram.com/_tajspa/', '_blank', 'noopener,noreferrer');
    const copied = await copyMessage(message);

    if (copied) {
      showToast('Матн нусхабардорӣ шуд. Дар Instagram Direct онро гузошта, фиристед.');
    } else {
      window.prompt('Матни паёмро нусха карда, ба Instagram Direct гузоред:', message);
      showToast('Instagram кушода шуд. Матнро аз равзанаи пайдошуда нусха кунед.');
    }
  }

  const reviewForm = document.querySelector('#review-form');
  if (reviewForm) reviewForm.addEventListener('submit', (event) => handleFeedback(event, 'review'));

  const complaintForm = document.querySelector('#complaint-form');
  if (complaintForm) complaintForm.addEventListener('submit', (event) => handleFeedback(event, 'complaint'));
})();