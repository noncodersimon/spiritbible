'use client';

import { useEffect, useRef, useState } from 'react';
import ReaderDialog from './ReaderDialog';

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
type Device = { kind: 'ios' | 'android' | 'windows' | 'mac' | 'other'; safari: boolean };
const installedKey = 'spiritbible:installed';

export default function InstallButton() {
  const [device, setDevice] = useState<Device | null>(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const prompt = useRef<InstallPrompt | null>(null);

  function rememberInstalled() {
    setInstalled(true);
    setHelp(false);
    try { localStorage.setItem(installedKey, '1'); } catch { /* Still hide it for this visit. */ }
  }

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const kind = ios ? 'ios' : /Android|Mobi/.test(ua) ? 'android' : /Windows/.test(ua) ? 'windows' : /Macintosh|Mac OS X/.test(ua) ? 'mac' : 'other';
    setDevice({ kind, safari: /Safari/.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR|OPiOS/.test(ua) });
    const display = window.matchMedia('(display-mode: standalone)');
    const inApp = () => display.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (inApp()) rememberInstalled();
    else { try { setInstalled(localStorage.getItem(installedKey) === '1'); } catch { /* Storage is optional. */ } }
    const offered = (event: Event) => { event.preventDefault(); prompt.current = event as InstallPrompt; };
    const completed = () => { prompt.current = null; rememberInstalled(); };
    const modeChanged = () => { if (inApp()) completed(); };
    const storageChanged = (event: StorageEvent) => {
      if (event.key === installedKey || event.key === null) setInstalled(inApp() || event.newValue === '1');
    };
    window.addEventListener('beforeinstallprompt', offered);
    window.addEventListener('appinstalled', completed);
    window.addEventListener('storage', storageChanged);
    display.addEventListener('change', modeChanged);
    // Only the offline explanation is cached; Bible text, commentary and search stay live.
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => { /* Menu/shortcut options still work. */ });
    return () => {
      window.removeEventListener('beforeinstallprompt', offered);
      window.removeEventListener('appinstalled', completed);
      window.removeEventListener('storage', storageChanged);
      display.removeEventListener('change', modeChanged);
    };
  }, []);

  async function install() {
    const available = prompt.current;
    if (!available) { setHelp(true); return; }
    prompt.current = null;
    setBusy(true);
    try {
      await available.prompt();
      await available.userChoice;
      // appinstalled confirms completion; dismissing the browser prompt never hides the button.
    } catch { setHelp(true); }
    finally { setBusy(false); }
  }

  if (!device || installed) return null;
  const label = device.kind === 'ios' || device.kind === 'android' ? 'Add to Home Screen' : device.kind === 'windows' ? 'Add to Desktop' : device.kind === 'mac' && device.safari ? 'Add to Dock' : 'Install app';
  return <div className="install-control">
    <button type="button" className="install-trigger" aria-label={label} title={label} onClick={install} disabled={busy}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M12 8v8m-4-4h8" /></svg>
    </button>
    {help && <ReaderDialog title={label} onClose={() => setHelp(false)}>
      <div className="install-help">
        {device.kind === 'ios' ? <>
          {!device.safari && <p>Open SpiritBible in Safari to add it to your Home Screen.</p>}
          <ol><li>In Safari, tap <strong>Share</strong> (the square with an arrow pointing up).</li><li>Choose <strong>Add to Home Screen</strong>. You may need to scroll down or tap <strong>Edit Actions</strong> to find it.</li><li>Leave <strong>Open as Web App</strong> on if shown, then tap <strong>Add</strong>.</li></ol>
        </> : device.kind === 'android' ? <>
          <p>Open your browser’s menu (usually ⋮), choose <strong>Add to Home Screen</strong> or <strong>Install app</strong>, then confirm.</p>
          <p>If you opened this page inside another app, first open it in Chrome or your usual browser.</p>
        </> : device.kind === 'windows' ? <>
          <p>Download a shortcut, then move <strong>SpiritBible.url</strong> from Downloads to your Desktop. Double-click it to open SpiritBible.</p>
          <a className="install-download" href="/SpiritBible.url" download="SpiritBible.url" onClick={() => setDownloaded(true)}>Download desktop shortcut</a>
          {downloaded && <p role="status">Once the download finishes, move the shortcut to your Desktop.</p>}
          <p>You can also install SpiritBible using the app-install option in Chrome or Edge’s menu, when available.</p>
        </> : device.kind === 'mac' && device.safari ? <>
          <p>In Safari’s <strong>File</strong> menu, choose <strong>Add to Dock</strong>, then <strong>Add</strong>.</p>
          <p>If that option is unavailable, drag the website address from Safari’s address bar onto your Desktop to create a shortcut.</p>
        </> : <>
          <p>Look for <strong>Install SpiritBible</strong> or <strong>Install page as app</strong> in your browser’s menu.</p>
          <p>You can also drag the website address from the address bar onto your Desktop to create a shortcut.</p>
        </>}
        <button type="button" className="install-confirm" onClick={rememberInstalled}>I’ve added it — hide this button</button>
      </div>
    </ReaderDialog>}
  </div>;
}
