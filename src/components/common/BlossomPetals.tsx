'use client';

import React, { useMemo } from 'react';

interface PetalConfig {
  id: number;
  left: number; // percentage (0-100)
  size: number; // px (16-26)
  duration: number; // seconds (7-14)
  delay: number; // negative seconds (-1 to -14)
  swayDuration: number; // seconds (2.5-4.5)
  swayDistance: number; // px (30-65)
  rotationDuration: number; // seconds (3-6)
  rotationDirection: number; // 1 or -1
  opacity: number; // (0.75-0.95)
  colorScheme: 'vibrant-sakura' | 'rose-blush' | 'fresh-green' | 'soft-coral' | 'emerald-sage';
  shape: number; // 0, 1, 2, 3
}

export const BlossomPetals: React.FC = () => {
  // Pre-computed rich set of 38 petals for noticeable, mesmerizing blossom shower
  const petals: PetalConfig[] = useMemo(() => {
    return [
      { id: 1, left: 3, size: 21, duration: 9.5, delay: -1.2, swayDuration: 3.2, swayDistance: 45, rotationDuration: 4.5, rotationDirection: 1, opacity: 0.9, colorScheme: 'vibrant-sakura', shape: 0 },
      { id: 2, left: 8, size: 17, duration: 11.2, delay: -5.7, swayDuration: 3.8, swayDistance: -38, rotationDuration: 5.2, rotationDirection: -1, opacity: 0.85, colorScheme: 'fresh-green', shape: 3 },
      { id: 3, left: 14, size: 24, duration: 8.8, delay: -3.1, swayDuration: 2.9, swayDistance: 50, rotationDuration: 3.8, rotationDirection: 1, opacity: 0.95, colorScheme: 'rose-blush', shape: 1 },
      { id: 4, left: 19, size: 18, duration: 12.0, delay: -7.4, swayDuration: 3.5, swayDistance: -42, rotationDuration: 5.8, rotationDirection: -1, opacity: 0.8, colorScheme: 'emerald-sage', shape: 2 },
      { id: 5, left: 24, size: 22, duration: 10.0, delay: -4.0, swayDuration: 3.1, swayDistance: 46, rotationDuration: 4.2, rotationDirection: 1, opacity: 0.92, colorScheme: 'soft-coral', shape: 0 },
      { id: 6, left: 29, size: 16, duration: 12.8, delay: -8.9, swayDuration: 4.0, swayDistance: -35, rotationDuration: 5.5, rotationDirection: -1, opacity: 0.82, colorScheme: 'vibrant-sakura', shape: 1 },
      { id: 7, left: 34, size: 25, duration: 8.5, delay: -0.8, swayDuration: 2.7, swayDistance: 55, rotationDuration: 3.6, rotationDirection: 1, opacity: 0.95, colorScheme: 'rose-blush', shape: 0 },
      { id: 8, left: 39, size: 19, duration: 11.0, delay: -6.5, swayDuration: 3.6, swayDistance: -44, rotationDuration: 4.8, rotationDirection: -1, opacity: 0.85, colorScheme: 'fresh-green', shape: 3 },
      { id: 9, left: 44, size: 23, duration: 9.8, delay: -2.8, swayDuration: 3.0, swayDistance: 48, rotationDuration: 4.0, rotationDirection: 1, opacity: 0.9, colorScheme: 'vibrant-sakura', shape: 2 },
      { id: 10, left: 49, size: 17, duration: 12.2, delay: -8.0, swayDuration: 3.9, swayDistance: -40, rotationDuration: 5.6, rotationDirection: -1, opacity: 0.8, colorScheme: 'emerald-sage', shape: 3 },
      { id: 11, left: 54, size: 24, duration: 9.0, delay: -1.9, swayDuration: 2.8, swayDistance: 52, rotationDuration: 3.7, rotationDirection: 1, opacity: 0.95, colorScheme: 'rose-blush', shape: 1 },
      { id: 12, left: 59, size: 20, duration: 10.8, delay: -5.2, swayDuration: 3.4, swayDistance: -45, rotationDuration: 4.6, rotationDirection: -1, opacity: 0.88, colorScheme: 'soft-coral', shape: 0 },
      { id: 13, left: 64, size: 16, duration: 13.0, delay: -9.8, swayDuration: 4.2, swayDistance: 38, rotationDuration: 6.0, rotationDirection: 1, opacity: 0.82, colorScheme: 'fresh-green', shape: 2 },
      { id: 14, left: 69, size: 22, duration: 10.2, delay: -4.6, swayDuration: 3.2, swayDistance: -50, rotationDuration: 4.4, rotationDirection: -1, opacity: 0.92, colorScheme: 'vibrant-sakura', shape: 1 },
      { id: 15, left: 74, size: 18, duration: 11.5, delay: -7.1, swayDuration: 3.7, swayDistance: 42, rotationDuration: 5.0, rotationDirection: 1, opacity: 0.85, colorScheme: 'rose-blush', shape: 0 },
      { id: 16, left: 79, size: 21, duration: 10.5, delay: -2.5, swayDuration: 3.3, swayDistance: -46, rotationDuration: 4.7, rotationDirection: -1, opacity: 0.88, colorScheme: 'emerald-sage', shape: 3 },
      { id: 17, left: 84, size: 25, duration: 8.7, delay: -10.2, swayDuration: 2.8, swayDistance: 54, rotationDuration: 3.9, rotationDirection: 1, opacity: 0.95, colorScheme: 'soft-coral', shape: 2 },
      { id: 18, left: 89, size: 17, duration: 12.4, delay: -0.4, swayDuration: 4.1, swayDistance: -36, rotationDuration: 5.4, rotationDirection: -1, opacity: 0.82, colorScheme: 'fresh-green', shape: 0 },
      { id: 19, left: 94, size: 23, duration: 9.4, delay: -11.0, swayDuration: 2.9, swayDistance: 48, rotationDuration: 4.1, rotationDirection: 1, opacity: 0.9, colorScheme: 'vibrant-sakura', shape: 1 },
      { id: 20, left: 6, size: 19, duration: 11.8, delay: -6.2, swayDuration: 3.6, swayDistance: -42, rotationDuration: 5.1, rotationDirection: -1, opacity: 0.85, colorScheme: 'rose-blush', shape: 3 },
      { id: 21, left: 16, size: 22, duration: 9.9, delay: -7.8, swayDuration: 3.1, swayDistance: 46, rotationDuration: 4.3, rotationDirection: 1, opacity: 0.9, colorScheme: 'emerald-sage', shape: 0 },
      { id: 22, left: 26, size: 26, duration: 8.9, delay: -12.1, swayDuration: 2.8, swayDistance: -55, rotationDuration: 3.8, rotationDirection: -1, opacity: 0.95, colorScheme: 'vibrant-sakura', shape: 1 },
      { id: 23, left: 36, size: 18, duration: 12.1, delay: -4.3, swayDuration: 3.8, swayDistance: 40, rotationDuration: 5.3, rotationDirection: 1, opacity: 0.85, colorScheme: 'fresh-green', shape: 2 },
      { id: 24, left: 46, size: 21, duration: 10.4, delay: -9.1, swayDuration: 3.3, swayDistance: -47, rotationDuration: 4.5, rotationDirection: -1, opacity: 0.88, colorScheme: 'soft-coral', shape: 0 },
      { id: 25, left: 56, size: 24, duration: 9.1, delay: -1.5, swayDuration: 2.9, swayDistance: 50, rotationDuration: 3.9, rotationDirection: 1, opacity: 0.94, colorScheme: 'rose-blush', shape: 1 },
      { id: 26, left: 66, size: 19, duration: 11.4, delay: -8.4, swayDuration: 3.7, swayDistance: -43, rotationDuration: 5.1, rotationDirection: -1, opacity: 0.85, colorScheme: 'fresh-green', shape: 3 },
      { id: 27, left: 76, size: 23, duration: 9.6, delay: -3.7, swayDuration: 3.0, swayDistance: 48, rotationDuration: 4.2, rotationDirection: 1, opacity: 0.92, colorScheme: 'vibrant-sakura', shape: 0 },
      { id: 28, left: 86, size: 17, duration: 12.6, delay: -10.5, swayDuration: 4.0, swayDistance: -38, rotationDuration: 5.7, rotationDirection: -1, opacity: 0.82, colorScheme: 'emerald-sage', shape: 2 },
      { id: 29, left: 96, size: 20, duration: 10.6, delay: -5.0, swayDuration: 3.4, swayDistance: 44, rotationDuration: 4.7, rotationDirection: 1, opacity: 0.88, colorScheme: 'soft-coral', shape: 1 },
      { id: 30, left: 11, size: 22, duration: 10.1, delay: -13.0, swayDuration: 3.2, swayDistance: -48, rotationDuration: 4.4, rotationDirection: -1, opacity: 0.9, colorScheme: 'vibrant-sakura', shape: 3 },
      { id: 31, left: 31, size: 18, duration: 11.6, delay: -2.1, swayDuration: 3.7, swayDistance: 41, rotationDuration: 5.2, rotationDirection: 1, opacity: 0.86, colorScheme: 'fresh-green', shape: 0 },
      { id: 32, left: 51, size: 25, duration: 8.6, delay: -6.9, swayDuration: 2.7, swayDistance: -53, rotationDuration: 3.6, rotationDirection: -1, opacity: 0.95, colorScheme: 'rose-blush', shape: 1 },
      { id: 33, left: 71, size: 19, duration: 11.1, delay: -11.5, swayDuration: 3.5, swayDistance: 43, rotationDuration: 4.9, rotationDirection: 1, opacity: 0.88, colorScheme: 'soft-coral', shape: 2 },
      { id: 34, left: 91, size: 22, duration: 9.7, delay: -7.0, swayDuration: 3.1, swayDistance: -47, rotationDuration: 4.3, rotationDirection: -1, opacity: 0.9, colorScheme: 'emerald-sage', shape: 0 },
      { id: 35, left: 21, size: 24, duration: 9.3, delay: -3.5, swayDuration: 2.9, swayDistance: 51, rotationDuration: 3.9, rotationDirection: 1, opacity: 0.93, colorScheme: 'vibrant-sakura', shape: 1 },
      { id: 36, left: 41, size: 17, duration: 12.3, delay: -12.4, swayDuration: 3.9, swayDistance: -39, rotationDuration: 5.5, rotationDirection: -1, opacity: 0.84, colorScheme: 'fresh-green', shape: 3 },
      { id: 37, left: 61, size: 23, duration: 9.8, delay: -0.6, swayDuration: 3.0, swayDistance: 49, rotationDuration: 4.1, rotationDirection: 1, opacity: 0.91, colorScheme: 'rose-blush', shape: 0 },
      { id: 38, left: 81, size: 18, duration: 11.7, delay: -8.6, swayDuration: 3.6, swayDistance: -42, rotationDuration: 5.1, rotationDirection: -1, opacity: 0.86, colorScheme: 'soft-coral', shape: 2 },
    ];
  }, []);

  const getPetalColors = (scheme: PetalConfig['colorScheme']) => {
    switch (scheme) {
      case 'vibrant-sakura':
        // Vibrant cherry blossom pink
        return { start: '#f43f5e', end: '#fb7185', glow: '#fda4af', vein: '#e11d48' };
      case 'rose-blush':
        // Rich rose blossom
        return { start: '#ec4899', end: '#f472b6', glow: '#fbcfe8', vein: '#db2777' };
      case 'soft-coral':
        // Warm peach coral blossom
        return { start: '#fb7185', end: '#fda4af', glow: '#ffe4e6', vein: '#f43f5e' };
      case 'fresh-green':
        // Fresh vivid spring leaf
        return { start: '#16a34a', end: '#4ade80', glow: '#86efac', vein: '#15803d' };
      case 'emerald-sage':
        // Rich botanical sage
        return { start: '#0d9488', end: '#2dd4bf', glow: '#99f6e4', vein: '#0f766e' };
    }
  };

  const renderPetalSvg = (shape: number, colors: ReturnType<typeof getPetalColors>, id: number) => {
    const gradId = `petal-grad-${id}`;
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full filter drop-shadow-[0_2px_4px_rgba(225,29,72,0.25)]"
      >
        <defs>
          <linearGradient id={gradId} x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor={colors.start} stopOpacity="0.95" />
            <stop offset="60%" stopColor={colors.end} stopOpacity="0.88" />
            <stop offset="100%" stopColor={colors.glow} stopOpacity="0.80" />
          </linearGradient>
        </defs>

        {shape === 0 && (
          // Classic curved blossom petal
          <g>
            <path
              d="M12 2C8 4.5 4 10 5 15.5C6 19.5 9 22 12 22C15 22 18 19.5 19 15.5C20 10 16 4.5 12 2Z"
              fill={`url(#${gradId})`}
            />
            {/* Center vein */}
            <path
              d="M12 5V18"
              stroke={colors.vein}
              strokeWidth="0.8"
              strokeOpacity="0.6"
              strokeLinecap="round"
            />
          </g>
        )}

        {shape === 1 && (
          // Sakura notched petal
          <g>
            <path
              d="M12 3.8C10.5 1.8 8 1.5 6 3C3.5 4.8 3 9.5 4.8 14.5C6.5 19 10.5 21.5 12 22C13.5 21.5 17.5 19 19.2 14.5C21 9.5 20.5 4.8 18 3C16 1.5 13.5 1.8 12 3.8Z"
              fill={`url(#${gradId})`}
            />
            <path
              d="M12 6V17.5"
              stroke={colors.vein}
              strokeWidth="0.8"
              strokeOpacity="0.6"
              strokeLinecap="round"
            />
            <path
              d="M12 11C10.2 9.5 8 9 8 9M12 13.5C13.8 12 16 11.5 16 11.5"
              stroke={colors.vein}
              strokeWidth="0.6"
              strokeOpacity="0.5"
              strokeLinecap="round"
            />
          </g>
        )}

        {shape === 2 && (
          // Asymmetric fluttering petal
          <g>
            <path
              d="M11 2C6.8 3.2 3 8 4 13.5C5 18 9 21.5 13.5 21C18 20.5 20.8 16 19.5 11.5C18.2 6.5 14.5 2.5 11 2Z"
              fill={`url(#${gradId})`}
            />
            <path
              d="M11.5 4.5C10 9.5 11 14.5 13.5 18.5"
              stroke={colors.vein}
              strokeWidth="0.8"
              strokeOpacity="0.6"
              strokeLinecap="round"
            />
          </g>
        )}

        {shape === 3 && (
          // Slender organic green leaf/petal
          <g>
            <path
              d="M12 2C8 5.5 5 10.5 6 15C7 19.2 10.5 21.8 12 22C13.5 21.8 17 19.2 18 15C19 10.5 16 5.5 12 2Z"
              fill={`url(#${gradId})`}
            />
            <path
              d="M12 4.5V18.5"
              stroke={colors.vein}
              strokeWidth="0.8"
              strokeOpacity="0.6"
              strokeLinecap="round"
            />
            <path
              d="M12 10C10.5 8.8 8.5 8.2 8.5 8.2M12 13.5C13.5 12.2 15.5 11.8 15.5 11.8"
              stroke={colors.vein}
              strokeWidth="0.6"
              strokeOpacity="0.5"
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>
    );
  };

  return (
    <>
      <style jsx global>{`
        @keyframes petalFall {
          0% {
            top: -40px;
            opacity: 0;
          }
          5% {
            opacity: var(--petal-opacity);
          }
          92% {
            opacity: var(--petal-opacity);
          }
          100% {
            top: 105vh;
            opacity: 0;
          }
        }

        @keyframes petalSway {
          0%, 100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(var(--sway-distance));
          }
        }

        @keyframes petalFlip {
          0% {
            transform: rotateZ(0deg) rotateY(0deg) rotateX(0deg);
          }
          50% {
            transform: rotateZ(calc(180deg * var(--rot-dir))) rotateY(65deg) rotateX(35deg);
          }
          100% {
            transform: rotateZ(calc(360deg * var(--rot-dir))) rotateY(0deg) rotateX(0deg);
          }
        }

        .blossom-petals-layer {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: none;
          overflow: hidden;
          z-index: 1;
        }

        .blossom-petal-item {
          position: absolute;
          will-change: top, transform, opacity;
          animation-name: petalFall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .blossom-petal-sway {
          width: 100%;
          height: 100%;
          will-change: transform;
          animation-name: petalSway;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        .blossom-petal-flip {
          width: 100%;
          height: 100%;
          will-change: transform;
          transform-style: preserve-3d;
          animation-name: petalFlip;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .blossom-petals-layer {
            display: none !important;
          }
        }
      `}</style>

      <div className="blossom-petals-layer" aria-hidden="true">
        {petals.map((petal) => {
          const colors = getPetalColors(petal.colorScheme);
          return (
            <div
              key={petal.id}
              className="blossom-petal-item"
              style={
                {
                  left: `${petal.left}%`,
                  width: `${petal.size}px`,
                  height: `${petal.size * 1.3}px`,
                  animationDuration: `${petal.duration}s`,
                  animationDelay: `${petal.delay}s`,
                  '--petal-opacity': petal.opacity,
                } as React.CSSProperties
              }
            >
              <div
                className="blossom-petal-sway"
                style={
                  {
                    animationDuration: `${petal.swayDuration}s`,
                    animationDelay: `${petal.delay * 0.5}s`,
                    '--sway-distance': `${petal.swayDistance}px`,
                  } as React.CSSProperties
                }
              >
                <div
                  className="blossom-petal-flip"
                  style={
                    {
                      animationDuration: `${petal.rotationDuration}s`,
                      animationDelay: `${petal.delay * 0.7}s`,
                      '--rot-dir': petal.rotationDirection,
                    } as React.CSSProperties
                  }
                >
                  {renderPetalSvg(petal.shape, colors, petal.id)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
