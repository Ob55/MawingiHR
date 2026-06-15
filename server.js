const express = require('express');
const path = require('path');
const analytics = require('./analytics');

const app = express();
const PORT = process.env.PORT || 3000;
const ASSET_VERSION = '20260615-analytics-1';
// URL of the blog admin's /api/posts endpoint. The Vercel deployment of the
// MawingHRBlog repo serves this. Override with the BLOG_API_URL env var if the
// admin ever moves to a different host.
const BLOG_API_URL = process.env.BLOG_API_URL || 'https://mawing-hr-blog.vercel.app/api/posts';

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
  res.locals.assetVersion = ASSET_VERSION;
  res.locals.blogApiUrl = BLOG_API_URL;
  next();
});

// Static files
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: 0
}));

// Site view tracking: counts page views + blog-post opens, exposes /api/stats.
// (Mounted after static so asset requests are never counted.)
analytics.mount(app);

// Routes
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Mawingu HR Solutions — Clarity in People. Structure in Growth.',
    page: 'home'
  });
});

app.get('/about', (req, res) => {
  res.render('about', {
    title: 'About Us — Mawingu HR Solutions',
    page: 'about'
  });
});

app.get('/corporate-services', (req, res) => {
  res.render('corporate', {
    title: 'Corporate Services — Mawingu HR Solutions',
    page: 'corporate'
  });
});

app.get('/professional-services', (req, res) => {
  res.render('professional', {
    title: 'Professional Services — Mawingu HR Solutions',
    page: 'professional'
  });
});

app.get('/blog', (req, res) => {
  res.render('blog', {
    title: 'Blog & Insights — Mawingu HR Solutions',
    page: 'blog'
  });
});

app.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'Contact Us — Mawingu HR Solutions',
    page: 'contact'
  });
});

// 404
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Page Not Found — Mawingu HR Solutions',
    page: '404'
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mawingu HR Solutions running on port ${PORT}`);
});

// Graceful shutdown handlers - FIX FOR CPANEL LOCK
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
