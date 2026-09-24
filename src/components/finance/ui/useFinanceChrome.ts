import { useEffect } from 'react';

/** Paints the browser chrome (theme-color, html/body bg) dark while a finance screen is mounted. */
export function useFinanceChrome(color = '#07080c') {
  useEffect(() => {
    const metas = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));
    const originals = metas.map((m) => m.getAttribute('content'));
    const htmlBg = document.documentElement.style.backgroundColor;
    const bodyBg = document.body.style.backgroundColor;

    metas.forEach((m) => m.setAttribute('content', color));
    document.documentElement.style.backgroundColor = color;
    document.body.style.backgroundColor = color;

    return () => {
      metas.forEach((m, i) => m.setAttribute('content', originals[i] ?? '#131921'));
      document.documentElement.style.backgroundColor = htmlBg;
      document.body.style.backgroundColor = bodyBg;
    };
  }, [color]);
}
