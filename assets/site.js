/* Wakems : petits réglages communs. */
(function(){
  var t=window.WAKEMS_TIKTOK;
  if(t&&/^https:\/\/(www\.)?tiktok\.com\//.test(t))document.querySelectorAll('.tiktokHref').forEach(function(a){a.href=t});
})();
