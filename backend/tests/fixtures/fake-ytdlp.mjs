// A stand-in for the yt-dlp executable, run through node by the YtdlpClient tests.
// Behaviour is chosen by the URL (the argument after `--`) so tests never touch the network.
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const url = args[args.indexOf('--') + 1] ?? '';
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

if (args.includes('--version')) {
  process.stdout.write('2026.08.19\n');
  process.exit(0);
}
if (url.includes('private')) {
  process.stderr.write('ERROR: [Instagram] private1: Instagram sent an empty media response. Check if this post is accessible in your browser without being logged-in.\n');
  process.exit(1);
}
if (url.includes('slow')) {
  setTimeout(() => process.exit(0), 30_000);
} else if (args.includes('--dump-single-json')) {
  process.stdout.write(JSON.stringify({ _type: 'video', id: 'fake', formats: [], args }));
} else {
  const dir = option('-P');
  if (url.includes('nomerge')) {
    // What yt-dlp does when FFmpeg is missing: separate parts, no merged file, exit 0.
    writeFileSync(path.join(dir, 'media.fdash-1v.mp4'), 'v');
    writeFileSync(path.join(dir, 'media.fdash-2a.m4a'), 'a');
  } else if (!url.includes('toolarge')) {
    writeFileSync(path.join(dir, 'media.mp4'), JSON.stringify(args));
  } else {
    process.stdout.write('[download] File is larger than max-filesize (999 bytes > 10 bytes). Aborting.\n');
  }
}
