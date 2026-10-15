"use client";

import { useEffect, useRef, type ReactNode, type Ref } from "react";

/**
 * Fades its children in and up the first time they scroll into view.
 *
 * The hidden start state lives in CSS (`[data-reveal]` in globals.css), so
 * there's no flash and no layout shift. It's safe without JS (a <noscript>
 * style in the layout shows everything) and skipped entirely under
 * `prefers-reduced-motion`. `delay` staggers siblings, in ms.
 *
 * `group`: the element itself doesn't move; its `data-reveal-child`
 * descendants do, all triggered by this one element. For a sideways-scrolling
 * row, whose off-screen items would otherwise never "intersect".
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
  group = false,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li";
  group?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.dataset.reveal = "shown";
          observer.disconnect();
        }
      },
      // Fire a little before the element is fully on screen.
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      // The two element types share every prop used here.
      ref={ref as Ref<HTMLDivElement & HTMLLIElement>}
      data-reveal="hidden"
      data-reveal-group={group || undefined}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={className}
    >
      {children}
    </Tag>
  );
}
