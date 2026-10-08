import { Bookmark, BookmarkCheck, Copy, ExternalLink, FileJson, FileText, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useClipActions } from '@/hooks/useClipActions';
import { useClipboard } from '@/hooks/useClipboard';
import type { AnalysisDossier, Clip } from '@/types/clip';
import { transcriptToText } from '@/utils/transcript';

interface AnalysisActionsProps {
  dossier: AnalysisDossier;
  /** Returns the library clip for this analysis, saving it first if needed. */
  ensureClip: () => Promise<Clip | null>;
  onClipChange: (clip: Clip) => void;
  onDeleted?: () => void;
  showOpen?: boolean;
}

/** Save · Remove · Delete · Open · Copy transcript/analysis · Download Markdown/JSON. */
export function AnalysisActions({ dossier, ensureClip, onClipChange, onDeleted, showOpen = false }: AnalysisActionsProps) {
  const actions = useClipActions();
  const copy = useClipboard();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [preparing, setPreparing] = useState<'markdown' | 'json' | 'copy' | null>(null);
  const busy = actions.pending !== null || preparing !== null;

  const withClipId = async (kind: 'markdown' | 'json' | 'copy', task: (id: string) => Promise<unknown>) => {
    setPreparing(kind);
    try {
      const id = dossier.clipId ?? (await ensureClip())?.id;
      if (id) await task(id);
    } finally {
      setPreparing(null);
    }
  };

  const toggleSaved = async () => {
    if (!dossier.clipId) {
      await ensureClip();
      return;
    }
    const clip = await actions.setSaved(dossier.clipId, !dossier.isSaved);
    if (clip) onClipChange(clip);
  };

  const handleDelete = async () => {
    if (!dossier.clipId) return;
    const ok = await actions.remove(dossier.clipId);
    setConfirmDelete(false);
    if (ok) onDeleted?.();
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 shadow-hairline sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={dossier.isSaved ? 'outline' : 'primary'}
          size="sm"
          onClick={toggleSaved}
          loading={actions.pending === 'save' || actions.pending === 'toggle'}
          loadingText="Saving clip…"
          disabled={busy}
          icon={dossier.isSaved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
          title={dossier.isSaved ? 'Remove from Saved Clips (stays in your library)' : 'Save clip'}
        >
          {dossier.isSaved ? 'Saved · Remove' : 'Save Clip'}
        </Button>
        {showOpen && dossier.clipId && (
          <Link to={`/clips/${dossier.clipId}`}>
            <Button variant="secondary" size="sm" icon={<ExternalLink className="size-4" />}>
              Open
            </Button>
          </Link>
        )}
        {dossier.clipId && (
          <Button variant="ghost" size="sm" disabled={busy} icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Button
          variant="secondary"
          size="sm"
          disabled={busy || dossier.analysis.transcript.length === 0}
          icon={<Copy className="size-4" />}
          onClick={() => copy(transcriptToText(dossier.analysis.transcript), 'Transcript copied')}
        >
          Copy Transcript
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          loading={preparing === 'copy'}
          loadingText="Copying…"
          icon={<Copy className="size-4" />}
          onClick={() =>
            withClipId('copy', async (id) => {
              const markdown = await actions.markdown(id);
              if (markdown) await copy(markdown, 'Analysis copied as Markdown');
            })
          }
        >
          Copy Analysis
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          loading={preparing === 'markdown'}
          loadingText="Exporting…"
          icon={<FileText className="size-4" />}
          onClick={() => withClipId('markdown', (id) => actions.download(id, 'markdown'))}
        >
          Markdown
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          loading={preparing === 'json'}
          loadingText="Exporting…"
          icon={<FileJson className="size-4" />}
          onClick={() => withClipId('json', (id) => actions.download(id, 'json'))}
        >
          JSON
        </Button>
      </div>

      {!dossier.clipId && (
        <p className="w-full px-1 text-[11px] text-subtle">Exports save this analysis to your library first.</p>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this clip?"
        description="The analysis will be permanently removed from your Script Library. This cannot be undone."
        loading={actions.pending === 'delete'}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
