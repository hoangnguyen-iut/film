// Carousel initialization and management for MovieFlix
document.addEventListener('DOMContentLoaded', function() {
    initializeCarousels();
    setupCarouselInteractions();
});

function initializeCarousels() {
    // Initialize Owl Carousel for movie rows
    $('.movie-carousel').owlCarousel({
        loop: true,
        margin: 15,
        nav: true,
        dots: false,
        lazyLoad: true,
        responsive: {
            0: { 
                items: 2,
                margin: 10
            },
            576: { 
                items: 3,
                margin: 12
            },
            768: { 
                items: 4,
                margin: 15
            },
            992: { 
                items: 5,
                margin: 15
            },
            1200: { 
                items: 6,
                margin: 15
            },
            1400: { 
                items: 7,
                margin: 15
            }
        },
        navText: [
            '<i class="bi bi-chevron-left"></i>',
            '<i class="bi bi-chevron-right"></i>'
        ],
        navContainer: '.movie-row',
        navClass: ['owl-prev', 'owl-next'],
        onInitialized: function(event) {
            updateCarouselNavigation(event);
        },
        onResized: function(event) {
            updateCarouselNavigation(event);
        }
    });

    // Add touch support for mobile
    $('.movie-carousel').on('touchstart', function(e) {
        const startX = e.originalEvent.touches[0].pageX;
        
        $(this).on('touchmove', function(e) {
            const moveX = e.originalEvent.touches[0].pageX;
            const diffX = startX - moveX;
            
            if (Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    $(this).trigger('next.owl.carousel');
                } else {
                    $(this).trigger('prev.owl.carousel');
                }
                $(this).off('touchmove');
            }
        });
        
        $(this).on('touchend', function() {
            $(this).off('touchmove touchend');
        });
    });
}

function setupCarouselInteractions() {
    // Keyboard navigation
    $(document).on('keydown', function(e) {
        const focusedCarousel = $('.movie-carousel:focus');
        if (focusedCarousel.length) {
            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    focusedCarousel.trigger('prev.owl.carousel');
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    focusedCarousel.trigger('next.owl.carousel');
                    break;
            }
        }
    });

    // Auto-hide navigation on idle
    let idleTimer;
    function resetIdleTimer() {
        clearTimeout(idleTimer);
        $('.owl-nav').removeClass('hidden');
        idleTimer = setTimeout(() => {
            $('.owl-nav').addClass('hidden');
        }, 3000);
    }

    $('.movie-carousel').on('mousemove touchstart', resetIdleTimer);
    resetIdleTimer();

    // Lazy loading for images
    const lazyImages = document.querySelectorAll('.movie-poster-card img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });

    lazyImages.forEach(img => imageObserver.observe(img));
}

function updateCarouselNavigation(event) {
    const carousel = event.target;
    const $carousel = $(carousel);
    const itemCount = $carousel.find('.owl-item').length;
    const visibleItems = $carousel.owlCarousel('option', 'items');
    
    // Hide navigation if there are fewer items than visible
    if (itemCount <= visibleItems) {
        $carousel.find('.owl-nav').hide();
    } else {
        $carousel.find('.owl-nav').show();
    }
}

// Carousel utility functions
const CarouselUtils = {
    // Go to specific slide
    goToSlide: function(carouselElement, slideIndex) {
        $(carouselElement).trigger('to.owl.carousel', [slideIndex, 300]);
    },

    // Add movie to carousel dynamically
    addMovieToCarousel: function(carouselElement, movieData) {
        const movieCard = this.createMovieCard(movieData);
        $(carouselElement).trigger('add.owl.carousel', [movieCard, 0]);
    },

    // Create movie card HTML
    createMovieCard: function(movie) {
        return `
            <div class="movie-card">
                <div class="card bg-dark border-0 movie-poster-card">
                    ${movie.poster_url ? 
                        `<img src="${movie.poster_url}" class="card-img-top" alt="${movie.title}" 
                              onerror="this.src='https://via.placeholder.com/300x450/333333/ffffff?text=No+Image'">` :
                        `<div class="card-img-top bg-secondary d-flex align-items-center justify-content-center" 
                              style="height: 300px;">
                            <i class="bi bi-film text-light" style="font-size: 3rem;"></i>
                         </div>`
                    }
                    
                    <div class="card-overlay">
                        <div class="overlay-content">
                            <h6 class="movie-title">${movie.title}</h6>
                            <p class="movie-year small text-muted">${movie.release_year}</p>
                            <div class="movie-rating">
                                <i class="bi bi-star-fill text-warning"></i>
                                <span class="ms-1">${movie.avg_rating || 'N/A'}</span>
                            </div>
                            <div class="movie-actions mt-2">
                                <a href="/movie/${movie.id}/" class="btn btn-sm btn-outline-light me-1">
                                    <i class="bi bi-info-circle"></i>
                                </a>
                                <button class="btn btn-sm btn-danger rate-btn" 
                                        data-movie-id="${movie.id}"
                                        data-movie-title="${movie.title}">
                                    <i class="bi bi-play-fill"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Refresh carousel after dynamic content changes
    refreshCarousel: function(carouselElement) {
        $(carouselElement).trigger('refresh.owl.carousel');
    },

    // Destroy and reinitialize carousel
    reinitializeCarousel: function(carouselElement) {
        $(carouselElement).trigger('destroy.owl.carousel');
        $(carouselElement).removeClass('owl-loaded owl-hidden');
        $(carouselElement).find('.owl-stage').remove();
        $(carouselElement).find('.owl-nav').remove();
        $(carouselElement).find('.owl-dots').remove();
        initializeCarousels();
    }
};

// Export for global use
window.CarouselUtils = CarouselUtils;

// Performance optimization: Debounce resize events
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
        $('.movie-carousel').each(function() {
            CarouselUtils.refreshCarousel(this);
        });
    }, 250);
});

// Smooth scrolling for carousel navigation
$('.owl-prev, .owl-next').on('click', function(e) {
    e.preventDefault();
    const carousel = $(this).closest('.movie-carousel');
    const direction = $(this).hasClass('owl-prev') ? -1 : 1;
    const currentPosition = carousel.find('.owl-stage').position().left;
    const itemWidth = carousel.find('.owl-item').outerWidth();
    const moveDistance = itemWidth * 3 * direction; // Move 3 items at a time
    
    carousel.find('.owl-stage').animate({
        left: currentPosition + moveDistance + 'px'
    }, 300);
});

// Enhanced hover effects
document.querySelectorAll('.movie-poster-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.05)';
        this.style.zIndex = '1000';
        this.style.transition = 'all 0.3s ease';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
        this.style.zIndex = '1';
    });
});

// Auto-play carousel (optional - can be enabled per carousel)
function enableAutoPlay(carouselElement, interval = 5000) {
    let autoplayInterval;
    
    function startAutoplay() {
        autoplayInterval = setInterval(() => {
            $(carouselElement).trigger('next.owl.carousel');
        }, interval);
    }
    
    function stopAutoplay() {
        clearInterval(autoplayInterval);
    }
    
    // Start autoplay
    startAutoplay();
    
    // Pause on hover
    $(carouselElement).hover(stopAutoplay, startAutoplay);
    
    // Pause when window is not visible
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            stopAutoplay();
        } else {
            startAutoplay();
        }
    });
}

// Make auto-play available globally
window.enableCarouselAutoPlay = enableAutoPlay;
