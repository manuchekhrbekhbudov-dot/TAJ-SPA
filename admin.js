(() => {
  const $ = (selector) => document.querySelector(selector);
  const setupWarning = $('#setup-warning');
  const loginPanel = $('#login-panel');
  const loginForm = $('#admin-login-form');
  const loginMessage = $('#login-message');
  const loginSubmit = $('#login-submit');
  const dashboard = $('#dashboard');
  const inboxMessage = $('#inbox-message');
  const list = $('#feedback-list');

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
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  const kindLabels = {
    review: 'Отзыв',
    complaint: 'Шикоят',
    suggestion: 'Пешниҳод',
    question: 'Савол',
    thanks: 'Ташаккур'
  };
  const statusLabels = { new: 'Нав', read: 'Хонда шуд', resolved: 'Ҳал шуд' };
  let records = [];
  let currentUser = null;

  const showMessage = (element, message, type = 'error') => {
    if (!element) return;
    element.textContent = message || '';
    element.classList.toggle('message-success', type === 'success');
  };

  if (!configured) {
    setupWarning.hidden = false;
    loginSubmit.disabled = true;
    showMessage(loginMessage, 'Аввал supabase-config.js ва пойгоҳи маълумотро танзим кунед.');
  } else {
    setupWarning.hidden = true;
  }

  $('#year').textContent = new Date().getFullYear();

  function makeElement(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = String(text);
    return el;
  }

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat('tg-TJ', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(value));
    } catch (_) {
      return new Date(value).toLocaleString();
    }
  }

  async function enterDashboard(user) {
    if (!db || !user) return;
    showMessage(loginMessage, 'Иҷозат санҷида мешавад…');
    const { data: admin, error } = await db
      .from('spa_admins')
      .select('user_id, display_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !admin) {
      await db.auth.signOut();
      loginPanel.hidden = false;
      dashboard.hidden = true;
      const reason = error
        ? 'Ҷадвали spa_admins дастрас нест. Файли supabase-setup.sql-ро иҷро кунед.'
        : 'Ин аккаунт ҳанӯз администратор нест. UUID-и корбарро ба ҷадвали spa_admins илова кунед.';
      showMessage(loginMessage, reason);
      return;
    }

    currentUser = user;
    loginPanel.hidden = true;
    dashboard.hidden = false;
    $('#admin-display-name').textContent = admin.display_name || 'TAJ SPA Admin';
    $('#admin-email-display').textContent = user.email || '';
    showMessage(loginMessage, '');
    await loadFeedback();
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!db) {
      showMessage(loginMessage, 'Пайвасти Supabase ҳоло танзим нашудааст.');
      return;
    }
    if (!loginForm.reportValidity()) return;
    loginSubmit.disabled = true;
    loginSubmit.textContent = 'Санҷида мешавад…';
    showMessage(loginMessage, '');
    try {
      const email = $('#admin-email').value.trim();
      const password = $('#admin-password').value;
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error) {
        showMessage(loginMessage, 'Воридшавӣ нашуд. Email ё паролро санҷед.');
        return;
      }
      await enterDashboard(data.user);
    } catch (error) {
      showMessage(loginMessage, 'Ба Supabase пайваст шуда нашуд. Танзими URL ва калидро санҷед.');
    } finally {
      loginSubmit.disabled = false;
      loginSubmit.innerHTML = 'Ворид шудан <span>↗</span>';
    }
  });

  async function loadFeedback() {
    if (!db || !currentUser) return;
    list.replaceChildren();
    showMessage(inboxMessage, 'Муроҷиатҳо бор шуда истодаанд…', 'info');
    try {
      const { data, error } = await db
        .from('spa_feedback')
        .select('id,kind,name,contact,rating,message,status,created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        records = [];
        showMessage(inboxMessage, 'Муроҷиатҳоро хонда нашуд. Иҷозатҳои RLS ва файли supabase-setup.sql-ро санҷед.');
        renderFeedback();
        return;
      }
      records = Array.isArray(data) ? data : [];
      showMessage(inboxMessage, '');
      updateStats();
      renderFeedback();
    } catch (_) {
      showMessage(inboxMessage, 'Хатои пайвастшавӣ. Интернет ва танзимоти Supabase-ро санҷед.');
    }
  }

  function updateStats() {
    $('#stat-new').textContent = records.filter((item) => item.status === 'new').length;
    $('#stat-read').textContent = records.filter((item) => item.status === 'read').length;
    $('#stat-resolved').textContent = records.filter((item) => item.status === 'resolved').length;
  }

  function appendMeta(container, label, value) {
    if (value === undefined || value === null || value === '') return;
    container.appendChild(makeElement('span', '', label + ': ' + value));
  }

  function renderFeedback() {
    list.replaceChildren();
    const statusFilter = $('#status-filter').value;
    const kindFilter = $('#kind-filter').value;
    const searchTerm = $('#search-box').value.trim().toLocaleLowerCase();

    const visible = records.filter((item) => {
      const statusOk = statusFilter === 'all' || item.status === statusFilter;
      const kindOk = kindFilter === 'all' || item.kind === kindFilter;
      const searchable = [item.name, item.contact, item.message, kindLabels[item.kind]]
        .filter(Boolean).join(' ').toLocaleLowerCase();
      return statusOk && kindOk && searchable.includes(searchTerm);
    });

    $('#result-count').textContent = visible.length + ' аз ' + records.length + ' муроҷиат';
    if (!visible.length) {
      const empty = makeElement('div', 'empty-state');
      empty.appendChild(makeElement('strong', '', records.length ? 'Натиҷа ёфт нашуд' : 'Ҳоло муроҷиат нест'));
      empty.appendChild(makeElement('span', '', records.length
        ? 'Филтр ё матни ҷустуҷӯро дигар кунед.'
        : 'Вақте меҳмон отзыв ё шикоят фиристад, он дар ҳамин ҷо пайдо мешавад.'));
      list.appendChild(empty);
      return;
    }

    visible.forEach((item) => {
      const card = makeElement('article', 'feedback-card status-' + item.status);
      const top = makeElement('div', 'feedback-card-top');
      const badges = makeElement('div', 'feedback-badges');
      badges.appendChild(makeElement('span', 'kind-pill', kindLabels[item.kind] || item.kind));
      badges.appendChild(makeElement('span', 'status-pill status-' + item.status, statusLabels[item.status] || item.status));
      top.appendChild(badges);
      top.appendChild(makeElement('time', 'feedback-date', formatDate(item.created_at)));
      card.appendChild(top);

      const title = item.kind === 'review'
        ? 'Отзыв аз ' + (item.name || 'Меҳмон')
        : (kindLabels[item.kind] || 'Муроҷиат') + ' аз ' + (item.name || 'Меҳмон');
      card.appendChild(makeElement('h3', 'feedback-title', title));
      const meta = makeElement('div', 'feedback-meta');
      appendMeta(meta, 'Тамос', item.contact);
      if (item.kind === 'review' && item.rating) appendMeta(meta, 'Баҳо', item.rating + '/5');
      if (meta.childNodes.length) card.appendChild(meta);
      card.appendChild(makeElement('p', 'feedback-message', item.message || ''));

      const actions = makeElement('div', 'feedback-actions');
      const statusLabel = makeElement('label', '', 'Вазъият');
      const statusSelect = document.createElement('select');
      statusSelect.setAttribute('aria-label', 'Тағйир додани вазъияти муроҷиат');
      [['new','Нав'],['read','Хонда шуд'],['resolved','Ҳал шуд']].forEach(([value, label]) => {
        const option = makeElement('option', '', label);
        option.value = value;
        option.selected = item.status === value;
        statusSelect.appendChild(option);
      });
      statusSelect.addEventListener('change', () => updateStatus(item.id, statusSelect.value));
      statusLabel.appendChild(statusSelect);
      actions.appendChild(statusLabel);

      const deleteButton = makeElement('button', 'delete-button', 'Нест кардан');
      deleteButton.type = 'button';
      deleteButton.addEventListener('click', () => deleteFeedback(item.id));
      actions.appendChild(deleteButton);
      card.appendChild(actions);
      list.appendChild(card);
    });
  }

  async function updateStatus(id, status) {
    if (!db || !currentUser) return;
    showMessage(inboxMessage, 'Вазъият нав карда мешавад…', 'info');
    const { error } = await db.from('spa_feedback').update({ status }).eq('id', id);
    if (error) {
      showMessage(inboxMessage, 'Вазъият нав нашуд. Иҷозати администраторро санҷед.');
      await loadFeedback();
      return;
    }
    const item = records.find((record) => record.id === id);
    if (item) item.status = status;
    updateStats();
    renderFeedback();
    showMessage(inboxMessage, 'Вазъият сабт шуд.', 'success');
  }

  async function deleteFeedback(id) {
    if (!db || !currentUser || !window.confirm('Ин муроҷиат пурра нест карда шавад?')) return;
    const { error } = await db.from('spa_feedback').delete().eq('id', id);
    if (error) {
      showMessage(inboxMessage, 'Муроҷиат нест карда нашуд. Иҷозатҳои администраторро санҷед.');
      return;
    }
    records = records.filter((record) => record.id !== id);
    updateStats();
    renderFeedback();
    showMessage(inboxMessage, 'Муроҷиат нест карда шуд.', 'success');
  }

  $('#refresh-btn').addEventListener('click', loadFeedback);
  $('#logout-btn').addEventListener('click', async () => {
    if (db) await db.auth.signOut();
    currentUser = null;
    records = [];
    dashboard.hidden = true;
    loginPanel.hidden = false;
    $('#admin-password').value = '';
    showMessage(loginMessage, 'Шумо аз система баромадед.', 'success');
  });
  $('#search-box').addEventListener('input', renderFeedback);
  $('#status-filter').addEventListener('change', renderFeedback);
  $('#kind-filter').addEventListener('change', renderFeedback);

  if (db) {
    db.auth.getSession()
      .then(({ data }) => {
        if (data && data.session && data.session.user) return enterDashboard(data.session.user);
      })
      .catch(() => showMessage(loginMessage, 'Сессияи воридшавӣ хонда нашуд.'));
  }
})();