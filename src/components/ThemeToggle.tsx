'use client';

import { useEffect, useRef, useState } from 'react';

type Theme = 'system' | 'light' | 'dark';
const themes: Theme[] = ['system', 'light', 'dark'];
const labels = { system: 'System', light: 'Light', dark: 'Dark' };
const storedTheme = (value: string | null | undefined): Theme => value === 'light' || value === 'dark' ? value : 'system';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const preference = useRef<Theme>('system');

  useEffect(() => {
    const system = window.matchMedia('(prefers-color-scheme: dark)');
    function apply(next: Theme) {
      preference.current = next;
      setTheme(next);
      document.documentElement.dataset.themePreference = next;
      document.documentElement.dataset.theme = next === 'system' ? (system.matches ? 'dark' : 'light') : next;
    }
    let initial = storedTheme(document.documentElement.dataset.themePreference);
    try { initial = storedTheme(localStorage.getItem('spiritbible-theme')); } catch { /* Retain the early script's preference when storage is blocked. */ }
    apply(initial);
    const systemChanged = () => apply(preference.current);
    const storageChanged = (event: StorageEvent) => {
      if (event.key === 'spiritbible-theme' || event.key === null) apply(storedTheme(event.newValue));
    };
    system.addEventListener('change', systemChanged);
    window.addEventListener('storage', storageChanged);
    return () => { system.removeEventListener('change', systemChanged); window.removeEventListener('storage', storageChanged); };
  }, []);

  useEffect(() => {
    if (!open) return;
    items.current[themes.indexOf(preference.current)]?.focus();
    function outside(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  function choose(next: Theme) {
    preference.current = next;
    setTheme(next);
    document.documentElement.dataset.themePreference = next;
    document.documentElement.dataset.theme = next === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : next;
    try { localStorage.setItem('spiritbible-theme', next); } catch { /* Theme changes still work for this visit. */ }
    setOpen(false);
    trigger.current?.focus();
  }

  return <div className="theme-control" ref={container} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <button type="button" ref={trigger} className="theme-trigger" aria-label={`Colour theme: ${labels[theme]}`} title={`Colour theme: ${labels[theme]}`}
      aria-haspopup="menu" aria-expanded={open} aria-controls="theme-menu" onClick={() => setOpen(!open)}
      onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); } }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {theme === 'dark' ? <path d="M20.6 13.2A8.5 8.5 0 0 1 10.8 3.4a8.5 8.5 0 1 0 9.8 9.8Z" /> : theme === 'light' ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5" /></> : <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>}
      </svg>
    </button>
    {open && <div id="theme-menu" className="theme-menu" role="menu" aria-label="Colour theme" onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
      const index = items.current.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : event.key === 'ArrowDown' ? (index + 1) % 3 : event.key === 'ArrowUp' ? (index + 2) % 3 : -1;
      if (next >= 0) { event.preventDefault(); items.current[next]?.focus(); }
    }}>
      {themes.map((value, index) => <button type="button" role="menuitemradio" aria-checked={theme === value} key={value}
        ref={element => { items.current[index] = element; }} tabIndex={-1} onClick={() => choose(value)}>
        <span>{labels[value]}</span><span aria-hidden="true">{theme === value ? '✓' : ''}</span>
      </button>)}
    </div>}
  </div>;
}
