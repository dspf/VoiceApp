// Import authentication functions
import { checkAuthState } from './auth.js';

// Enhanced Loading Animation
window.addEventListener('load', function() {
    setTimeout(() => {
        document.getElementById('loadingOverlay').classList.add('hidden');
        // Check authentication state after page loads
        checkAuthState();
    }, 1000);
});

// Enhanced Scroll Progress Indicator
window.addEventListener('scroll', function() {
    const scrollProgress = document.getElementById('scrollProgress');
    const scrollTop = window.pageYOffset;
    const docHeight = document.body.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;
    scrollProgress.style.width = scrollPercent + '%';
});

// Enhanced Floating Particles System
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random size between 2px and 8px
        const size = Math.random() * 6 + 2;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        
        // Random horizontal position
        particle.style.left = Math.random() * 100 + '%';
        
        // Random animation delay
        particle.style.animationDelay = Math.random() * 15 + 's';
        
        particlesContainer.appendChild(particle);
    }
}

// Enhanced Hero slideshow logic
(function() {
    const slides = document.querySelectorAll('.hero-slideshow .slide');
    const dots = document.querySelectorAll('.hero-slideshow .dot');
    let idx = 0, timer = null;
    
    function showSlide(i) {
        slides.forEach((s, j) => {
            s.classList.toggle('active', j === i);
        });
        dots.forEach((d, j) => d.classList.toggle('active', j === i));
        idx = i;
    }
    
    function nextSlide() {
        showSlide((idx + 1) % slides.length);
    }
    
    dots.forEach((dot, i) => {
        dot.onclick = () => {
            showSlide(i);
            clearInterval(timer);
            timer = setInterval(nextSlide, 4200);
        };
    });
    
    showSlide(0);
    timer = setInterval(nextSlide, 4200);
})();

// Enhanced Modal functionality
function showSignup() {
    document.getElementById('signupModal').style.display = 'block';
    document.getElementById('loginModal').style.display = 'none';
    document.body.style.overflow = 'hidden';
}

function showLogin() {
    document.getElementById('loginModal').style.display = 'block';
    document.getElementById('signupModal').style.display = 'none';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('signupModal').style.display = 'none';
    document.getElementById('loginModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const signupModal = document.getElementById('signupModal');
    const loginModal = document.getElementById('loginModal');
    if (event.target === signupModal) {
        closeModal();
    }
    if (event.target === loginModal) {
        closeModal();
    }
}

// Enhanced Form handling
// Form handling is now managed by auth.js
document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signupForm');
    const loginForm = document.getElementById('loginForm');
    
    if (signupForm) {
        signupForm.addEventListener('submit', window.handleSignup);
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', window.handleLogin);
    }
});

// Enhanced Header scroll effect
window.addEventListener('scroll', function() {
    const header = document.getElementById('header');
    if (window.scrollY > 100) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Enhanced Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Enhanced Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animationPlayState = 'running';
            entry.target.classList.add('stagger-animation');
        }
    });
}, observerOptions);

// Initialize particles and observe elements
document.addEventListener('DOMContentLoaded', function() {
    createParticles();
    
    // Observe elements for animation
    document.querySelectorAll('.fade-in-up').forEach(element => {
        observer.observe(element);
    });
});

// Enhanced keyboard navigation
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Enhanced touch gestures for mobile
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', function(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
        // Add swipe functionality for slideshow if needed
        console.log(diff > 0 ? 'Swiped left' : 'Swiped right');
    }
}

// Make functions globally available
window.showSignup = showSignup;
window.showLogin = showLogin;
window.closeModal = closeModal;