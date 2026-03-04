/* ============================================
   MAWINGU HR SOLUTIONS — Main JavaScript
   ============================================ */

(function () {
  'use strict';

  // --- Scroll Reveal (Intersection Observer) ---
  function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-right, .reveal-scale');

    if (!revealElements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    revealElements.forEach((el) => observer.observe(el));
  }

  // --- Navbar scroll behavior ---
  function initNavbar() {
    const nav = document.getElementById('mainNav');
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');

    if (!nav) return;

    // Scroll effect
    let lastScroll = 0;
    let ticking = false;

    function updateNav() {
      const scrollY = window.scrollY;

      if (scrollY > 60) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }

      lastScroll = scrollY;
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateNav);
        ticking = true;
      }
    });

    // Mobile toggle
    if (toggle && links) {
      toggle.addEventListener('click', () => {
        const isOpen = links.classList.toggle('open');
        toggle.classList.toggle('active');
        toggle.setAttribute('aria-expanded', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });

      // Close on link click
      links.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
          links.classList.remove('open');
          toggle.classList.remove('active');
          toggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        });
      });

      // Close on escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && links.classList.contains('open')) {
          links.classList.remove('open');
          toggle.classList.remove('active');
          toggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        }
      });
    }
  }

  // --- Smooth scroll for anchor links ---
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          e.preventDefault();
          const offset = 80;
          const targetPosition = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        }
      });
    });
  }

  // --- Pillar cards hover interaction ---
  function initPillarCards() {
    const cards = document.querySelectorAll('.pillar-card');

    cards.forEach((card) => {
      card.addEventListener('mouseenter', function () {
        cards.forEach((c) => {
          if (c !== this) c.style.opacity = '0.7';
        });
      });

      card.addEventListener('mouseleave', function () {
        cards.forEach((c) => (c.style.opacity = '1'));
      });
    });
  }

  // --- Parallax-lite for hero blobs ---
  function initParallax() {
    const blobs = document.querySelectorAll('.blob');
    if (!blobs.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;

    document.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    function animateBlobs() {
      currentX += (mouseX - currentX) * 0.03;
      currentY += (mouseY - currentY) * 0.03;

      blobs.forEach((blob, i) => {
        const factor = (i + 1) * 8;
        blob.style.transform = `translate(${currentX * factor}px, ${currentY * factor}px)`;
      });

      requestAnimationFrame(animateBlobs);
    }

    animateBlobs();
  }

  // --- Page transition ---
  function initPageTransition() {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';

    window.addEventListener('load', () => {
      document.body.style.opacity = '1';
    });

    // Fallback in case load already fired
    if (document.readyState === 'complete') {
      document.body.style.opacity = '1';
    }
  }

  // --- Active nav link highlight ---
  function initActiveNav() {
    const path = window.location.pathname;
    document.querySelectorAll('.nav-links a').forEach((link) => {
      if (link.getAttribute('href') === path) {
        link.classList.add('active');
      }
    });
  }

  // --- Initialize everything ---
  initPageTransition();

  document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initNavbar();
    initSmoothScroll();
    initPillarCards();
    initParallax();
    initActiveNav();
  });
})();
