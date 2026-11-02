document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('site-nav');
  if (!nav) return;

  const menuToggle = document.querySelector('.menu-toggle');
  const dropdowns = [...nav.querySelectorAll('.has-dropdown')].map((item, index) => {
    const trigger = item.querySelector(':scope > a');
    const dropdown = item.querySelector(':scope > .nav-dropdown');
    if (!trigger || !dropdown) return null;

    if (!dropdown.id) dropdown.id = `site-nav-dropdown-${index + 1}`;
    trigger.setAttribute('aria-controls', dropdown.id);
    trigger.setAttribute('aria-expanded', String(item.classList.contains('is-open')));
    return { item, trigger };
  }).filter(Boolean);

  const syncExpandedStates = () => {
    dropdowns.forEach(({ item, trigger }) => {
      trigger.setAttribute('aria-expanded', String(item.classList.contains('is-open')));
    });

    if (menuToggle) {
      const isOpen = nav.classList.contains('is-open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    }
  };

  nav.addEventListener('click', syncExpandedStates);
  document.addEventListener('click', syncExpandedStates);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    const openDropdown = dropdowns.find(({ item }) => item.classList.contains('is-open'));
    if (openDropdown) {
      openDropdown.item.classList.remove('is-open');
      openDropdown.trigger.focus();
      syncExpandedStates();
      event.preventDefault();
      return;
    }

    if (nav.classList.contains('is-open')) {
      nav.classList.remove('is-open');
      menuToggle?.classList.remove('is-open');
      syncExpandedStates();
      menuToggle?.focus();
      event.preventDefault();
    }
  });
});
