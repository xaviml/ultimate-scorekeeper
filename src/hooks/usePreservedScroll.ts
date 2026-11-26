import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * For a page that stays mounted, hidden, while another is opened over it: the window
 * has one scroll position, so the page underneath would come back wherever the one
 * over it was left. While uncovered this remembers where the page was scrolled to;
 * covering it starts the new page at the top, and uncovering puts the page back where
 * it was.
 */
export function usePreservedScroll(covered: boolean): void {
  const saved = useRef(0);

  useEffect(() => {
    if (covered) return;
    const remember = () => {
      saved.current = window.scrollY;
    };
    window.addEventListener('scroll', remember, { passive: true });
    return () => window.removeEventListener('scroll', remember);
  }, [covered]);

  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, covered ? 0 : saved.current);
  }, [covered]);
}
