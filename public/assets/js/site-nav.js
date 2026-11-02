// Footer year, mobile nav toggle, and click-to-open nav dropdowns (shared by all maintained pages).
(function () {
  document.getElementById('year').textContent = new Date().getFullYear();
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  // Mobile nav open/close
  toggle.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open);
    toggle.classList.toggle('is-open', open);
  });

  // Close mobile nav on any non-dropdown-trigger link click
  nav.querySelectorAll('a').forEach(function (link) {
    if (link.parentElement && link.parentElement.classList.contains('has-dropdown')) return;
    link.addEventListener('click', function () {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.classList.remove('is-open');
    });
  });

  // Dropdown: click to toggle, close on item select, close on outside click
  nav.querySelectorAll('.has-dropdown').forEach(function (item) {
    var parentLink = item.querySelector(':scope > a');
    parentLink.addEventListener('click', function (e) {
      e.preventDefault();
      item.classList.toggle('is-open');
    });
    item.querySelectorAll('.nav-dropdown a').forEach(function (link) {
      link.addEventListener('click', function () {
        item.classList.remove('is-open');
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.classList.remove('is-open');
      });
    });
  });

  document.addEventListener('click', function (e) {
    nav.querySelectorAll('.has-dropdown.is-open').forEach(function (item) {
      if (!item.contains(e.target)) item.classList.remove('is-open');
    });
  });
})();
