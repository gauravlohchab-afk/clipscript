import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { Logo } from './Logo';
import { NAV_ITEMS } from './navigation';

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  const [lastPath, setLastPath] = useState(pathname);

  // Close the mobile menu after navigating.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/80 bg-surface/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Main">
          <Logo />

          <ul className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'relative block rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-muted hover:bg-surface-2 hover:text-fg',
                    )
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="grid size-10 place-items-center rounded-xl border border-line bg-surface text-fg shadow-hairline md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </nav>
      </header>

      {/* Rendered outside <header>: its backdrop-filter would otherwise become the containing block for this fixed panel. */}
      <div
        id="mobile-nav"
        className={cn(
          'fixed inset-x-0 top-16 bottom-0 z-40 bg-surface transition-[opacity,visibility] duration-200 md:hidden',
          open ? 'visible opacity-100' : 'pointer-events-none invisible opacity-0',
        )}
      >
        <ul className="flex flex-col gap-1 p-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                tabIndex={open ? 0 : -1}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium',
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-muted hover:bg-surface-2 hover:text-fg',
                  )
                }
              >
                <Icon className="size-5" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
