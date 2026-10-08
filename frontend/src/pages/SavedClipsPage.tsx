import { Bookmark, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ClipGrid } from '@/components/clips/ClipGrid';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { useClips } from '@/hooks/useClips';

export function SavedClipsPage() {
  const { data, loading, error, refetch, removeLocal } = useClips({ saved: true, sort: 'newest', limit: 100 });

  return (
    <div>
      <PageHeader
        eyebrow="Saved Clips"
        title="Saved clips"
        description="Your shortlist of Reels to revisit. Removing a clip here keeps its analysis in the Script Library."
        actions={
          <Link to="/library">
            <Button variant="secondary">Open Script Library</Button>
          </Link>
        }
      />
      <ClipGrid
        clips={data?.items ?? []}
        loading={loading}
        error={error}
        onRetry={refetch}
        savedLabel="Remove"
        onChanged={(change) => {
          if (change.type === 'deleted') removeLocal(change.id);
          else if (!change.clip.isSaved) removeLocal(change.clip.id);
        }}
        empty={
          <EmptyState
            icon={<Bookmark className="size-7" />}
            title="No saved clips yet."
            description="Analyze your first Reel to start building your content research library."
            action={
              <Link to="/">
                <Button icon={<Plus className="size-4" />}>Analyze a Reel</Button>
              </Link>
            }
          />
        }
      />
    </div>
  );
}
