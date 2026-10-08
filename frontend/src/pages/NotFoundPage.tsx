import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export function NotFoundPage() {
  return (
    <EmptyState
      icon={<Compass className="size-7" />}
      title="Page not found"
      description="The page you are looking for does not exist or has moved."
      action={
        <Link to="/">
          <Button>Back to the Downloader</Button>
        </Link>
      }
    />
  );
}
