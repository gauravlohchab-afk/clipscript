import { ArrowRight, BookOpenText, Download, FileJson, Link2, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';

const STEPS = [
  {
    icon: Link2,
    title: 'Paste a Reel URL',
    text: 'Drop in any public Instagram Reel link. ClipScript validates it and fetches the available media and metadata: creator, duration, preview and download formats.',
  },
  {
    icon: Sparkles,
    title: 'Extract with AI',
    text: 'The video is prepared with FFmpeg and analyzed by a multimodal model that watches and listens: transcript, first-3-second hook, on-screen text, structure, retention patterns and CTA.',
  },
  {
    icon: FileJson,
    title: 'Export a clean dossier',
    text: 'Save the analysis to your Script Library, search it later, and export it as Markdown for docs or JSON for your own tools.',
  },
];

const DETAILS = [
  { icon: Download, title: 'Downloads where available', text: 'Only formats the source actually supports are offered (1080p, 720p, best available, MP3). Nothing is upscaled.' },
  { icon: BookOpenText, title: 'Structured, validated output', text: 'Every analysis follows one schema and is validated before it reaches you, so results are consistent and comparable.' },
  { icon: ShieldCheck, title: 'Public content only', text: 'ClipScript never logs in, bypasses private accounts or works around platform protections. Temporary media is deleted after processing.' },
];

export function HowItWorksPage() {
  return (
    <div className="space-y-20">
      <PageHeader
        eyebrow="How it works"
        title={
          <>
            From scroll-stopper to <span className="text-gradient">research dossier</span> in three steps
          </>
        }
        description="ClipScript is a research tool, not just a downloader. It turns a short-form video into structured insight you can learn from and reuse."
      />

      <ol className="grid gap-6 md:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, text }, index) => (
          <li key={title} className="surface animate-fade-up p-6 sm:p-7" style={{ animationDelay: `${index * 90}ms` }}>
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="size-[18px]" />
              </span>
              <span className="font-display text-sm font-bold text-subtle tabular-nums" aria-hidden>
                0{index + 1}
              </span>
            </div>
            <h2 className="mt-6 font-display text-lg font-bold tracking-tight text-fg">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
          </li>
        ))}
      </ol>

      <section>
        <h2 className="mb-8 font-display text-[28px] font-bold tracking-[-0.03em] text-fg sm:text-[32px]">What you get for every Reel</h2>
        <div className="grid gap-x-10 gap-y-10 md:grid-cols-3">
          {DETAILS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="border-t border-line pt-6">
              <Icon className="size-5 text-brand-600" />
              <h3 className="mt-4 font-display font-bold tracking-tight text-fg">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-brand-100 bg-[linear-gradient(135deg,var(--color-brand-50)_0%,#ffffff_50%,#f5f3ff_100%)] px-6 py-14 text-center shadow-soft sm:px-12 sm:py-16">
        <h2 className="font-display text-[28px] font-bold tracking-[-0.03em] text-fg sm:text-[36px]">Ready to study your first Reel?</h2>
        <p className="mx-auto mt-3 max-w-lg text-muted">Paste a link and get a full breakdown in under a minute.</p>
        <Link to="/" className="mt-8 inline-block">
          <Button size="lg" trailingIcon={<ArrowRight className="size-4" />}>
            Open the Downloader
          </Button>
        </Link>
      </section>
    </div>
  );
}
