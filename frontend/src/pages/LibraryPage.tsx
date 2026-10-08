import { BookOpenText, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipGrid } from '@/components/clips/ClipGrid';
import { LibraryToolbar, type LibraryFilters } from '@/components/clips/LibraryToolbar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { useClips } from '@/hooks/useClips';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const DEFAULT_FILTERS: LibraryFilters = { q: '', hookType: '', minScore: 0, sort: 'newest' };

export function LibraryPage() {
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_FILTERS);
  const q = useDebouncedValue(filters.q.trim(), 300);
  const { data, loading, error, refetch, removeLocal } = useClips({
    q: q || undefined,
    hookType: filters.hookType || undefined,
    minScore: filters.minScore || undefined,
    sort: filters.sort,
    limit: 100,
  });

  const isFiltered = Boolean(q || filters.hookType || filters.minScore);
  const analyzeButton = (
    <Link to="/">
      <Button icon={<Plus className="size-4" />}>Analyze a Reel</Button>
    </Link>
  );

  return (
    <div>
      <PageHeader
        eyebrow="Script Library"
        title="Your research library"
        description="Every Reel you have analyzed and saved: scripts, hooks, structures and scores, searchable in one place."
        actions={analyzeButton}
      />
      <LibraryToolbar filters={filters} hookTypes={data?.facets.hookTypes ?? []} onChange={setFilters} total={data?.total ?? null} />
      <ClipGrid
        clips={data?.items ?? []}
        loading={loading}
        error={error}
        onRetry={refetch}
        onChanged={(change) => (change.type === 'deleted' ? removeLocal(change.id) : refetch())}
        empty={
          isFiltered ? (
            <EmptyState
              icon={<BookOpenText className="size-7" />}
              title="No matches"
              description="No saved clips match these filters. Try a different search term or clear the filters."
              action={
                <Button variant="secondary" onClick={() => setFilters(DEFAULT_FILTERS)}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<BookOpenText className="size-7" />}
              title="Your library is empty."
              description="Analyze a Reel and save it. Its script, hook, structure and scores will appear here, ready to search."
              action={analyzeButton}
            />
          )
        }
      />
    </div>
  );
}
