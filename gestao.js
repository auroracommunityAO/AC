const COLLECTIONS_KEY = 'aurora-flowers-collections-v1';
const ACCESS_KEY = 'aurora-flowers-owner-access-v1';
const MAX_IMAGE_SIZE = 2.5 * 1024 * 1024;

const DEFAULT_COLLECTIONS = [];

const $ = (selector) => document.querySelector(selector);
const normalize = (value = '') => String(value).trim().toLocaleLowerCase('pt-PT').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const uid = () => `collection-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function readCollections() {
  try {
    const saved = localStorage.getItem(COLLECTIONS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_COLLECTIONS;
  } catch {
    return DEFAULT_COLLECTIONS;
  }
}

function saveCollections(collections) {
  localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
  window.dispatchEvent(new StorageEvent('storage', { key: COLLECTIONS_KEY }));
}

function showMessage(message, type = '') {
  const target = $('#management-message');
  if (!target) return;
  target.textContent = message;
  target.className = `form-message ${type}`;
  window.clearTimeout(showMessage.timer);
  showMessage.timer = window.setTimeout(() => { target.textContent = ''; target.className = 'form-message'; }, 5000);
}

async function hashText(value) {
  if (window.crypto?.subtle) {
    const bytes = new TextEncoder().encode(value);
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return window.btoa(unescape(encodeURIComponent(value)));
}

function isValidCollection(collection) {
  return Boolean(collection.id && collection.title?.trim() && collection.description?.trim() && collection.category?.trim() && ['published', 'archived'].includes(collection.status));
}

function duplicateReason(candidate, existing, editingId = '') {
  return existing.some((item) => item.id !== editingId && (
    item.id === candidate.id ||
    normalize(item.title) === normalize(candidate.title) ||
    (candidate.externalUrl && item.externalUrl && item.externalUrl === candidate.externalUrl)
  ));
}

function renderStats(collections) {
  $('#stat-total').textContent = collections.length;
  $('#stat-published').textContent = collections.filter((item) => item.status === 'published').length;
  $('#stat-archived').textContent = collections.filter((item) => item.status === 'archived').length;
}

function renderList() {
  const list = $('#management-list');
  if (!list) return;
  const collections = readCollections();
  renderStats(collections);
  const term = normalize($('#management-search')?.value || '');
  const status = $('#management-status')?.value || 'all';
  const filtered = collections.filter((item) => (status === 'all' || item.status === status) && (!term || normalize(`${item.title} ${item.description} ${item.category} ${item.id}`).includes(term))).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || a.title.localeCompare(b.title, 'pt'));

  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state compact"><span class="empty-state-mark">✦</span><h3>Nenhum registo encontrado.</h3><p>Ajuste o filtro ou crie uma nova coleção.</p></div>';
    return;
  }

  list.innerHTML = filtered.map((item) => `
    <article class="management-item ${item.status === 'archived' ? 'is-archived' : ''}">
      <div class="management-item-cover">${item.cover ? `<img src="${escapeHtml(item.cover)}" alt="" loading="lazy">` : '<span>✦</span>'}</div>
      <div class="management-item-main"><div class="collection-card-meta"><span>${escapeHtml(item.category)}</span><span class="status-badge ${item.status}">${item.status === 'published' ? 'Publicada' : 'Arquivada'}</span></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p><small>Actualizada em ${formatDate(item.updatedAt)}</small></div>
      <div class="management-item-actions"><button type="button" class="btn btn-quiet" data-edit="${escapeHtml(item.id)}">Editar</button><button type="button" class="btn btn-quiet" data-toggle="${escapeHtml(item.id)}">${item.status === 'published' ? 'Arquivar' : 'Publicar'}</button><button type="button" class="btn btn-danger" data-delete="${escapeHtml(item.id)}">Eliminar</button></div>
    </article>`).join('');
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
}

function formatDate(value) {
  if (!value) return 'sem data';
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium' }).format(new Date(value));
}

function openEditor(collection = null) {
  $('#collection-form').reset();
  $('#collection-id').value = collection?.id || '';
  $('#collection-title').value = collection?.title || '';
  $('#collection-category-input').value = collection?.category || '';
  $('#collection-description').value = collection?.description || '';
  $('#collection-url').value = collection?.externalUrl || '';
  $('#collection-order').value = collection?.order ?? (readCollections().length + 1);
  $('#collection-form').dataset.currentCover = collection?.cover || '';
  $('#modal-title').textContent = collection ? 'Editar coleção' : 'Nova coleção';
  const currentCover = $('#current-cover');
  currentCover.hidden = !collection?.cover;
  currentCover.innerHTML = collection?.cover ? `<img src="${escapeHtml(collection.cover)}" alt="Capa actual"> <button type="button" class="btn btn-quiet" id="remove-cover">Remover capa</button>` : '';
  $('#collection-modal').hidden = false;
  $('#collection-title').focus();
}

function closeEditor() {
  $('#collection-modal').hidden = true;
}

function readCover(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    if (file.size > MAX_IMAGE_SIZE) return reject(new Error('A imagem ultrapassa o limite de 2,5 MB.'));
    if (!file.type.startsWith('image/')) return reject(new Error('Escolha um ficheiro de imagem válido.'));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

async function handleCollectionSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const id = $('#collection-id').value || uid();
  const current = readCollections();
  const existing = current.find((item) => item.id === id);
  const candidate = {
    id,
    title: $('#collection-title').value.trim(),
    description: $('#collection-description').value.trim(),
    category: $('#collection-category-input').value.trim(),
    externalUrl: $('#collection-url').value.trim(),
    cover: form.dataset.currentCover || '',
    status: existing?.status || 'published',
    order: Math.max(0, Number($('#collection-order').value) || 0),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const message = $('#form-message');
  message.textContent = '';
  if (!isValidCollection(candidate)) {
    message.textContent = 'Preencha o título, a descrição e a categoria.';
    message.className = 'form-message error';
    return;
  }
  if (duplicateReason(candidate, current, existing ? id : '')) {
    message.textContent = 'Já existe uma coleção com este título ou ligação. Reveja o conteúdo antes de guardar.';
    message.className = 'form-message error';
    return;
  }
  try {
    const selectedFile = $('#collection-cover').files[0];
    if (selectedFile) candidate.cover = await readCover(selectedFile);
    const next = existing ? current.map((item) => item.id === id ? candidate : item) : [...current, candidate];
    saveCollections(next);
    closeEditor();
    renderList();
    showMessage(existing ? 'Coleção actualizada e publicada localmente.' : 'Coleção criada e publicada localmente.', 'success');
  } catch (error) {
    message.textContent = error.message;
    message.className = 'form-message error';
  }
}

function handleListAction(event) {
  const editId = event.target.dataset.edit;
  const toggleId = event.target.dataset.toggle;
  const deleteId = event.target.dataset.delete;
  const collections = readCollections();
  if (editId) openEditor(collections.find((item) => item.id === editId));
  if (toggleId) {
    const item = collections.find((entry) => entry.id === toggleId);
    if (!item) return;
    const nextStatus = item.status === 'published' ? 'archived' : 'published';
    saveCollections(collections.map((entry) => entry.id === toggleId ? { ...entry, status: nextStatus, updatedAt: new Date().toISOString() } : entry));
    renderList();
    showMessage(nextStatus === 'published' ? 'Coleção publicada.' : 'Coleção arquivada.', 'success');
  }
  if (deleteId) {
    const item = collections.find((entry) => entry.id === deleteId);
    if (!item || !window.confirm(`Eliminar “${item.title}”? Esta acção não pode ser anulada.`)) return;
    saveCollections(collections.filter((entry) => entry.id !== deleteId));
    renderList();
    showMessage('Coleção eliminada.', 'success');
  }
}

function exportData() {
  const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), collections: readCollections() }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'aurora-collections.json';
  link.click();
  URL.revokeObjectURL(url);
  showMessage('Índice JSON exportado. Pode colocá-lo no repositório depois de rever o conteúdo.', 'success');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      const incoming = Array.isArray(payload) ? payload : payload.collections;
      if (!Array.isArray(incoming) || !incoming.every(isValidCollection)) throw new Error('O ficheiro não contém uma lista válida de coleções.');
      const ids = new Set();
      const titles = new Set();
      for (const item of incoming) {
        if (ids.has(item.id) || titles.has(normalize(item.title))) throw new Error('Foram encontradas coleções duplicadas no ficheiro.');
        ids.add(item.id); titles.add(normalize(item.title));
      }
      saveCollections(incoming);
      renderList();
      showMessage('Coleções importadas e validadas com sucesso.', 'success');
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

async function setupAccess() {
  const gate = $('#access-gate');
  const content = $('#management-content');
  const form = $('#access-form');
  const savedHash = localStorage.getItem(ACCESS_KEY);
  const sessionHash = sessionStorage.getItem(ACCESS_KEY);
  if (savedHash && sessionHash === savedHash) { gate.hidden = true; content.hidden = false; renderList(); }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const code = $('#access-code').value;
    const hash = await hashText(code);
    if (!savedHash) {
      localStorage.setItem(ACCESS_KEY, hash);
      sessionStorage.setItem(ACCESS_KEY, hash);
      gate.hidden = true; content.hidden = false; renderList();
      return;
    }
    if (hash !== savedHash) { $('#access-message').textContent = 'Código incorrecto. Tente novamente.'; $('#access-message').className = 'form-message error'; return; }
    sessionStorage.setItem(ACCESS_KEY, hash);
    gate.hidden = true; content.hidden = false; renderList();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupAccess();
  $('#new-collection')?.addEventListener('click', () => openEditor());
  $('#logout')?.addEventListener('click', () => { sessionStorage.removeItem(ACCESS_KEY); window.location.reload(); });
  $('#management-search')?.addEventListener('input', renderList);
  $('#management-status')?.addEventListener('change', renderList);
  $('#management-list')?.addEventListener('click', handleListAction);
  $('#collection-form')?.addEventListener('submit', handleCollectionSubmit);
  $('#export-data')?.addEventListener('click', exportData);
  $('#import-data')?.addEventListener('change', importData);
  document.querySelectorAll('[data-close-modal]').forEach((element) => element.addEventListener('click', closeEditor));
  $('#current-cover')?.addEventListener('click', (event) => {
    if (event.target.id === 'remove-cover') { $('#collection-form').dataset.currentCover = ''; $('#current-cover').hidden = true; }
  });
});
