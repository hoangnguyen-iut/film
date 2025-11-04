// Search autocomplete functionality for Netflix-style search
class SearchAutocomplete {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.autocompleteResults = document.getElementById('autocompleteResults');
        this.currentFocus = -1;
        
        if (this.searchInput && this.autocompleteResults) {
            this.init();
        }
    }

    init() {
        // Add event listeners
        this.searchInput.addEventListener('input', this.handleInput.bind(this));
        this.searchInput.addEventListener('keydown', this.handleKeydown.bind(this));
        this.searchInput.addEventListener('blur', this.hideResults.bind(this));
        
        // Hide results when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.autocompleteResults.contains(e.target) && e.target !== this.searchInput) {
                this.hideResults();
            }
        });
    }

    handleInput(e) {
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            this.hideResults();
            return;
        }

        this.fetchAutocompleteResults(query);
    }

    async fetchAutocompleteResults(query) {
        try {
            const response = await fetch(`/api/search/?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            this.displayResults(data.movies);
        } catch (error) {
            console.error('Autocomplete fetch error:', error);
            this.hideResults();
        }
    }

    displayResults(movies) {
        if (!movies || movies.length === 0) {
            this.hideResults();
            return;
        }

        this.autocompleteResults.innerHTML = '';
        this.currentFocus = -1;

        movies.forEach((movie, index) => {
            const item = this.createResultItem(movie, index);
            this.autocompleteResults.appendChild(item);
        });

        this.showResults();
    }

    createResultItem(movie, index) {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.setAttribute('data-index', index);
        
        const poster = movie.poster_url ? 
            `<img src="${movie.poster_url}" alt="${movie.title}" class="autocomplete-poster" 
                  onerror="this.src='https://via.placeholder.com/50x75/333333/ffffff?text=No+Image'">` :
            `<div class="autocomplete-poster placeholder">
                <i class="bi bi-film"></i>
             </div>`;

        item.innerHTML = `
            <div class="d-flex align-items-center">
                ${poster}
                <div class="autocomplete-info ms-3">
                    <div class="autocomplete-title">${this.highlightText(movie.title, this.searchInput.value)}</div>
                    <div class="autocomplete-meta">
                        <span class="text-muted">${movie.release_year}</span>
                        <span class="text-muted mx-1">•</span>
                        <span class="text-muted">${movie.genre.split('|')[0]}</span>
                    </div>
                </div>
            </div>
        `;

        item.addEventListener('click', () => {
            this.selectMovie(movie);
        });

        item.addEventListener('mouseenter', () => {
            this.setActiveItem(index);
        });

        return item;
    }

    highlightText(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    selectMovie(movie) {
        window.location.href = `/movie/${movie.id}/`;
    }

    handleKeydown(e) {
        const items = this.autocompleteResults.getElementsByClassName('autocomplete-item');
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.currentFocus = Math.min(this.currentFocus + 1, items.length - 1);
                this.setActiveItem(this.currentFocus);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.currentFocus = Math.max(this.currentFocus - 1, -1);
                this.setActiveItem(this.currentFocus);
                break;
                
            case 'Enter':
                e.preventDefault();
                if (this.currentFocus > -1 && items[this.currentFocus]) {
                    items[this.currentFocus].click();
                } else if (this.searchInput.value.trim()) {
                    // Submit search form if no autocomplete item is selected
                    this.searchInput.form?.submit();
                }
                break;
                
            case 'Escape':
                this.hideResults();
                break;
        }
    }

    setActiveItem(index) {
        const items = this.autocompleteResults.getElementsByClassName('autocomplete-item');
        
        // Remove active class from all items
        Array.from(items).forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to current item
        if (index >= 0 && items[index]) {
            items[index].classList.add('active');
            this.currentFocus = index;
        }
    }

    showResults() {
        this.autocompleteResults.style.display = 'block';
        this.autocompleteResults.style.opacity = '1';
    }

    hideResults() {
        this.autocompleteResults.style.opacity = '0';
        setTimeout(() => {
            this.autocompleteResults.style.display = 'none';
            this.autocompleteResults.innerHTML = '';
            this.currentFocus = -1;
        }, 300);
    }
}

// Initialize autocomplete when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new SearchAutocomplete();
});

// Mobile search toggle functionality
class MobileSearch {
    constructor() {
        this.searchToggle = document.getElementById('searchToggle');
        this.searchContainer = document.getElementById('searchContainer');
        this.searchInput = document.getElementById('searchInput');
        
        if (this.searchToggle && this.searchContainer) {
            this.init();
        }
    }

    init() {
        this.searchToggle.addEventListener('click', this.toggleSearch.bind(this));
        
        // Close mobile search when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.searchContainer.contains(e.target) && e.target !== this.searchToggle) {
                this.closeSearch();
            }
        });
    }

    toggleSearch() {
        if (this.searchContainer.classList.contains('active')) {
            this.closeSearch();
        } else {
            this.openSearch();
        }
    }

    openSearch() {
        this.searchContainer.classList.add('active');
        this.searchInput.focus();
        
        // Add backdrop
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'mobile-search-backdrop';
        this.backdrop.addEventListener('click', this.closeSearch.bind(this));
        document.body.appendChild(this.backdrop);
    }

    closeSearch() {
        this.searchContainer.classList.remove('active');
        if (this.backdrop) {
            this.backdrop.remove();
            this.backdrop = null;
        }
    }
}

// Initialize mobile search
document.addEventListener('DOMContentLoaded', function() {
    new MobileSearch();
});

// Search history functionality
class SearchHistory {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.maxHistoryItems = 5;
        
        if (this.searchInput) {
            this.init();
        }
    }

    init() {
        this.searchInput.addEventListener('focus', this.showHistory.bind(this));
    }

    getHistory() {
        return JSON.parse(localStorage.getItem('movieSearchHistory') || '[]');
    }

    addToHistory(query) {
        if (!query.trim()) return;
        
        let history = this.getHistory();
        history = history.filter(item => item !== query);
        history.unshift(query);
        history = history.slice(0, this.maxHistoryItems);
        
        localStorage.setItem('movieSearchHistory', JSON.stringify(history));
    }

    showHistory() {
        const history = this.getHistory();
        if (history.length === 0) return;

        const autocompleteResults = document.getElementById('autocompleteResults');
        if (!autocompleteResults) return;

        let html = '<div class="autocomplete-section">';
        html += '<div class="autocomplete-section-title">Recent Searches</div>';
        
        history.forEach(query => {
            html += `
                <div class="autocomplete-item history-item">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-clock-history text-muted me-3"></i>
                        <div>${query}</div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        autocompleteResults.innerHTML = html;
        autocompleteResults.style.display = 'block';
        autocompleteResults.style.opacity = '1';

        // Add click handlers for history items
        const historyItems = autocompleteResults.querySelectorAll('.history-item');
        historyItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                this.searchInput.value = history[index];
                this.searchInput.form?.submit();
            });
        });
    }
}

// Initialize search history
document.addEventListener('DOMContentLoaded', function() {
    new SearchHistory();
});

// Export for global use
window.SearchAutocomplete = SearchAutocomplete;
window.MobileSearch = MobileSearch;
window.SearchHistory = SearchHistory;
