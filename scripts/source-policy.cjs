// Sources explicitly approved for SpiritBible's editorial work.
// Keep spiritual-classic citations on the primary chapter pages of vetted works.
function isSpiritualClassic(url) {
  return url.hostname === 'ccel.org' && /^\/ccel\/(?:teresa\/castle2\/castle2|catherine\/dialog\/dialog|anonymous2\/cloud\/cloud)\.[a-z0-9.]+\.html$/.test(url.pathname);
}
function isSourceURL(url) {
  return url.protocol === 'https:' && !url.username && !url.password &&
    (url.hostname === 'www.vatican.va' && (url.pathname.startsWith('/archive/ENG0015/') || url.pathname.startsWith('/content/catechism/')) ||
     url.hostname === 'www.newadvent.org' && /^\/(cathen|fathers)\//.test(url.pathname) || isSpiritualClassic(url));
}
module.exports = { isSpiritualClassic, isSourceURL };
