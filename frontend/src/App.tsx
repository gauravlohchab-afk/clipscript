import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from '@/components/ui/Toaster';
import { router } from '@/routes/router';

export default function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}
