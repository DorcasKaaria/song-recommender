/**
 * navigation.js
 * -----------------------------------------------------------------------------
 * Handles switching between the "pages" (Home, Search, Recommendations,
 * Predict Genre, Predict Popularity, Add Song). This is a single-page app:
 * every page already exists in index.html, and goToPage() just shows/hides
 * the right <section class="page"> and highlights the right sidebar button.
 * -----------------------------------------------------------------------------
 */

const navItems = document.querySelectorAll('.nav-item[data-page]');
const pages = document.querySelectorAll('.page');

function goToPage(pageId) {
  pages.forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${pageId}`).classList.add('active');
  navItems.forEach(n => n.classList.toggle('active', n.dataset.page === pageId));
  document.querySelector('.content').parentElement.scrollTop = 0;
}

navItems.forEach(item => {
  item.addEventListener('click', () => goToPage(item.dataset.page));
});
