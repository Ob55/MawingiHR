/* ============================================
   MAWINGU HR SOLUTIONS — main.js
   Vanilla motion: fade-up + stagger via IntersectionObserver,
   navbar scroll behavior, mobile toggle, smooth anchor scroll.
   ============================================ */

(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Scroll reveal (fade-up / fade-in / fade-down / slide-left / slide-right / scale-in / stagger) ---
  function initReveal() {
    const els = document.querySelectorAll('.fade-up, .fade-in, .fade-down, .slide-left, .slide-right, .scale-in, .stagger');
    if (!els.length) return;

    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    els.forEach((el) => io.observe(el));
  }

  // --- Navbar scroll state + mobile toggle ---
  function initNav() {
    const nav = document.getElementById('mainNav');
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    if (!nav) return;

    let ticking = false;
    function update() {
      nav.classList.toggle('scrolled', window.scrollY > 30);
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();

    if (toggle && links) {
      toggle.addEventListener('click', () => {
        const open = links.classList.toggle('open');
        toggle.classList.toggle('active', open);
        toggle.setAttribute('aria-expanded', String(open));
        document.body.style.overflow = open ? 'hidden' : '';
      });

      links.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
          links.classList.remove('open');
          toggle.classList.remove('active');
          toggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        });
      });

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

  // --- Smooth anchor scroll with offset for fixed nav ---
  function initSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      const href = anchor.getAttribute('href');
      if (href === '#' || href.length < 2) return;
      anchor.addEventListener('click', function (e) {
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
      });
    });
  }

  // --- Subtle parallax on hero media cards ---
  function initHeroParallax() {
    if (reduced) return;
    const media = document.querySelectorAll('.hero-card-media');
    if (!media.length) return;

    let mx = 0, my = 0, cx = 0, cy = 0;
    window.addEventListener('mousemove', (e) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    });
    function tick() {
      cx += (mx - cx) * 0.04;
      cy += (my - cy) * 0.04;
      media.forEach((m, i) => {
        const f = (i + 1) * 4;
        const base = m.classList.contains('scale-1-5') ? 'scale(1.4)' : '';
        m.style.transform = `${base} translate(${cx * f}px, ${cy * f}px)`;
      });
      requestAnimationFrame(tick);
    }
    tick();
  }

  // --- Blog posts: fetch + render + show-more toggle ---
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function formatDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const date = d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${date} · ${time}`;
  }

  // Holds the active posts so the modal can look them up by id.
  let blogPostsCache = [];

  function renderBlogPosts(posts) {
    const wrap = document.getElementById('blogPosts');
    const empty = document.getElementById('blogEmpty');
    if (!wrap) return;

    blogPostsCache = posts || [];

    if (!posts || !posts.length) {
      wrap.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    wrap.innerHTML = posts.map((p, i) => {
      const img = p.image ? `<div class="blog-post-media"><img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" loading="lazy"></div>` : '';
      const date = formatDate(p.publishedAt);
      return `
        <article class="blog-post-card fade-up" style="--delay: ${i * 80}ms" data-post-id="${escapeHtml(p.id || '')}">
          ${img}
          <div class="blog-post-body">
            ${date ? `<div class="blog-post-meta"><span class="blog-post-date">${escapeHtml(date)}</span></div>` : ''}
            <h3 class="blog-post-title">${escapeHtml(p.title || 'Untitled')}</h3>
            <p class="blog-post-desc">${escapeHtml(p.shortDescription || '')}</p>
            <button type="button" class="blog-show-more" data-post-id="${escapeHtml(p.id || '')}">
              <span class="label">Show more</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </article>
      `;
    }).join('');

    wrap.querySelectorAll('.blog-show-more').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-post-id');
        openBlogModal(id);
      });
    });

    // Re-trigger fade-up reveal for newly inserted cards.
    if (!reduced && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      wrap.querySelectorAll('.fade-up').forEach((el) => io.observe(el));
    } else {
      wrap.querySelectorAll('.fade-up').forEach((el) => el.classList.add('in'));
    }
  }

  // -------- Blog modal --------
  let lastFocusedEl = null;

  // Fire-and-forget beacon so the server can tally which posts get opened.
  function trackPostView(post) {
    try {
      const payload = JSON.stringify({ type: 'post', id: post.id, title: post.title });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/track', { method: 'POST', body: payload, keepalive: true });
      }
    } catch (_) { /* analytics must never break the page */ }
  }

  function openBlogModal(id) {
    const post = blogPostsCache.find((p) => p.id === id);
    const modal = document.getElementById('blogModal');
    if (!post || !modal) return;

    lastFocusedEl = document.activeElement;

    // Count this post open for the weekly "Top posts by views" report.
    trackPostView(post);

    const img = document.getElementById('modalImage');
    if (post.image) {
      img.src = post.image;
      img.alt = post.title || '';
      img.parentElement.hidden = false;
    } else {
      img.removeAttribute('src');
      img.parentElement.hidden = true;
    }

    document.getElementById('modalTitle').textContent = post.title || 'Untitled';
    document.getElementById('modalShort').textContent = post.shortDescription || '';
    document.getElementById('modalDate').textContent = formatDateTime(post.publishedAt) || '';
    const authorEl = document.getElementById('modalAuthor');
    if (authorEl) authorEl.textContent = '';

    // Body comes from the admin as HTML (Quill output). Trusted source.
    document.getElementById('modalContent').innerHTML = post.body || '';

    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => modal.classList.add('open'));
    document.body.style.overflow = 'hidden';

    const closeBtn = modal.querySelector('.blog-modal-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeBlogModal() {
    const modal = document.getElementById('blogModal');
    if (!modal || modal.hidden) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(() => {
      modal.hidden = true;
      if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') lastFocusedEl.focus();
    }, 280);
  }

  function initBlogModal() {
    const modal = document.getElementById('blogModal');
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-close')) closeBlogModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) closeBlogModal();
    });
  }

  async function initBlog() {
    const wrap = document.getElementById('blogPosts');
    if (!wrap) return;

    const apiUrl = window.BLOG_API_URL;
    if (!apiUrl) {
      renderBlogPosts([]);
      return;
    }

    try {
      const res = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error('Failed to load posts');
      const data = await res.json();
      const posts = Array.isArray(data) ? data : (data.posts || []);
      renderBlogPosts(posts);
    } catch (err) {
      console.warn('Blog API unavailable.', err);
      renderBlogPosts([]);
    }
  }

  function init() {
    initReveal();
    initNav();
    initSmoothAnchors();
    initHeroParallax();
    initBlog();
    initBlogModal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
