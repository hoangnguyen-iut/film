// Infinite scroll functionality for Netflix-style movie rows
class InfiniteScroll {
    constructor() {
        this.loading = false;
        this.currentPage = 1;
        this.hasMore = true;
        this.category = null;
        this.container = null;
        
        this.init();
    }

    init() {
        this.setupObservers();
        this.setupLoadMoreButtons();
    }

    setupObservers() {
        // Intersection Observer for automatic loading
        const options = {
            root: null,
            rootMargin: '200px', // Load when 200px from viewport
            threshold: 0
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.loading && this.hasMore) {
                    this.loadMore();
                }
            });
        }, options);

        // Observe all load-more triggers
        document.querySelectorAll('.load-more-trigger').forEach(trigger => {
            this.observer.observe(trigger);
        });
    }

    setupLoadMoreButtons() {
        // Add click handlers to manual load more buttons
        document.querySelectorAll('.load-more-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.category = btn.dataset.category;
                this.container = btn.closest('.movie-row').querySelector('.movies-container');
                this.loadMore();
            });
        });
    }

    async loadMore() {
        if (this.loading || !this.hasMore) return;

        this.loading = true;
        this.showLoading();

        try {
            const response = await fetch(`/load-more/${this.category}/?page=${this.currentPage + 1}`);
            const data = await response.json();

            if (data.movies && data.movies.length > 0) {
                this.appendMovies(data.movies);
                this.currentPage = data.next_page || this.currentPage + 1;
                this.hasMore = data.has_next;
                
                if (!this.hasMore) {
                    this.hideLoadMore();
                }
            } else {
                this.hasMore = false;
                this.hideLoadMore();
            }
        } catch (error) {
            console.error('Infinite scroll error:', error);
            this.showError();
        } finally {
            this.loading = false;
            this.hideLoading();
        }
    }

    appendMovies(movies) {
        if (!this.container) return;

        const movieGrid = this.container.querySelector('.row') || this.container;
        
        movies.forEach(movie => {
            const movieCard = this.createMovieCard(movie);
            movieGrid.appendChild(movieCard);
        });

        // Reinitialize carousel if it exists
        this.reinitCarousel();
        // Reinitialize watchlist buttons
        if (window.WatchlistManager) {
            window.WatchlistManager.updateAllWatchlistButtons();
        }
    }

    createMovieCard(movie) {
        const col = document.createElement('div');
        col.className = 'col-xl-2 col-lg-3 col-md-4 col-sm-6 mb-4';
        
        const posterUrl = movie.poster_url || 'https://via.placeholder.com/300x450/333333/ffffff?text=No+Image';
        
        col.innerHTML = `
            <div class="movie-card" data-movie-id="${movie.id}">
                <div class="movie-poster-container">
                    <img src="${posterUrl}" 
                         alt="${movie.title}" 
                         class="movie-poster"
                         onerror="this.src='https://via.placeholder.com/300x450/333333/ffffff?text=No+Image'">
                    <div class="movie-overlay">
                        <div class="movie-info">
                            <h6 class="movie-title">${movie.title}</h6>
                            <p class="movie-meta">
                                <span class="release-year">${movie.release_year}</span>
                                <span class="genre">${movie.genre.split('|')[0]}</span>
                            </p>
                            <p class="movie-overview">${movie.overview}</p>
                            <div class="movie-actions">
                                <button class="btn btn-sm btn-danger play-btn" 
                                        data-movie-id="${movie.id}"
                                        data-movie-title="${movie.title}">
                                    <i class="bi bi-play-fill"></i> Play
                                </button>
                                <button class="btn btn-sm btn-outline-light watchlist-btn"
                                        data-movie-id="${movie.id}"
                                        data-movie-title="${movie.title}">
                                    <i class="bi bi-bookmark-plus"></i> Add to Watchlist
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add click handlers
        const playBtn = col.querySelector('.play-btn');
        const watchlistBtn = col.querySelector('.watchlist-btn');
        
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showMoviePreview(movie);
        });

        watchlistBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.WatchlistManager) {
                window.WatchlistManager.addToWatchlist(movie.id, movie.title);
            }
        });

        // Click on card to show preview
        col.querySelector('.movie-card').addEventListener('click', () => {
            this.showMoviePreview(movie);
        });

        return col;
    }

    showMoviePreview(movie) {
        // Use the global movie preview modal if available
        if (window.MoviePreview) {
            window.MoviePreview.show(movie);
        } else {
            // Fallback: navigate to movie detail page
            window.location.href = `/movie/${movie.id}/`;
        }
    }

    reinitCarousel() {
        // Reinitialize Owl Carousel if it exists
        if (window.jQuery && window.jQuery.fn.owlCarousel) {
            $('.owl-carousel').each(function() {
                const owl = $(this);
                if (owl.data('owl.carousel')) {
                    owl.trigger('refresh.owl.carousel');
                }
            });
        }
    }

    showLoading() {
        // Show loading indicator
        const loadingEl = document.createElement('div');
        loadingEl.className = 'loading-indicator';
        loadingEl.innerHTML = `
            <div class="d-flex justify-content-center align-items-center py-4">
                <div class="spinner-border text-danger" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <span class="ms-3">Loading more movies...</span>
            </div>
        `;
        
        if (this.container) {
            this.container.appendChild(loadingEl);
        }
    }

    hideLoading() {
        // Remove loading indicator
        const loadingEl = this.container?.querySelector('.loading-indicator');
        if (loadingEl) {
            loadingEl.remove();
        }
    }

    hideLoadMore() {
        // Hide load more button/trigger
        const triggers = document.querySelectorAll('.load-more-trigger, .load-more-btn');
        triggers.forEach(trigger => {
            trigger.style.display = 'none';
        });
    }

    showError() {
        // Show error message
        const errorEl = document.createElement('div');
        errorEl.className = 'error-indicator';
        errorEl.innerHTML = `
            <div class="alert alert-warning text-center" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Failed to load more movies. Please try again.
                <button class="btn btn-sm btn-outline-warning ms-2 retry-btn">Retry</button>
            </div>
        `;
        
        if (this.container) {
            this.container.appendChild(errorEl);
            
            // Add retry functionality
            const retryBtn = errorEl.querySelector('.retry-btn');
            retryBtn.addEventListener('click', () => {
                errorEl.remove();
                this.loadMore();
            });
        }
    }
}

// Category-based infinite scroll manager
class CategoryScrollManager {
    constructor() {
        this.categories = new Map();
        this.init();
    }

    init() {
        // Initialize infinite scroll for each category
        document.querySelectorAll('[data-category]').forEach(container => {
            const category = container.dataset.category;
            this.categories.set(category, new CategoryScroll(category, container));
        });
    }

    getCategory(category) {
        return this.categories.get(category);
    }

    refreshAll() {
        this.categories.forEach(scroll => scroll.refresh());
    }
}

// Individual category scroll handler
class CategoryScroll {
    constructor(category, container) {
        this.category = category;
        this.container = container;
        this.currentPage = 1;
        this.hasMore = true;
        this.loading = false;
        
        this.init();
    }

    init() {
        this.setupObserver();
    }

    setupObserver() {
        const options = {
            root: null,
            rootMargin: '300px',
            threshold: 0
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.loading && this.hasMore) {
                    this.loadMore();
                }
            });
        }, options);

        // Create and observe trigger element
        this.trigger = document.createElement('div');
        this.trigger.className = 'load-more-trigger';
        this.trigger.style.height = '1px';
        this.container.appendChild(this.trigger);
        this.observer.observe(this.trigger);
    }

    async loadMore() {
        if (this.loading || !this.hasMore) return;

        this.loading = true;
        this.showLoading();

        try {
            const response = await fetch(`/load-more/${this.category}/?page=${this.currentPage + 1}`);
            const data = await response.json();

            if (data.movies && data.movies.length > 0) {
                this.appendMovies(data.movies);
                this.currentPage = data.next_page || this.currentPage + 1;
                this.hasMore = data.has_next;
                
                if (!this.hasMore) {
                    this.hideTrigger();
                }
            } else {
                this.hasMore = false;
                this.hideTrigger();
            }
        } catch (error) {
            console.error(`Category ${this.category} scroll error:`, error);
            this.showError();
        } finally {
            this.loading = false;
            this.hideLoading();
        }
    }

    appendMovies(movies) {
        const movieGrid = this.container.querySelector('.row') || this.container;
        
        movies.forEach(movie => {
            const movieCard = this.createMovieCard(movie);
            movieGrid.appendChild(movieCard);
        });

        // Update carousel and watchlist buttons
        this.updateUI();
    }

    createMovieCard(movie) {
        // Similar to InfiniteScroll.createMovieCard but adapted for this context
        const col = document.createElement('div');
        col.className = 'col-xl-2 col-lg-3 col-md-4 col-sm-6 mb-4';
        
        const posterUrl = movie.poster_url || 'https://via.placeholder.com/300x450/333333/ffffff?text=No+Image';
        
        col.innerHTML = `
            <div class="movie-card" data-movie-id="${movie.id}">
                <div class="movie-poster-container">
                    <img src="${posterUrl}" 
                         alt="${movie.title}" 
                         class="movie-poster"
                         onerror="this.src='https://via.placeholder.com/300x450/333333/ffffff?text=No+Image'">
                    <div class="movie-overlay">
                        <div class="movie-info">
                            <h6 class="movie-title">${movie.title}</h6>
                            <p class="movie-meta">
                                <span class="release-year">${movie.release_year}</span>
                                <span class="genre">${movie.genre.split('|')[0]}</span>
                            </p>
                            <div class="movie-actions">
                                <button class="btn btn-sm btn-danger play-btn" 
                                        data-movie-id="${movie.id}">
                                    <i class="bi bi-play-fill"></i> Play
                                </button>
                                <button class="btn btn-sm btn-outline-light watchlist-btn"
                                        data-movie-id="${movie.id}"
                                        data-movie-title="${movie.title}">
                                    <i class="bi bi-bookmark-plus"></i> Watchlist
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners
        this.addCardEventListeners(col, movie);
        return col;
    }

    addCardEventListeners(col, movie) {
        const playBtn = col.querySelector('.play-btn');
        const watchlistBtn = col.querySelector('.watchlist-btn');
        const card = col.querySelector('.movie-card');

        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showPreview(movie);
        });

        watchlistBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.WatchlistManager) {
                window.WatchlistManager.addToWatchlist(movie.id, movie.title);
            }
        });

        card.addEventListener('click', () => {
            this.showPreview(movie);
        });
    }

    showPreview(movie) {
        if (window.MoviePreview) {
            window.MoviePreview.show(movie);
        } else {
            window.location.href = `/movie/${movie.id}/`;
        }
    }

    updateUI() {
        // Reinitialize carousels and watchlist buttons
        if (window.jQuery && window.jQuery.fn.owlCarousel) {
            $('.owl-carousel').trigger('refresh.owl.carousel');
        }
        
        if (window.WatchlistManager) {
            window.WatchlistManager.updateAllWatchlistButtons();
        }
    }

    showLoading() {
        const loadingEl = document.createElement('div');
        loadingEl.className = 'category-loading';
        loadingEl.innerHTML = `
            <div class="text-center py-3">
                <div class="spinner-border spinner-border-sm text-danger me-2" role="status"></div>
                <small class="text-muted">Loading more...</small>
            </div>
        `;
        this.container.appendChild(loadingEl);
    }

    hideLoading() {
        const loadingEl = this.container.querySelector('.category-loading');
        if (loadingEl) loadingEl.remove();
    }

    hideTrigger() {
        if (this.trigger) {
            this.trigger.style.display = 'none';
        }
    }

    showError() {
        const errorEl = document.createElement('div');
        errorEl.className = 'category-error';
        errorEl.innerHTML = `
            <div class="text-center py-2">
                <small class="text-warning">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    Load failed
                </small>
            </div>
        `;
        this.container.appendChild(errorEl);
    }

    refresh() {
        // Refresh the scroll for this category
        this.currentPage = 1;
        this.hasMore = true;
        if (this.trigger) {
            this.trigger.style.display = 'block';
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize main infinite scroll
    new InfiniteScroll();
    
    // Initialize category-based scroll manager
    window.CategoryScrollManager = new CategoryScrollManager();
});

// Export for global use
window.InfiniteScroll = InfiniteScroll;
window.CategoryScrollManager = CategoryScrollManager;
