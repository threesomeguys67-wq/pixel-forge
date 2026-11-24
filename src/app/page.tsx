'use client';

// PixelForge entry. The editor engine creates HTMLCanvasElement buffers at
// module scope, so it is loaded client-side only via dynamic import.

import dynamic from 'next/dynamic';

const PixelForge = dynamic(
  () => import('@/components/pixel/PixelForge'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 bg-[#16171a] text-[#8b8d93]">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#3a3c42] bg-[#1e1f23]">
          <span className="inline-block h-5 w-5 animate-spin rounded-sm border-2 border-amber-400 border-t-transparent" />
        </div>
        <p className="font-mono text-xs tracking-widest uppercase">
          Loading PixelForge…
        </p>
      </div>
    ),
  }
);

export default function Home() {
  return <PixelForge />;
}
