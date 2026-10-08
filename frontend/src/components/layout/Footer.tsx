export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} ClipScript · Turn viral Reels into actionable content intelligence.</p>
        <p className="max-w-md sm:text-right">
          Analyze only public content. You are responsible for having the rights to download or reuse any media.
        </p>
      </div>
    </footer>
  );
}
