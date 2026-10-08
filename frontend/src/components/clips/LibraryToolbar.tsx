import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { ClipSort } from '@/types/clip';

export interface LibraryFilters {
  q: string;
  hookType: string;
  minScore: number;
  sort: ClipSort;
}

interface LibraryToolbarProps {
  filters: LibraryFilters;
  hookTypes: string[];
  onChange: (filters: LibraryFilters) => void;
  total: number | null;
}

const SORT_OPTIONS: Array<{ value: ClipSort; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'overall', label: 'Highest overall score' },
  { value: 'hook', label: 'Strongest hook' },
  { value: 'duration', label: 'Longest' },
];

const SCORE_OPTIONS = [0, 50, 70, 85];

const selectClass =
  'h-11 w-full min-w-0 appearance-none rounded-xl border border-line bg-surface px-3.5 pr-8 text-sm text-fg shadow-hairline outline-none transition-[border-color,box-shadow] hover:border-line-strong focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10';

export function LibraryToolbar({ filters, hookTypes, onChange, total }: LibraryToolbarProps) {
  const set = <K extends keyof LibraryFilters>(key: K, value: LibraryFilters[K]) => onChange({ ...filters, [key]: value });
  const hasFilters = filters.q || filters.hookType || filters.minScore > 0;

  return (
    <div className="mb-8 space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <input
            type="search"
            value={filters.q}
            onChange={(event) => set('q', event.target.value)}
            placeholder="Search titles, creators, hooks and transcripts…"
            aria-label="Search the library"
            className="h-11 w-full rounded-xl border border-line bg-surface pr-3 pl-10 text-sm text-fg shadow-hairline outline-none transition-[border-color,box-shadow] placeholder:text-subtle hover:border-line-strong focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[34rem]">
          <label className="relative">
            <span className="sr-only">Filter by hook type</span>
            <select value={filters.hookType} onChange={(event) => set('hookType', event.target.value)} className={selectClass}>
              <option value="">All hook types</option>
              {hookTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <SlidersHorizontal className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-subtle" aria-hidden />
          </label>
          <label className="relative">
            <span className="sr-only">Minimum overall score</span>
            <select value={filters.minScore} onChange={(event) => set('minScore', Number(event.target.value))} className={selectClass}>
              {SCORE_OPTIONS.map((score) => (
                <option key={score} value={score}>
                  {score === 0 ? 'Any score' : `Score ${score}+`}
                </option>
              ))}
            </select>
          </label>
          <label className="relative">
            <span className="sr-only">Sort</span>
            <select value={filters.sort} onChange={(event) => set('sort', event.target.value as ClipSort)} className={selectClass}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="flex min-h-6 items-center justify-between text-xs text-subtle">
        <span>{total === null ? '' : `${total} ${total === 1 ? 'clip' : 'clips'}`}</span>
        {hasFilters && (
          <button type="button" onClick={() => onChange({ ...filters, q: '', hookType: '', minScore: 0 })} className="inline-flex items-center gap-1 text-muted hover:text-fg">
            <X className="size-3.5" /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
