(function () {
  document.querySelectorAll('.glass-tabbar').forEach(function (bar) {
    var items = bar.querySelectorAll('.glass-tabbar__item');
    items.forEach(function (item) {
      item.addEventListener('click', function () {
        items.forEach(function (other) {
          other.classList.remove('is-active');
        });
        item.classList.add('is-active');
      });
    });
  });
})();
