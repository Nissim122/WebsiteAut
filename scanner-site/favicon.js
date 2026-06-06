(function () {
  var FAVICON = 'favicon.svg';
  var base = document.currentScript.src.replace(/[^/]*$/, '');
  var link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = base + FAVICON;
  document.head.appendChild(link);
})();
