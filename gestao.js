const COLLECTIONS_KEY = 'aurora-flowers-collections-v1';
const MAX_IMAGE_SIZE = 2.5 * 1024 * 1024;

const DEFAULT_COLLECTIONS = [];

const $ = (selector) => document.querySelector(selector);
let managementSessionToken = '';
let repositoryFiles = [];
let currentFilePath = '';
let currentFileSha = '';
const GITHUB_REPOSITORY = { owner: 'auroracommunityAO', repo: 'AC', branch: 'main' };
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

function showFileMessage(message, type = '') {
  const target = $('#file-workspace-message');
  if (!target) return;
  target.textContent = message;
  target.className = `form-message ${type}`;
}

function githubHeaders() {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${managementSessionToken}`,
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

function githubContentsUrl(filePath = '') {
  const suffix = filePath ? `/${filePath.split('/').filter(Boolean).map(encodeURIComponent).join('/')}` : '';
  return `https://api.github.com/repos/${GITHUB_REPOSITORY.owner}/${GITHUB_REPOSITORY.repo}/contents${suffix}`;
}

function decodeGithubContent(value = '') {
  const binary = atob(value.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

function encodeGithubContent(value = '') {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
}

async function githubFilesApi(action, payload = {}) {
  const isList = action === 'list';
  const path = payload.path || '';
  const url = githubContentsUrl(path) + `?ref=${encodeURIComponent(GITHUB_REPOSITORY.branch)}`;
  const options = { method: isList || action === 'read' ? 'GET' : 'PUT', headers: githubHeaders() };
  if (action === 'write') {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify({
      message: payload.message || `chore: actualizar ${path}`,
      content: encodeGithubContent(payload.content || ''),
      branch: GITHUB_REPOSITORY.branch,
      ...(payload.sha ? { sha: payload.sha } : {})
    });
  }
  const response = await fetch(url, options);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) throw new Error('Token GitHub inválido ou expirado. Gere um token novo e tente novamente.');
    if (response.status === 403) throw new Error('GitHub recusou a operação. Confirme Contents: Read and write e o acesso ao repositório auroracommunityAO/AC.');
    if (response.status === 404) throw new Error('Repositório ou caminho não encontrado. Confirme o token, a conta e a branch main.');
    throw new Error(result.message || 'Não foi possível comunicar com o GitHub.');
  }
  if (action === 'list') {
    return { ok: true, repository: `${GITHUB_REPOSITORY.owner}/${GITHUB_REPOSITORY.repo}`, files: Array.isArray(result) ? result.filter((item) => item.type === 'file').map((item) => ({ name: item.name, path: item.path, sha: item.sha, size: item.size })) : [] };
  }
  if (action === 'read') {
    if (result.type !== 'file') throw new Error('O caminho indicado não é um ficheiro.');
    return { ok: true, file: { name: result.name, path: result.path, sha: result.sha, size: result.size, content: decodeGithubContent(result.content) } };
  }
  return { ok: true, commit: result.commit?.sha || '', file: result.content ? { path: result.content.path, sha: result.content.sha } : null };
}

async function verifyGithubToken(token) {
  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY.owner}/${GITHUB_REPOSITORY.repo}`, {
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
  });
  const result = await response.json().catch(() => ({}));
  if (response.status === 401) throw new Error('Token GitHub inválido ou expirado.');
  if (response.status === 404) throw new Error('O token não tem acesso ao repositório auroracommunityAO/AC ou o repositório não existe.');
  if (response.status === 403) throw new Error('GitHub recusou o token. Confirme a aprovação e as permissões do token.');
  if (!response.ok) throw new Error(result.message || 'Não foi possível validar o token GitHub.');
  if (!result.permissions?.push) throw new Error('O token foi aceite, mas não tem permissão de escrita. Active Contents: Read and write.');
  return result;
}

function setGithubStatus(text, type = '') {
  const status = $('#github-repository-status');
  if (!status) return;
  status.textContent = text;
  status.className = `workspace-status ${type}`;
}

function resetFileEditor() {
  currentFilePath = '';
  currentFileSha = '';
  $('#file-editor-title').textContent = 'Novo ficheiro';
  $('#file-editor-state').textContent = 'Rascunho';
  $('#file-path').value = '';
  $('#file-commit-message').value = '';
  $('#file-content').value = '';
  showFileMessage('');
}

function renderRepositoryFiles() {
  const list = $('#repository-file-list');
  if (!list) return;
  const term = normalize($('#file-search')?.value || '');
  const filtered = repositoryFiles.filter((file) => !term || normalize(file.path).includes(term));
  if (!filtered.length) {
    list.innerHTML = '<p class="workspace-empty">Nenhum ficheiro encontrado neste nível.</p>';
    return;
  }
  list.innerHTML = filtered.map((file) => `<button type="button" class="repository-file" data-file-path="${escapeHtml(file.path)}"><span>${escapeHtml(file.path)}</span><small>${file.size || 0} bytes</small></button>`).join('');
}

async function refreshRepositoryFiles() {
  if (!managementSessionToken) return;
  setGithubStatus('A carregar…');
  showFileMessage('A ler os ficheiros do repositório…');
  try {
    const result = await githubFilesApi('list');
    repositoryFiles = result.files || [];
    renderRepositoryFiles();
    setGithubStatus(result.repository, 'is-ready');
    showFileMessage(`${repositoryFiles.length} ficheiro(s) carregado(s).`, 'success');
  } catch (error) {
    setGithubStatus('Erro na integração', 'is-error');
    showFileMessage(error.message, 'error');
  }
}

async function openRepositoryFile(path) {
  try {
    showFileMessage(`A carregar ${path}…`);
    const result = await githubFilesApi('read', { path });
    currentFilePath = result.file.path;
    currentFileSha = result.file.sha;
    $('#file-editor-title').textContent = result.file.name;
    $('#file-editor-state').textContent = 'Ficheiro remoto';
    $('#file-path').value = result.file.path;
    $('#file-commit-message').value = `actualizar ${result.file.name}`;
    $('#file-content').value = result.file.content;
    showFileMessage('Ficheiro carregado. Pode editar e enviar uma nova versão.');
  } catch (error) {
    showFileMessage(error.message, 'error');
  }
}

function generateCollectionsFile() {
  const content = JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), collections: readCollections() }, null, 2);
  currentFilePath = '';
  currentFileSha = '';
  $('#file-editor-title').textContent = 'Índice de colecções gerado';
  $('#file-editor-state').textContent = 'Gerado localmente';
  $('#file-path').value = 'content/colecoes.json';
  $('#file-commit-message').value = 'feat: actualizar índice de colecções';
  $('#file-content').value = content;
  showFileMessage('Índice gerado a partir das colecções da Gestão. Reveja o conteúdo antes de enviar.', 'success');
}

function uploadProjectFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 1024 * 1024) { showFileMessage('O ficheiro excede o limite de 1 MB.', 'error'); event.target.value = ''; return; }
  const reader = new FileReader();
  reader.onload = () => {
    currentFilePath = '';
    currentFileSha = '';
    $('#file-editor-title').textContent = file.name;
    $('#file-editor-state').textContent = 'Carregado localmente';
    $('#file-path').value = file.name;
    $('#file-commit-message').value = `chore: adicionar ${file.name}`;
    $('#file-content').value = String(reader.result || '');
    showFileMessage('Ficheiro carregado localmente. Escolha o caminho final e envie-o para o GitHub.', 'success');
    event.target.value = '';
  };
  reader.onerror = () => showFileMessage('Não foi possível ler o ficheiro.', 'error');
  reader.readAsText(file);
}

function downloadProjectFile() {
  const path = $('#file-path').value.trim() || 'aurora-file.txt';
  const blob = new Blob([$('#file-content').value], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = path.split('/').pop() || 'aurora-file.txt';
  link.click();
  URL.revokeObjectURL(url);
  showFileMessage('Ficheiro descarregado.', 'success');
}

async function saveProjectFile() {
  const path = $('#file-path').value.trim();
  const content = $('#file-content').value;
  if (!path || path.includes('..') || path.startsWith('.git/')) return showFileMessage('Indique um caminho válido, sem “..” ou .git/.', 'error');
  if (!content.trim()) return showFileMessage('O conteúdo do ficheiro não pode ficar vazio.', 'error');
  if (!window.confirm(`Enviar “${path}” para o GitHub? Esta acção cria um commit no repositório.`)) return;
  const pathChanged = currentFilePath && currentFilePath !== path;
  try {
    showFileMessage('A enviar ficheiro para o GitHub…');
    const result = await githubFilesApi('write', {
      path,
      content,
      sha: pathChanged ? undefined : currentFileSha,
      message: $('#file-commit-message').value.trim() || `chore: actualizar ${path}`,
      generate: $('#file-editor-state').textContent.includes('Gerado')
    });
    currentFilePath = path;
    currentFileSha = result.file?.sha || currentFileSha;
    $('#file-editor-state').textContent = 'Publicado no GitHub';
    setGithubStatus('Publicado', 'is-ready');
    showFileMessage(`Ficheiro publicado com sucesso. Commit ${result.commit ? result.commit.slice(0, 7) : 'criado'}.`, 'success');
    await refreshRepositoryFiles();
  } catch (error) {
    showFileMessage(error.message, 'error');
  }
}

function setupFileWorkspace() {
  $('#refresh-files')?.addEventListener('click', refreshRepositoryFiles);
  $('#file-search')?.addEventListener('input', renderRepositoryFiles);
  $('#repository-file-list')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-file-path]');
    if (button) openRepositoryFile(button.dataset.filePath);
  });
  $('#new-project-file')?.addEventListener('click', resetFileEditor);
  $('#generate-collections-file')?.addEventListener('click', generateCollectionsFile);
  $('#download-project-file')?.addEventListener('click', downloadProjectFile);
  $('#save-project-file')?.addEventListener('click', saveProjectFile);
  $('#upload-project-file')?.addEventListener('change', uploadProjectFile);
}

async function setupAccess() {
  const gate = $('#access-gate');
  const content = $('#management-content');
  const form = $('#access-form');
  const message = $('#access-message');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const token = $('#access-token').value.trim();
    message.textContent = 'A testar o token e as permissões GitHub…';
    message.className = 'form-message';
    try {
      const repository = await verifyGithubToken(token);
      managementSessionToken = token;
      form.reset();
      gate.hidden = true;
      content.hidden = false;
      setGithubStatus(`${repository.full_name} · escrita activa`, 'is-ready');
      renderList();
      await refreshRepositoryFiles();
    } catch (error) {
      managementSessionToken = '';
      message.textContent = error.message;
      message.className = 'form-message error';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupAccess();
  setupFileWorkspace();
  $('#new-collection')?.addEventListener('click', () => openEditor());
  $('#logout')?.addEventListener('click', () => { managementSessionToken = ''; repositoryFiles = []; window.location.reload(); });
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
