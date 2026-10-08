import { Link } from 'react-router-dom';

export function Logo() {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="ClipScript home">
      <span className="bg-brand-gradient grid size-8 place-items-center rounded-[10px] shadow-cta transition-transform group-hover:scale-105">
        <svg viewBox="0 0 24 24" className="size-3.5 fill-white" aria-hidden>
          <path d="M8 5.5v13l10.5-6.5z" />
        </svg>
      </span>
      <span className="font-display text-[17px] font-bold tracking-tight text-fg">ClipScript</span>
    </Link>
  );
}
