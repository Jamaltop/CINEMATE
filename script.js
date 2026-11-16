document.addEventListener('DOMContentLoaded', () => {
  let catalog = [];
  let activeTab = 'discover';
  let activeGenre = 'All';
  let watchlist = JSON.parse(localStorage.getItem('cinemate_watchlist')) || [];
  let favorites = JSON.parse(localStorage.getItem('cinemate_favorites')) || [];

  function saveLists() {
    localStorage.setItem('cinemate_watchlist', JSON.stringify(watchlist));
    localStorage.setItem('cinemate_favorites', JSON.stringify(favorites));
    document.getElementById('watchlistCount').textContent = watchlist.length;
    document.getElementById('favCount').textContent = favorites.length;
  }

  function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || 'No synopsis available.';
    return tmp.textContent || tmp.innerText || '';
  }

  async function fetchShows(query = '') {
    try {
      const endpoint = query
        ? `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`
        : `https://api.tvmaze.com/shows?page=0`;
      const res = await fetch(endpoint);
      const raw = await res.json();
      const normalized = query ? raw.map(item => item.show) : raw.slice(0, 36);

      catalog = normalized.filter(s => s.image).map(s => ({
        id: s.id,
        title: s.name,
        genres: s.genres && s.genres.length ? s.genres : ['Drama'],
        rating: s.rating?.average || 8.1,
        year: s.premiered ? s.premiered.slice(0, 4) : '2025',
        runtime: s.averageRuntime || 50,
        poster: s.image.medium,
        backdrop: s.image.original,
        summary: stripHtml(s.summary)
      }));

      if (catalog.length) setHero(catalog[0]);
      renderGrid();
    } catch (err) {
      document.getElementById('posterGrid').innerHTML =
        '<p style="color:var(--muted)">Unable to reach live film API. Check network connection.</p>';
    }
  }

  function setHero(item) {
    document.getElementById('featuredBanner').style.backgroundImage = `url('${item.backdrop}')`;
    document.getElementById('heroTitle').textContent = item.title;
    document.getElementById('heroSummary').textContent = item.summary;
    document.getElementById('heroDetailBtn').onclick = () => openDossier(item.id);
    document.getElementById('heroWatchlistBtn').onclick = () => toggleList('watchlist', item.id);
  }

  function renderGrid() {
    let source = catalog;
    if (activeTab === 'watchlist') {
      source = catalog.filter(item => watchlist.includes(item.id));
    } else if (activeTab === 'favorites') {
      source = catalog.filter(item => favorites.includes(item.id));
    }

    if (activeGenre !== 'All') {
      source = source.filter(item => item.genres.includes(activeGenre));
    }

    document.getElementById('resultCounter').textContent = `${source.length} titles indexed`;
    const grid = document.getElementById('posterGrid');

    if (!source.length) {
      grid.innerHTML = '<p style="color:var(--muted);grid-column:1/-1;">No titles match the current filter or collection.</p>';
      return;
    }

    grid.innerHTML = source.map(item => {
      const inWatch = watchlist.includes(item.id);
      const inFav = favorites.includes(item.id);
      return `
        <article class="film-card">
          <div class="poster-box" onclick="openDossier(${item.id})">
            <img src="${item.poster}" alt="${item.title}" loading="lazy" />
            <span class="rating-badge">★ ${item.rating}</span>
          </div>
          <div class="film-body">
            <div>
              <h3 class="film-title" onclick="openDossier(${item.id})">${item.title}</h3>
              <p class="film-genres">${item.year} • ${item.genres.slice(0, 2).join(', ')}</p>
            </div>
            <div class="film-actions">
              <button class="mini-btn ${inWatch ? 'active' : ''}" onclick="toggleList('watchlist', ${item.id})">
                ${inWatch ? '✓ Watchlist' : '+ Watchlist'}
              </button>
              <button class="mini-btn ${inFav ? 'active' : ''}" onclick="toggleList('favorites', ${item.id})">
                ${inFav ? '♥ Fav' : '♡ Fav'}
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  window.toggleList = (type, id) => {
    if (type === 'watchlist') {
      watchlist = watchlist.includes(id) ? watchlist.filter(x => x !== id) : [...watchlist, id];
    } else {
      favorites = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites, id];
    }
    saveLists();
    renderGrid();
  };

  window.openDossier = (id) => {
    const item = catalog.find(x => x.id === id);
    if (!item) return;
    document.getElementById('dossierContent').innerHTML = `
      <img src="${item.backdrop}" alt="${item.title}" />
      <div class="dossier-meta">
        <h2>${item.title}</h2>
        <div class="meta-chips">
          <span>★ ${item.rating} / 10</span>
          <span>• ${item.year}</span>
          <span>• ${item.runtime} min</span>
          <span>• ${item.genres.join(' / ')}</span>
        </div>
        <p style="color:var(--muted);font-size:0.92rem;margin-bottom:1.5rem;">${item.summary}</p>
        <div style="display:flex;gap:0.75rem;">
          <button class="btn-gold" onclick="toggleList('watchlist', ${item.id}); openDossier(${item.id});">
            ${watchlist.includes(item.id) ? 'Remove from Watchlist' : '+ Add to Watchlist'}
          </button>
          <button class="btn-glass" onclick="toggleList('favorites', ${item.id}); openDossier(${item.id});">
            ${favorites.includes(item.id) ? '♥ Favorited' : '♡ Mark Favorite'}
          </button>
        </div>
      </div>
    `;
    document.getElementById('filmModal').classList.add('open');
  };

  document.getElementById('closeFilmModal').addEventListener('click', () => {
    document.getElementById('filmModal').classList.remove('open');
  });

  // Search
  document.getElementById('searchTriggerBtn').addEventListener('click', () => {
    fetchShows(document.getElementById('movieSearchInput').value.trim());
  });
  document.getElementById('movieSearchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') fetchShows(e.target.value.trim());
  });

  // Tabs & Genres
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      renderGrid();
    });
  });

  document.querySelectorAll('.genre-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeGenre = pill.dataset.genre;
      renderGrid();
    });
  });

  saveLists();
  fetchShows();
});