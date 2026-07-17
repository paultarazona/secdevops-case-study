'use strict';

const API_BASE = '/api';
let token = '';
let editingId = null;
const statusMessage = document.querySelector('#status');
const authSection = document.querySelector('#auth-section');
const workspace = document.querySelector('#workspace');
const authForm = document.querySelector('#auth-form');
const resourceForm = document.querySelector('#resource-form');
const resourceList = document.querySelector('#resource-list');

function showStatus(message, isError = false) { statusMessage.textContent = message; statusMessage.classList.toggle('is-error', isError); }
async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : null;
  if (!response.ok) throw new Error(body?.error || body?.message || `Request failed (${response.status})`);
  return { response, body };
}
function signOut() { token = ''; editingId = null; authSection.hidden = false; workspace.hidden = true; resourceForm.reset(); showStatus('Signed out.'); }
function button(label, className, action, id) { const element = document.createElement('button'); element.type = 'button'; element.textContent = label; element.className = className; element.dataset.action = action; element.dataset.id = id; return element; }
function renderResources(resources) {
  resourceList.replaceChildren();
  if (!resources.length) { const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = 'No resources yet. Create the first one from the form.'; resourceList.append(empty); return; }
  for (const resource of resources) {
    const card = document.createElement('article'); card.className = 'resource-card';
    const title = document.createElement('h3'); title.textContent = resource.title;
    const content = document.createElement('p'); content.textContent = resource.content || 'No content provided.';
    const meta = document.createElement('p'); meta.className = 'resource-meta'; meta.textContent = `RESOURCE #${resource.id}${resource.file_path ? ' / FILE ATTACHED' : ''}`;
    const actions = document.createElement('div'); actions.className = 'resource-actions'; actions.append(button('Edit', 'secondary', 'edit', resource.id), button('Delete', 'danger', 'delete', resource.id)); if (resource.file_path) actions.append(button('Download file', 'secondary', 'download', resource.id));
    const upload = document.createElement('form'); upload.className = 'upload-form'; upload.dataset.id = resource.id;
    const file = document.createElement('input'); file.type = 'file'; file.name = 'file'; file.required = true; file.setAttribute('aria-label', `File to upload for ${resource.title}`);
    const submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = 'Upload file'; upload.append(file, submit);
    card.append(title, content, meta, actions, upload); resourceList.append(card);
  }
}
async function loadResources() { const { body } = await request('/resources'); renderResources(body); }
function resetResourceForm() { editingId = null; resourceForm.reset(); document.querySelector('#resource-form-title').textContent = 'Create a resource'; document.querySelector('#resource-submit').textContent = 'Save resource'; document.querySelector('#cancel-edit').hidden = true; }
authForm.addEventListener('submit', async (event) => { event.preventDefault(); const action = event.submitter?.value || 'login'; const data = Object.fromEntries(new FormData(authForm)); try { if (action === 'register') { await request('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); showStatus('Account created. Sign in with these credentials.'); return; } const { body } = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); token = body.token; authSection.hidden = true; workspace.hidden = false; document.querySelector('#current-user').textContent = body.user.username; showStatus(`Signed in as ${body.user.username}.`); await loadResources(); } catch (error) { showStatus(error.message, true); } });
resourceForm.addEventListener('submit', async (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(resourceForm)); try { await request(editingId ? `/resources/${editingId}` : '/resources', { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); showStatus(editingId ? 'Resource updated.' : 'Resource created.'); resetResourceForm(); await loadResources(); } catch (error) { showStatus(error.message, true); } });
resourceList.addEventListener('click', async (event) => { const action = event.target.closest('button[data-action]'); if (!action) return; const { id } = action.dataset; try { if (action.dataset.action === 'edit') { const { body } = await request(`/resources/${id}`); editingId = id; document.querySelector('#resource-title').value = body.title; document.querySelector('#resource-content').value = body.content || ''; document.querySelector('#resource-form-title').textContent = `Edit resource #${id}`; document.querySelector('#resource-submit').textContent = 'Save changes'; document.querySelector('#cancel-edit').hidden = false; return; } if (action.dataset.action === 'delete') { if (!window.confirm('Delete this resource?')) return; await request(`/resources/${id}`, { method: 'DELETE' }); showStatus('Resource deleted.'); await loadResources(); return; } const { response } = await request(`/resources/${id}/file`); const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = url; link.download = ''; link.click(); URL.revokeObjectURL(url); } catch (error) { showStatus(error.message, true); } });
resourceList.addEventListener('submit', async (event) => { const form = event.target.closest('.upload-form'); if (!form) return; event.preventDefault(); try { await request(`/resources/${form.dataset.id}/upload`, { method: 'POST', body: new FormData(form) }); showStatus('File uploaded.'); await loadResources(); } catch (error) { showStatus(error.message, true); } });
document.querySelector('#logout').addEventListener('click', signOut); document.querySelector('#refresh-resources').addEventListener('click', () => loadResources().catch((error) => showStatus(error.message, true))); document.querySelector('#cancel-edit').addEventListener('click', resetResourceForm);
function demoId(selector) { const value = document.querySelector(selector).value.trim(); if (!/^\d+$/.test(value)) throw new Error('Enter a numeric resource ID.'); return value; }
document.querySelector('#sqli-demo').addEventListener('click', () => { document.querySelector('#username').value = "' OR '1'='1' -- "; document.querySelector('#password').value = 'unused'; authSection.hidden = false; workspace.hidden = true; showStatus('SQL injection payload loaded. Submit Sign in to run the local demonstration.'); });
document.querySelector('#idor-read').addEventListener('click', async () => { try { const { body } = await request(`/resources/${demoId('#idor-id')}`); showStatus(`IDOR read result: ${body.title} - ${body.content || 'no content'}`); } catch (error) { showStatus(error.message, true); } });
document.querySelector('#idor-update').addEventListener('click', async () => { try { const id = demoId('#idor-id'); const { body: existing } = await request(`/resources/${id}`); await request(`/resources/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: existing.title, content: document.querySelector('#idor-content').value }) }); showStatus(`IDOR update applied to resource #${id}.`); await loadResources(); } catch (error) { showStatus(error.message, true); } });
document.querySelector('#idor-delete').addEventListener('click', async () => { try { const id = demoId('#idor-id'); if (!window.confirm(`Delete resource #${id} through the local IDOR demonstration?`)) return; await request(`/resources/${id}`, { method: 'DELETE' }); showStatus(`IDOR delete applied to resource #${id}.`); await loadResources(); } catch (error) { showStatus(error.message, true); } });
document.querySelector('#traversal-demo').addEventListener('click', async () => { try { const data = new FormData(); data.append('file', new Blob(['Controlled local traversal demonstration.'], { type: 'text/plain' }), '../../frontend-demo.txt'); await request(`/resources/${demoId('#traversal-id')}/upload`, { method: 'POST', body: data }); showStatus('Traversal filename submitted.'); await loadResources(); } catch (error) { showStatus(error.message, true); } });
