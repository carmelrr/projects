import Image from 'next/image';

/**
 * Fixed, non-interactive Owl Performance logo watermark that sits behind the
 * page content. Place inside a `relative` container; render content at
 * `z-[2]` (or higher) so it stays above the watermark.
 */
export function BrandWatermark() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1] flex items-center justify-center"
      aria-hidden="true"
    >
      <Image
        src="/images/op-logo-transparent.png"
        alt=""
        width={800}
        height={800}
        className="size-[70vmin] max-w-[900px] opacity-[0.06] blur-[2px] dark:invert dark:opacity-[0.08]"
        priority
      />
    </div>
  );
}
