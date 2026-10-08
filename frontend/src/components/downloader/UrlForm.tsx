import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, ClipboardPaste, Link2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { reelFormSchema, type ReelFormValues } from '@/utils/reelUrl';

interface UrlFormProps {
  initialUrl?: string;
  busy: boolean;
  busyLabel?: string;
  onSubmit: (url: string) => void;
  /** When set, fills the input and submits (used by the sample links). */
  externalUrl?: { url: string; nonce: number } | null;
}

export function UrlForm({ initialUrl = '', busy, busyLabel, onSubmit, externalUrl }: UrlFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<ReelFormValues>({ resolver: zodResolver(reelFormSchema), defaultValues: { url: initialUrl }, mode: 'onSubmit' });

  const submit = handleSubmit(({ url }) => onSubmit(url));

  useEffect(() => {
    if (!externalUrl) return;
    setValue('url', externalUrl.url, { shouldValidate: false });
    void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to new sample selections
  }, [externalUrl]);

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setValue('url', text.trim(), { shouldValidate: true });
        setFocus('url');
      }
    } catch {
      setFocus('url');
    }
  };

  const error = errors.url?.message;

  return (
    <form onSubmit={submit} noValidate className="w-full">
      <div
        className={cn(
          'group relative flex flex-col gap-2 rounded-[20px] border bg-surface p-2 shadow-soft transition-[border-color,box-shadow] duration-200 sm:flex-row sm:items-center',
          error
            ? 'border-red-300 ring-4 ring-red-500/10'
            : 'border-line focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-500/10',
        )}
      >
        <label htmlFor="reel-url" className="sr-only">
          Instagram Reel URL
        </label>
        <div className="flex min-w-0 flex-1 items-center">
          <Link2 className="ml-3 size-5 shrink-0 text-subtle" aria-hidden />
          <input
            id="reel-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="Paste Instagram Reel URL"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'reel-url-error' : undefined}
            className="h-13 w-full min-w-0 bg-transparent px-3 text-base text-fg outline-none placeholder:text-subtle"
            {...register('url')}
          />
          <button
            type="button"
            onClick={paste}
            className="mr-1 hidden h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg sm:inline-flex"
          >
            <ClipboardPaste className="size-4" /> Paste
          </button>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="lg" onClick={paste} className="flex-1 sm:hidden" icon={<ClipboardPaste className="size-4" />}>
            Paste
          </Button>
          <Button
            type="submit"
            size="lg"
            loading={busy}
            loadingText={busyLabel ?? 'Fetching…'}
            trailingIcon={<ArrowRight className="size-4" />}
            className="flex-[2] sm:flex-none"
          >
            Fetch Reel
          </Button>
        </div>
      </div>
      {error && (
        <p id="reel-url-error" role="alert" className="mt-3 pl-2 text-left text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
