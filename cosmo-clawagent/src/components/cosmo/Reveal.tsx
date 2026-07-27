'use client';

import { useLayoutEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { MOTION } from '@/design/tokens';

// Entrance animation. Three rules, in order of importance:
//  1. The markup ships visible. No JS, no gsap, a failed chunk load — the
//     content is still there. Hiding happens only after we know we can
//     un-hide it, and a watchdog restores visibility if gsap never arrives.
//  2. prefers-reduced-motion is read synchronously in a layout effect, so a
//     reduced-motion visitor never sees a frame of movement.
//  3. Only opacity/transform are touched; layout never shifts.

export default function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: 'div' | 'li' | 'section';
}) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    el.style.opacity = '0';
    el.style.transform = `translateY(${y}px)`;

    let cancelled = false;
    let ctx: { revert: () => void } | undefined;

    const show = () => {
      el.style.opacity = '';
      el.style.transform = '';
    };
    // Watchdog: if the gsap chunk is slow or blocked, the content must not
    // stay invisible.
    const watchdog = window.setTimeout(show, 2500);

    void (async () => {
      try {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([
          import('gsap'),
          import('gsap/ScrollTrigger'),
        ]);
        if (cancelled) return;
        window.clearTimeout(watchdog);
        gsap.registerPlugin(ScrollTrigger);
        ctx = gsap.context(() => {
          gsap.to(el, {
            opacity: 1,
            y: 0,
            duration: MOTION.base,
            delay,
            ease: MOTION.enter,
            clearProps: 'opacity,transform',
            scrollTrigger: { trigger: el, start: 'top 90%', once: true },
          });
        }, el);
      } catch {
        window.clearTimeout(watchdog);
        show();
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
      ctx?.revert();
      show();
    };
  }, [delay, y]);

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement & HTMLLIElement>}
      className={cn('will-change-[opacity,transform]', className)}
    >
      {children}
    </Tag>
  );
}
