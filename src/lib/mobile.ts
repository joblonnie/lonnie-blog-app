const mobileQuery = typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)') : null;

export function subscribeMobile(cb: () => void) {
  mobileQuery?.addEventListener('change', cb);
  return () => mobileQuery?.removeEventListener('change', cb);
}

export function getIsMobile() {
  return mobileQuery?.matches ?? false;
}
