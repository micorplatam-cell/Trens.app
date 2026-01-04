/**
 * TRENS Protection Script v6.0
 * TEMPORALMENTE DESACTIVADO - Esperando aprobación de Google Safe Browsing
 */
(function () {
  'use strict';

  // CAMBIAR A true DESPUÉS DE QUE GOOGLE APRUEBE LA REVISIÓN
  var PROTECTIONS_ENABLED = false;

  if (!PROTECTIONS_ENABLED) {
    return;
  }

  // Bloquear zoom
  document.addEventListener('gesturestart', function(e) { e.preventDefault(); }, { passive: false, capture: true });
  document.addEventListener('gesturechange', function(e) { e.preventDefault(); }, { passive: false, capture: true });
  document.addEventListener('gestureend', function(e) { e.preventDefault(); }, { passive: false, capture: true });

  document.addEventListener('touchstart', function(e) {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false, capture: true });

  document.addEventListener('touchmove', function(e) {
    if (e.touches.length > 1 || (e.scale !== undefined && e.scale !== 1)) e.preventDefault();
  }, { passive: false, capture: true });

  var lastTouchEnd = 0;
  document.addEventListener('touchend', function(e) {
    var now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false, capture: true });

  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
      e.preventDefault();
    }
  }, { capture: true });

  document.addEventListener('wheel', function(e) {
    if (e.ctrlKey || e.metaKey) e.preventDefault();
  }, { passive: false, capture: true });

  document.addEventListener('contextmenu', function(e) { e.preventDefault(); return false; }, { capture: true });
  document.addEventListener('selectstart', function(e) {
    var tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
    e.preventDefault();
    return false;
  }, { capture: true });
  document.addEventListener('dragstart', function(e) { e.preventDefault(); return false; }, { capture: true });

  var style = document.createElement('style');
  style.textContent = 'body,html{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;}input,textarea{-webkit-user-select:text!important;user-select:text!important;}input,select,textarea,button{font-size:16px!important;}img{-webkit-user-drag:none!important;pointer-events:none!important;}';
  document.head.appendChild(style);
})();
