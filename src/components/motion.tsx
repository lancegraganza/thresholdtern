"use client";
import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/** Animation never gates rendering or starts blockchain work. */
export function Motion({
  children,
  className = "",
  watch = "",
  scroll = false,
}: {
  children: ReactNode;
  className?: string;
  watch?: string | number;
  scroll?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const items = ref.current?.querySelectorAll("[data-enter]");
        if (items?.length)
          gsap.from(items, {
            y: 18,
            opacity: 0,
            duration: 0.55,
            stagger: 0.07,
            ease: "power2.out",
            clearProps: "all",
          });
        else
          gsap.from(ref.current, {
            y: 10,
            opacity: 0,
            duration: 0.32,
            ease: "power2.out",
            clearProps: "all",
          });
        if (scroll) {
          const animations = new Map<Element, gsap.core.Tween>();
          const observer = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  animations.get(entry.target)?.play();
                  observer.unobserve(entry.target);
                }
              });
            },
            { rootMargin: "0px 0px -8% 0px" },
          );
          ref.current?.querySelectorAll("[data-reveal]").forEach((item) => {
            animations.set(
              item,
              gsap.from(item, {
                y: 28,
                opacity: 0,
                duration: 0.6,
                paused: true,
                ease: "power2.out",
                clearProps: "all",
              }),
            );
            observer.observe(item);
          });
          return () => observer.disconnect();
        }
      });
      return () => media.revert();
    },
    { scope: ref, dependencies: [watch, scroll], revertOnUpdate: true },
  );
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
