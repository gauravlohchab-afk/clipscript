import { BookOpenText, Bookmark, Download, Sparkles, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Downloader', icon: Download },
  { to: '/library', label: 'Script Library', icon: BookOpenText },
  { to: '/saved', label: 'Saved Clips', icon: Bookmark },
  { to: '/how-it-works', label: 'How It Works', icon: Sparkles },
];
