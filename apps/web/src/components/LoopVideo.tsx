"use client";

import { useEffect, useRef } from "react";
import { SCREENSHOTS } from "./screenshots.generated";
import { VIDEOS, type VideoName } from "./videos";

/**
 * A short, silent app recording that loops like a GIF — but only while it's
 * on screen (an IntersectionObserver plays and pauses it), so a page full of
 * clips doesn't decode them all at once. With reduced motion it never plays:
 * the poster (a still of the same screen) stands in.
 */
export function LoopVideo({ name, label }: { name: VideoName; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const { width, height, poster, v } = VIDEOS[name];

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.4 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      width={width}
      height={height}
      poster={`/screenshots/${poster}@2x.webp?v=${SCREENSHOTS[poster].v}`}
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={label}
      className="block h-auto w-full min-w-0"
    >
      <source src={`/videos/${name}.webm?v=${v}`} type="video/webm" />
      <source src={`/videos/${name}.mp4?v=${v}`} type="video/mp4" />
    </video>
  );
}
