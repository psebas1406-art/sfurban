/* Páginas legales: completa los datos del responsable, el correo y la versión
   desde config.js (un solo lugar para cambiarlos). Lo que falte se resalta. */
(function () {
  SF.mountLayout();
  const L = SF.config.legal, b = SF.config.brand;
  SF.$$('[data-legal]').forEach(el => {
    const v = L[el.dataset.legal] ?? '';
    el.textContent = v;
    if (String(v).startsWith('[pendiente')) el.classList.add('is-pending');
  });
  SF.$$('[data-legal-version]').forEach(el => { el.textContent = L.versions[el.dataset.legalVersion] || ''; });
  SF.$$('[data-contact-email]').forEach(a => { a.href = 'mailto:' + b.email; a.textContent = b.email; });
  SF.$$('[data-site]').forEach(a => { a.href = new URL('index.html', location.href).href; a.textContent = new URL('.', location.href).href.replace(/^https?:\/\//, '').replace(/\/$/, ''); });
})();
