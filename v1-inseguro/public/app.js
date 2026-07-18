'use strict';

const API_BASE = '/api';
let token = '';
let editingId = null;
let guidedInputLoaded = false;
let lab; // Initialized dynamically after translations load

// i18n State and Logic
let currentLang = localStorage.getItem('lang') || 'en';
let translations = {};

const statusMessage = document.querySelector('#status');
const authSection = document.querySelector('#auth-section');
const workspace = document.querySelector('#workspace');
const authForm = document.querySelector('#auth-form');
const resourceForm = document.querySelector('#resource-form');
const resourceList = document.querySelector('#resource-list');

// Translation lookup helper
function t(key, params = {}) {
  let val = translations[key] || key;
  for (const [k, v] of Object.entries(params)) {
    val = val.replaceAll(`{${k}}`, v);
  }
  return val;
}

// Expose translator globally for the LabShell module
window.t = t;

async function loadTranslations(lang) {
  try {
    const res = await fetch(`/locales/${lang}.json`);
    translations = await res.json();
    document.documentElement.lang = lang;
    translateDOM();
    updateLangButtons();
  } catch (err) {
    console.error('Failed to load translations:', err);
  }
}

function translateDOM() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (translations[key]) {
      el.textContent = t(key);
    }
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (translations[key]) {
      el.setAttribute('aria-label', t(key));
    }
  });
}

function updateLangButtons() {
  const btnEs = document.querySelector('#lang-es');
  const btnEn = document.querySelector('#lang-en');
  if (btnEs && btnEn) {
    if (currentLang === 'es') {
      btnEs.classList.remove('secondary');
      btnEs.style.background = 'var(--primary)';
      btnEs.style.color = '#fff';
      btnEs.style.borderColor = 'transparent';

      btnEn.classList.add('secondary');
      btnEn.style.background = 'transparent';
      btnEn.style.color = 'var(--primary)';
      btnEn.style.borderColor = 'var(--primary)';
    } else {
      btnEn.classList.remove('secondary');
      btnEn.style.background = 'var(--primary)';
      btnEn.style.color = '#fff';
      btnEn.style.borderColor = 'transparent';

      btnEs.classList.add('secondary');
      btnEs.style.background = 'transparent';
      btnEs.style.color = 'var(--primary)';
      btnEs.style.borderColor = 'var(--primary)';
    }
  }
}

async function switchLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  await loadTranslations(lang);
  if (lab && typeof lab.render === 'function') {
    lab.render();
  }
  if (token) {
    await loadResources();
  }
}

async function initI18n() {
  // Load translation keys first
  await loadTranslations(currentLang);

  // Now instantiate LabShell with translation keys ready
  lab = window.LabShell({
    mode: 'v1',
    counterpartUrl: 'http://localhost:43172/',
    onLessonAction(action, challenge) {
      if (action === 'verify-idor') {
        verifyIdor(challenge);
        return;
      }
      if (action === 'verify-upload') {
        verifyUpload(challenge);
        return;
      }
      if (action === 'verify-password-storage') {
        verifyPasswordStorage();
        return;
      }
      if (action === 'verify-jwt-lifecycle') {
        verifyJwtLifecycle();
        return;
      }
      if (action === 'verify-security-configuration') {
        verifySecurityConfiguration();
        return;
      }
      if (action === 'verify-hardcoded-secrets') {
        verifyHardcodedSecrets();
        return;
      }
      const input = window.LAB_GUIDED_LOGIN;
      document.querySelector('#username').value = input.username;
      document.querySelector('#password').value = input.password;
      guidedInputLoaded = true;
      authSection.hidden = false;
      workspace.hidden = true;
      document.querySelector('#username').focus();
      showStatus(t('status_guided_input'));
    },
  });

  // Setup language switcher click events
  document.querySelector('#lang-es').addEventListener('click', () => switchLanguage('es'));
  document.querySelector('#lang-en').addEventListener('click', () => switchLanguage('en'));
}

async function verifyIdor(challenge) {
  if (!token) {
    showStatus(t('status_signin_alice'), true);
    return;
  }
  try {
    const { body } = await request(`/resources/${challenge.targetResourceId}`);
    lab.markVerified('idor');
    showStatus(t('status_idor_verified', { id: body.id, userId: body.user_id }));
  } catch (error) {
    showStatus(error.message, true);
  }
}

async function verifyJwtLifecycle() {
  if (!token) {
    showStatus(t('status_signin_jwt'), true);
    return;
  }
  try {
    const { body } = await request('/lab/jwt-lifecycle');
    if (body.accessTokenExpires || body.algorithmPinned) {
      throw new Error(t('status_jwt_unexpected'));
    }
    lab.markVerified('jwt-lifecycle');
    showStatus(t('status_jwt_verified'));
  } catch (error) {
    showStatus(error.message, true);
  }
}

async function verifyPasswordStorage() {
  if (!token) {
    showStatus(t('status_signin_pw'), true);
    return;
  }
  try {
    const { body } = await request('/lab/password-storage');
    if (body.storage !== 'plaintext') {
      throw new Error(t('status_password_storage_unexpected'));
    }
    lab.markVerified('password-storage');
    showStatus(t('status_pw_verified', { username: body.username }));
  } catch (error) {
    showStatus(error.message, true);
  }
}

async function verifySecurityConfiguration() {
  if (!token) {
    showStatus(t('status_signin_configuration'), true);
    return;
  }
  try {
    const { body } = await request('/lab/security-configuration');
    if (body.cors !== 'open' || body.securityHeaders || body.authRateLimit || !body.errorsExposeDetails) {
      throw new Error(t('status_configuration_unexpected'));
    }
    lab.markVerified('security-configuration');
    showStatus(t('status_configuration_verified'));
  } catch (error) {
    showStatus(error.message, true);
  }
}

async function verifyHardcodedSecrets() {
  if (!token) {
    showStatus(t('status_signin_secrets'), true);
    return;
  }
  try {
    const { body } = await request('/lab/hardcoded-secrets');
    if (body.secretSource !== 'source-code' || !body.secretExposed || !body.configurationIsHardcoded) {
      throw new Error(t('status_secrets_unexpected'));
    }
    lab.markVerified('hardcoded-secrets');
    showStatus(t('status_secrets_verified'));
  } catch (error) {
    showStatus(error.message, true);
  }
}

async function verifyUpload(challenge) {
  if (!token) {
    showStatus(t('status_signin_upload'), true);
    return;
  }
  const data = new FormData();
  data.append('file', new Blob(['Controlled V1 upload lesson.'], { type: 'text/plain' }), '../../lab-upload-v1.txt');
  try {
    const { body } = await request(`/resources/${challenge.targetResourceId}/upload`, { method: 'POST', body: data });
    lab.markVerified('upload-traversal');
    showStatus(t('status_upload_verified', { filename: body.filename }));
  } catch (error) {
    showStatus(error.message, true);
  }
}

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle('is-error', isError);
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : null;
  if (!response.ok) {
    throw new Error(body?.error || body?.message || `Request failed (${response.status})`);
  }
  return { response, body };
}

function signOut() {
  token = '';
  editingId = null;
  authSection.hidden = false;
  workspace.hidden = true;
  resourceForm.reset();
  showStatus(t('status_signed_out'));
}

function createButton(label, className, action, id) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.className = className;
  button.dataset.action = action;
  button.dataset.id = id;
  return button;
}

function renderResources(resources) {
  resourceList.replaceChildren();
  if (!resources.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = t('empty_resources');
    resourceList.append(empty);
    return;
  }
  for (const resource of resources) {
    const card = document.createElement('article');
    card.className = 'resource-card';
    const title = document.createElement('h3');
    title.textContent = resource.title;

    const content = document.createElement('p');
    content.textContent = resource.content || t('no_content');

    const meta = document.createElement('p');
    meta.className = 'resource-meta';
    meta.textContent = t('resource_meta', { id: resource.id }) + (resource.file_path ? t('file_attached') : '');

    const actions = document.createElement('div');
    actions.className = 'resource-actions';
    actions.append(
      createButton(t('edit_btn'), 'secondary', 'edit', resource.id),
      createButton(t('delete_btn'), 'danger', 'delete', resource.id)
    );
    if (resource.file_path) {
      actions.append(createButton(t('download_file_btn'), 'secondary', 'download', resource.id));
    }

    const upload = document.createElement('form');
    upload.className = 'upload-form';
    upload.dataset.id = resource.id;

    const file = document.createElement('input');
    file.type = 'file';
    file.name = 'file';
    file.required = true;
    file.setAttribute('aria-label', t('file_upload_aria', { title: resource.title }));

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = t('upload_file_btn');

    upload.append(file, submit);
    card.append(title, content, meta, actions, upload);
    resourceList.append(card);
  }
}

async function loadResources() {
  const { body } = await request('/resources');
  renderResources(body);
}

function resetResourceForm() {
  editingId = null;
  resourceForm.reset();
  document.querySelector('#resource-form-title').textContent = t('create_resource_title');
  document.querySelector('#resource-submit').textContent = t('save_resource_btn');
  document.querySelector('#cancel-edit').hidden = true;
}

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const action = event.submitter?.value || 'login';
  const data = Object.fromEntries(new FormData(authForm));
  try {
    if (action === 'register') {
      await request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      showStatus(t('status_account_created'));
      return;
    }
    const { body } = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    token = body.token;
    authSection.hidden = true;
    workspace.hidden = false;
    document.querySelector('#current-user').textContent = body.user.username;
    if (guidedInputLoaded && lab.selectedId() === 'sql-injection') {
      lab.markVerified('sql-injection');
      guidedInputLoaded = false;
      showStatus(t('status_sql_verified'));
    } else {
      showStatus(t('status_signed_in_as', { username: body.user.username }));
    }
    await loadResources();
  } catch (error) {
    showStatus(error.message, true);
  }
});

resourceForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(resourceForm));
  try {
    await request(editingId ? `/resources/${editingId}` : '/resources', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    showStatus(editingId ? t('status_resource_updated') : t('status_resource_created'));
    resetResourceForm();
    await loadResources();
  } catch (error) {
    showStatus(error.message, true);
  }
});

resourceList.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { id, action } = button.dataset;
  try {
    if (action === 'edit') {
      const { body } = await request(`/resources/${id}`);
      editingId = id;
      document.querySelector('#resource-title').value = body.title;
      document.querySelector('#resource-content').value = body.content || '';
      document.querySelector('#resource-form-title').textContent = t('edit_resource_title', { id: id });
      document.querySelector('#resource-submit').textContent = t('save_changes_btn');
      document.querySelector('#cancel-edit').hidden = false;
      return;
    }
    if (action === 'delete') {
      if (!window.confirm(t('confirm_delete'))) return;
      await request(`/resources/${id}`, { method: 'DELETE' });
      showStatus(t('status_resource_deleted'));
      await loadResources();
      return;
    }
    const { response } = await request(`/resources/${id}/file`);
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = '';
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    showStatus(error.message, true);
  }
});

resourceList.addEventListener('submit', async (event) => {
  const form = event.target.closest('.upload-form');
  if (!form) return;
  event.preventDefault();
  try {
    await request(`/resources/${form.dataset.id}/upload`, {
      method: 'POST',
      body: new FormData(form),
    });
    showStatus(t('status_file_uploaded'));
    await loadResources();
  } catch (error) {
    showStatus(error.message, true);
  }
});

document.querySelector('#logout').addEventListener('click', signOut);
document.querySelector('#refresh-resources').addEventListener('click', () =>
  loadResources().catch((error) => showStatus(error.message, true))
);
document.querySelector('#cancel-edit').addEventListener('click', resetResourceForm);

// Start i18n initialization
initI18n().catch(console.error);
