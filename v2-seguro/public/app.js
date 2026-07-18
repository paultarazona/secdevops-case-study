'use strict';

const API_BASE = '/api';
let token = '';
let editingId = null;
let guidedInputLoaded = false;

const statusMessage = document.querySelector('#status');
const authSection = document.querySelector('#auth-section');
const workspace = document.querySelector('#workspace');
const authForm = document.querySelector('#auth-form');
const resourceForm = document.querySelector('#resource-form');
const resourceList = document.querySelector('#resource-list');

const lab = window.LabShell({
  mode: 'v2',
  counterpartUrl: 'http://localhost:43171/',
  onLessonAction(action, challenge) {
    if (action === 'verify-idor') {
      verifyIdor(challenge);
      return;
    }
    if (action === 'verify-upload') { verifyUpload(challenge); return; }
    if (action === 'verify-password-storage') { verifyPasswordStorage(); return; }
    if (action === 'verify-jwt-lifecycle') { verifyJwtLifecycle(); return; }
    if (action === 'verify-security-configuration') { verifySecurityConfiguration(); return; }
    if (action === 'verify-hardcoded-secrets') { verifyHardcodedSecrets(); return; }
    const input = window.LAB_GUIDED_LOGIN;
    document.querySelector('#username').value = input.username;
    document.querySelector('#password').value = input.password;
    guidedInputLoaded = true;
    authSection.hidden = false;
    workspace.hidden = true;
    document.querySelector('#username').focus();
    showStatus('Guided local input loaded. Submit the existing sign-in form to verify the hardened behavior.');
  },
});

async function verifyIdor(challenge) {
  if (!token) { showStatus('Sign in as alice first, then verify access to the controlled resource.', true); return; }
  try {
    await request(`/resources/${challenge.targetResourceId}`);
    showStatus('The controlled resource was unexpectedly returned.', true);
  } catch (error) {
    if (error.status === 404) { lab.markVerified('idor'); showStatus('V2 behavior verified locally: the controlled resource is hidden by the ownership check.'); return; }
    showStatus(error.message, true);
  }
}

async function verifyJwtLifecycle() { if (!token) { showStatus('Sign in first, then inspect token lifecycle evidence.', true); return; } try { const { body } = await request('/lab/jwt-lifecycle'); if (!body.algorithmPinned || !body.refreshRotation || !body.separateRefreshSecret) throw new Error('Expected hardened lifecycle evidence.'); lab.markVerified('jwt-lifecycle'); showStatus(`V2 behavior verified locally: access tokens expire in ${body.accessTokenExpiresIn} and refresh tokens rotate.`); } catch (error) { showStatus(error.message, true); } }
async function verifySecurityConfiguration() { if (!token) { showStatus('Sign in first, then inspect configuration evidence.', true); return; } try { const { body } = await request('/lab/security-configuration'); if (body.cors !== 'single-origin' || !body.securityHeaders || !body.authRateLimit) throw new Error('Expected hardened configuration evidence.'); lab.markVerified('security-configuration'); showStatus('V2 behavior verified locally: CORS, headers, rate limits, and error boundaries are hardened.'); } catch (error) { showStatus(error.message, true); } }
async function verifyHardcodedSecrets() { if (!token) { showStatus('Sign in first, then inspect secret handling evidence.', true); return; } try { const { body } = await request('/lab/hardcoded-secrets'); if (body.secretSource !== 'environment' || body.secretExposed || body.configurationIsHardcoded) throw new Error('Expected protected secret handling evidence.'); lab.markVerified('hardcoded-secrets'); showStatus('V2 behavior verified locally: secrets come from environment configuration and are not exposed.'); } catch (error) { showStatus(error.message, true); } }

async function verifyPasswordStorage() {
  if (!token) { showStatus('Sign in first, then inspect the local storage evidence.', true); return; }
  try { const { body } = await request('/lab/password-storage'); if (body.storage !== 'bcrypt' || body.hashExposed) throw new Error('Expected protected password storage evidence.'); lab.markVerified('password-storage'); showStatus(`V2 behavior verified locally: bcrypt uses ${body.rounds} rounds and the hash is not exposed.`); } catch (error) { showStatus(error.message, true); }
}

async function verifyUpload(challenge) {
  if (!token) { showStatus('Sign in as alice first, then verify the controlled upload.', true); return; }
  const data = new FormData();
  data.append('file', new Blob(['Controlled V2 upload lesson.'], { type: 'text/plain' }), '../../lab-upload-v2.txt');
  try {
    const { body } = await request(`/resources/${challenge.targetResourceId}/upload`, { method: 'POST', body: data });
    if (body.filename.includes('/') || body.filename.includes('..')) throw new Error('The server retained a client-controlled path.');
    lab.markVerified('upload-traversal');
    showStatus('V2 behavior verified locally: the upload received a server-generated filename.');
  } catch (error) { showStatus(error.message, true); }
}

function showStatus(message, isError = false) { statusMessage.textContent = message; statusMessage.classList.toggle('is-error', isError); }
async function request(path, options = {}) {
  const headers = new Headers(options.headers); if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : null;
  if (!response.ok) { const error = new Error(body?.error || `Request failed (${response.status})`); error.status = response.status; throw error; }
  return { response, body };
}
function signOut() { token = ''; editingId = null; authSection.hidden = false; workspace.hidden = true; resourceForm.reset(); showStatus('Signed out.'); }
function createButton(label, className, action, id) { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.className = className; button.dataset.action = action; button.dataset.id = id; return button; }
function renderResources(resources) {
  resourceList.replaceChildren();
  if (!resources.length) { const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = 'No resources yet. Create the first one from the form.'; resourceList.append(empty); return; }
  for (const resource of resources) {
    const card = document.createElement('article'); card.className = 'resource-card';
    const title = document.createElement('h3'); title.textContent = resource.title;
    const content = document.createElement('p'); content.textContent = resource.content || 'No content provided.';
    const meta = document.createElement('p'); meta.className = 'resource-meta'; meta.textContent = `RESOURCE #${resource.id}${resource.file_path ? ' / FILE ATTACHED' : ''}`;
    const actions = document.createElement('div'); actions.className = 'resource-actions'; actions.append(createButton('Edit', 'secondary', 'edit', resource.id), createButton('Delete', 'danger', 'delete', resource.id)); if (resource.file_path) actions.append(createButton('Download file', 'secondary', 'download', resource.id));
    const upload = document.createElement('form'); upload.className = 'upload-form'; upload.dataset.id = resource.id;
    const file = document.createElement('input'); file.type = 'file'; file.name = 'file'; file.required = true; file.setAttribute('aria-label', `File to upload for ${resource.title}`);
    const submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = 'Upload file'; upload.append(file, submit);
    card.append(title, content, meta, actions, upload); resourceList.append(card);
  }
}
async function loadResources() { const { body } = await request('/resources'); renderResources(body); }
function resetResourceForm() { editingId = null; resourceForm.reset(); document.querySelector('#resource-form-title').textContent = 'Create a resource'; document.querySelector('#resource-submit').textContent = 'Save resource'; document.querySelector('#cancel-edit').hidden = true; }

authForm.addEventListener('submit', async (event) => {
  event.preventDefault(); const action = event.submitter?.value || 'login'; const data = Object.fromEntries(new FormData(authForm));
  try {
    if (action === 'register') { await request('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); showStatus('Account created. Sign in with these credentials.'); return; }
    const { body } = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    token = body.token; authSection.hidden = true; workspace.hidden = false; document.querySelector('#current-user').textContent = body.user.username; guidedInputLoaded = false; showStatus(`Signed in as ${body.user.username}.`); await loadResources();
  } catch (error) {
    if (guidedInputLoaded && lab.selectedId() === 'sql-injection') { lab.markVerified('sql-injection'); guidedInputLoaded = false; showStatus('V2 behavior verified locally: the guided input was rejected and query details remain protected.'); return; }
    showStatus(error.message, true);
  }
});
resourceForm.addEventListener('submit', async (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(resourceForm)); try { await request(editingId ? `/resources/${editingId}` : '/resources', { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); showStatus(editingId ? 'Resource updated.' : 'Resource created.'); resetResourceForm(); await loadResources(); } catch (error) { showStatus(error.message, true); } });
resourceList.addEventListener('click', async (event) => { const button = event.target.closest('button[data-action]'); if (!button) return; const { id, action } = button.dataset; try { if (action === 'edit') { const { body } = await request(`/resources/${id}`); editingId = id; document.querySelector('#resource-title').value = body.title; document.querySelector('#resource-content').value = body.content || ''; document.querySelector('#resource-form-title').textContent = `Edit resource #${id}`; document.querySelector('#resource-submit').textContent = 'Save changes'; document.querySelector('#cancel-edit').hidden = false; return; } if (action === 'delete') { if (!window.confirm('Delete this resource?')) return; await request(`/resources/${id}`, { method: 'DELETE' }); showStatus('Resource deleted.'); await loadResources(); return; } const { response } = await request(`/resources/${id}/file`); const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = url; link.download = ''; link.click(); URL.revokeObjectURL(url); } catch (error) { showStatus(error.message, true); } });
resourceList.addEventListener('submit', async (event) => { const form = event.target.closest('.upload-form'); if (!form) return; event.preventDefault(); try { await request(`/resources/${form.dataset.id}/upload`, { method: 'POST', body: new FormData(form) }); showStatus('File uploaded.'); await loadResources(); } catch (error) { showStatus(error.message, true); } });
document.querySelector('#logout').addEventListener('click', signOut);
document.querySelector('#refresh-resources').addEventListener('click', () => loadResources().catch((error) => showStatus(error.message, true)));
document.querySelector('#cancel-edit').addEventListener('click', resetResourceForm);
