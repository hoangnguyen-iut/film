// Watchlist AJAX functionality for MovieFlix
document.addEventListener('DOMContentLoaded', function() {
    initializeWatchlistButtons();
});

function initializeWatchlistButtons() {
    // Add click handlers to all watchlist buttons
    document.querySelectorAll('.watchlist-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const movieId = this.dataset.movieId;
            const movieTitle = this.dataset.movieTitle;
            toggleWatchlist(movieId, movieTitle, this);
        });
    });
}

function toggleWatchlist(movieId, movieTitle, buttonElement) {
    // Show loading state
    const originalHtml = buttonElement.innerHTML;
    buttonElement.innerHTML = '<i class="bi bi-hourglass-split"></i> Loading...';
    buttonElement.disabled = true;

    // Send AJAX request
    fetch(`/watchlist/add/${movieId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/x-www-form-urlencoded',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update button state based on action
            if (data.action === 'added') {
                buttonElement.innerHTML = '<i class="bi bi-bookmark-check-fill"></i> In Watchlist';
                buttonElement.classList.remove('btn-outline-light');
                buttonElement.classList.add('btn-success');
            } else {
                buttonElement.innerHTML = '<i class="bi bi-bookmark-plus"></i> Add to Watchlist';
                buttonElement.classList.remove('btn-success');
                buttonElement.classList.add('btn-outline-light');
            }

            // Show success message
            showAlert('success', data.message);
            
            // Update watchlist badge if exists
            updateWatchlistBadge();
        } else {
            showAlert('danger', 'Error: ' + data.error);
            // Reset button to original state
            buttonElement.innerHTML = originalHtml;
            buttonElement.disabled = false;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('danger', 'An error occurred while updating your watchlist.');
        // Reset button to original state
        buttonElement.innerHTML = originalHtml;
        buttonElement.disabled = false;
    });
}

function updateWatchlistBadge() {
    // Update watchlist badge in navbar if it exists
    const watchlistBadge = document.querySelector('.watchlist-badge');
    if (watchlistBadge) {
        // You could make an AJAX call to get the current count, but for simplicity we'll just toggle
        // In a real app, you might want to update this dynamically
    }
}

function showAlert(type, message) {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Add alert to the page
    const main = document.querySelector('main');
    if (main) {
        main.insertBefore(alert, main.firstChild);
    }
    
    // Auto-remove alert after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// Utility function to get CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Watchlist management utilities
const WatchlistManager = {
    // Check if movie is in watchlist
    isInWatchlist: function(movieId) {
        return new Promise((resolve) => {
            fetch(`/watchlist/status/${movieId}/`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                }
            })
            .then(response => response.json())
            .then(data => resolve(data.in_watchlist))
            .catch(() => resolve(false));
        });
    },

    // Get user's watchlist count
    getWatchlistCount: function() {
        return new Promise((resolve) => {
            fetch('/watchlist/count/', {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                }
            })
            .then(response => response.json())
            .then(data => resolve(data.count))
            .catch(() => resolve(0));
        });
    },

    // Update all watchlist buttons on the page
    updateAllWatchlistButtons: function() {
        document.querySelectorAll('.watchlist-btn').forEach(async btn => {
            const movieId = btn.dataset.movieId;
            const isInWatchlist = await this.isInWatchlist(movieId);
            
            if (isInWatchlist) {
                btn.innerHTML = '<i class="bi bi-bookmark-check-fill"></i> In Watchlist';
                btn.classList.remove('btn-outline-light');
                btn.classList.add('btn-success');
            } else {
                btn.innerHTML = '<i class="bi bi-bookmark-plus"></i> Add to Watchlist';
                btn.classList.remove('btn-success');
                btn.classList.add('btn-outline-light');
            }
        });
    },

    // Add movie to watchlist programmatically
    addToWatchlist: function(movieId, movieTitle) {
        return fetch(`/watchlist/add/${movieId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'X-Requested-With': 'XMLHttpRequest',
            }
        })
        .then(response => response.json());
    },

    // Remove movie from watchlist programmatically
    removeFromWatchlist: function(movieId) {
        return fetch(`/watchlist/remove/${movieId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'X-Requested-With': 'XMLHttpRequest',
            }
        })
        .then(response => response.json());
    }
};

// Export for global use
window.WatchlistManager = WatchlistManager;

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize watchlist buttons
    initializeWatchlistButtons();
    
    // Update watchlist button states if user is logged in
    if (document.querySelector('.watchlist-btn')) {
        WatchlistManager.updateAllWatchlistButtons();
    }
});

// Watchlist button template for dynamic creation
function createWatchlistButton(movieId, movieTitle, isInWatchlist = false) {
    const button = document.createElement('button');
    button.className = `btn btn-sm watchlist-btn ${isInWatchlist ? 'btn-success' : 'btn-outline-light'}`;
    button.dataset.movieId = movieId;
    button.dataset.movieTitle = movieTitle;
    button.innerHTML = isInWatchlist ? 
        '<i class="bi bi-bookmark-check-fill"></i> In Watchlist' :
        '<i class="bi bi-bookmark-plus"></i> Add to Watchlist';
    
    button.addEventListener('click', function() {
        toggleWatchlist(movieId, movieTitle, this);
    });
    
    return button;
}
