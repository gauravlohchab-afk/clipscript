import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { DownloaderPage } from '@/pages/DownloaderPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// The Downloader is the landing page and ships in the main bundle; other pages load on demand.
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <DownloaderPage /> },
      { path: '/library', lazy: async () => ({ Component: (await import('@/pages/LibraryPage')).LibraryPage }) },
      { path: '/saved', lazy: async () => ({ Component: (await import('@/pages/SavedClipsPage')).SavedClipsPage }) },
      { path: '/clips/:id', lazy: async () => ({ Component: (await import('@/pages/ClipAnalysisPage')).ClipAnalysisPage }) },
      { path: '/how-it-works', lazy: async () => ({ Component: (await import('@/pages/HowItWorksPage')).HowItWorksPage }) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
