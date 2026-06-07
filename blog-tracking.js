/**
 * blog-tracking.js
 * Custom GA4 events for all blog posts.
 * Loaded via <script src="blog-tracking.js" defer> in every post.
 */
(function () {
  function track(name, params) {
    if (typeof gtag === 'function') gtag('event', name, params);
  }

  // scroll_depth at 25 / 50 / 75 / 90 %
  var fired = {};
  var depths = [25, 50, 75, 90];
  function checkDepth() {
    var total = document.documentElement.scrollHeight - window.innerHeight;
    if (total <= 0) return;
    var pct = Math.round((window.scrollY / total) * 100);
    for (var i = 0; i < depths.length; i++) {
      var d = depths[i];
      if (pct >= d && !fired[d]) {
        fired[d] = true;
        track('scroll_depth', { percent_scrolled: d });
      }
    }
  }
  window.addEventListener('scroll', checkDepth, { passive: true });

  // blog_cta_click — the "לתיאום שיחת אפיון" button in .post-cta
  // blog_scanner_click — any link pointing to the scanner
  document.addEventListener('click', function (e) {
    var el = e.target;

    var cta = el.closest('.post-cta a, .post-cta button');
    if (cta) {
      track('blog_cta_click', { destination: cta.href || '' });
    }

    var scannerLink = el.closest('a[href*="scanner"]');
    if (scannerLink) {
      track('blog_scanner_click', { destination: scannerLink.href });
    }
  });
})();
