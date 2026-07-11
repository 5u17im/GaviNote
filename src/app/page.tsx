'use client';

import dynamic from 'next/dynamic';

// Disable SSR for the Physics Canvas component to avoid hydration mismatches
// with screen size calculations and canvas initialization.
const PhysicsCanvas = dynamic(
  () => import('../components/canvas/PhysicsCanvas').then((mod) => mod.PhysicsCanvas),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="w-screen h-screen bg-[#0B0F19]">
      <PhysicsCanvas />
    </main>
  );
}
