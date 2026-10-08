import { Outlet, ScrollRestoration } from 'react-router-dom';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';

export function AppLayout() {
  return (
    <div className="app-backdrop flex min-h-dvh flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </div>
  );
}
