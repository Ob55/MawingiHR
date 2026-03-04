const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mawingu HR Solutions running on port ${PORT}`);
});
