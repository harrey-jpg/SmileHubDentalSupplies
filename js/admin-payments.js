// Presentation only: inherit the admin theme and keep embedded dialogs in view.
(function() {
  'use strict';
  var embedded = document.documentElement.classList.contains('embedded');
  var themeObserver;
  function syncTheme() {
    var dark = false;
    try {
      if (embedded) dark = window.parent.document.body.classList.contains('dark');
      else {
        var stored = localStorage.getItem('smilehub_theme');
        dark = stored === 'dark' || stored === '"dark"';
      }
    } catch (_) { /* Default to the admin's light theme if preference access fails. */ }
    document.body.classList.toggle('dark', dark);
  }
  syncTheme();
  window.addEventListener('storage', function(event) { if (event.key === 'smilehub_theme') syncTheme(); });
  if (!embedded) return;
  try {
    themeObserver = new MutationObserver(syncTheme);
    themeObserver.observe(window.parent.document.body, { attributes:true, attributeFilter:['class'] });
  } catch (_) { /* Standalone use does not require a parent document. */ }
  function positionDialogs() {
    var frame = window.frameElement;
    if (!frame) return;
    var bounds = frame.getBoundingClientRect();
    var top = Math.max(16, 16 - bounds.top);
    var bottom = Math.min(window.innerHeight - 16, window.parent.innerHeight - bounds.top - 16);
    document.querySelectorAll('dialog[open]').forEach(function(dialog) {
      dialog.style.maxHeight = Math.max(120, bottom - top) + 'px';
      dialog.style.top = Math.max(top, (top + bottom - dialog.getBoundingClientRect().height) / 2) + 'px';
    });
  }
  var dialogObserver = new MutationObserver(positionDialogs);
  document.querySelectorAll('dialog').forEach(function(dialog) { dialogObserver.observe(dialog, { attributes:true, attributeFilter:['open'] }); });
  window.parent.addEventListener('scroll', positionDialogs, { passive:true });
  window.parent.addEventListener('resize', positionDialogs);
  window.addEventListener('resize', positionDialogs);
  window.addEventListener('pagehide', function() {
    if (themeObserver) themeObserver.disconnect();
    dialogObserver.disconnect();
    window.parent.removeEventListener('scroll', positionDialogs);
    window.parent.removeEventListener('resize', positionDialogs);
  }, { once:true });
})();
