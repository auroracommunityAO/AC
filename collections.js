const COLLECTIONS_KEY = 'aurora-flowers-collections-v1';

const DEFAULT_COLLECTIONS = [];

function readCollections() {
  try {
    const stored = localStorage.getItem(COLLECTIONS_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_COLLECTIONS;
  } catch (error) {
    console.warn('Não foi possível ler as coleções guardadas.', error);
    return DEFAULT_COLLECTIONS;
  }
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  }[character]));
}

function renderCollections() {
  const grid = document.querySelector('#collections-grid');
  const emptyState = document.querySelector('#collections-empty');
  const count = document.querySelector('#collection-count');
  const searchInput = document.querySelector('#collection-search');
  const categorySelect = document.querySelector('#collection-category');
  if (!grid || !emptyState || !count) return;

  const allCollections = readCollections();
  const published = allCollections.filter((collection) => collection.status === 'published');
  const categories = [...new Set(published.map((collection) => collection.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt'));
  const currentCategory = categorySelect?.value || '';
  if (categorySelect) {
    categorySelect.innerHTML = '<option value="">Todas as categorias</option>' + categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
    categorySelect.value = categories.includes(currentCategory) ? currentCategory : '';
  }

  const term = (searchInput?.value || '').trim().toLocaleLowerCase('pt-PT');
  const selectedCategory = categorySelect?.value || '';
  const filtered = published
    .filter((collection) => !selectedCategory || collection.category === selectedCategory)
    .filter((collection) => !term || `${collection.title} ${collection.description} ${collection.category}`.toLocaleLowerCase('pt-PT').includes(term))
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || a.title.localeCompare(b.title, 'pt'));

  count.textContent = `${filtered.length} ${filtered.length === 1 ? 'coleção' : 'coleções'}`;
  grid.innerHTML = filtered.map((collection) => {
    const cover = collection.cover
      ? `<img src="${escapeHtml(collection.cover)}" alt="Capa da coleção ${escapeHtml(collection.title)}" class="collection-card-cover">`
      : '<div class="collection-card-cover collection-card-cover-fallback" aria-hidden="true"><span>✦</span></div>';
    const externalLink = collection.externalUrl
      ? `<a href="${escapeHtml(collection.externalUrl)}" target="_blank" rel="noopener noreferrer" class="text-link">Ver coleção <span aria-hidden="true">↗</span></a>`
      : '<span class="collection-card-status">Publicada pela Aurora</span>';
    return `<article class="collection-card">${cover}<div class="collection-card-body"><div class="collection-card-meta"><span>${escapeHtml(collection.category || 'Coleção')}</span><span aria-hidden="true">✦</span></div><h3>${escapeHtml(collection.title)}</h3><p>${escapeHtml(collection.description)}</p><div class="collection-card-footer">${externalLink}</div></div></article>`;
  }).join('');

  const shouldShowEmpty = filtered.length === 0;
  emptyState.hidden = !shouldShowEmpty;
  grid.hidden = shouldShowEmpty;
  if (shouldShowEmpty && (term || selectedCategory)) {
    emptyState.querySelector('h3').textContent = 'Não encontrámos essa coleção.';
    emptyState.querySelector('p').textContent = 'Tente ajustar a pesquisa ou escolher outra categoria.';
  } else if (shouldShowEmpty) {
    emptyState.querySelector('h3').textContent = 'Ainda estamos a preparar esta página.';
    emptyState.querySelector('p').textContent = 'As próximas coleções da Aurora Flowers aparecerão aqui assim que forem publicadas.';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderCollections();
  document.querySelector('#collection-search')?.addEventListener('input', renderCollections);
  document.querySelector('#collection-category')?.addEventListener('change', renderCollections);
  window.addEventListener('storage', renderCollections);
});
