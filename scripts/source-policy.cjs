// Sources explicitly approved for SpiritBible's editorial work.
// Keep spiritual-classic citations on the primary chapter pages of vetted works.
function isSpiritualClassic(url) {
  return url.hostname === 'ccel.org' && /^\/ccel\/(?:teresa\/castle2\/castle2|catherine\/dialog\/dialog|anonymous2\/cloud\/cloud)\.[a-z0-9.]+\.html$/.test(url.pathname);
}
function isPapalWriting(url) {
  return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
    url.hostname === 'www.vatican.va' &&
    /^\/content\/(?:john-paul-ii|benedict-xvi)\/en\/[a-z_]+\/(?:\d{4}\/)?documents\/[a-zA-Z0-9_-]+\.html$/.test(url.pathname);
}
function isSourceURL(url) {
  return url.protocol === 'https:' && !url.username && !url.password &&
    (url.hostname === 'www.vatican.va' && (url.pathname.startsWith('/archive/ENG0015/') || url.pathname.startsWith('/content/catechism/')) ||
     url.hostname === 'www.newadvent.org' && /^\/(cathen|fathers)\//.test(url.pathname) || isSpiritualClassic(url) || isPapalWriting(url));
}
module.exports = { isSpiritualClassic, isPapalWriting, isSourceURL };
