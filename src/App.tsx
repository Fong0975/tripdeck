import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { ThemeProvider } from '@/context/ThemeContext.tsx';
import Home from '@/pages/Home';
import TripDetail from '@/pages/TripDetail';
import { seedFromFiles } from '@/utils/storage';

function AppRoutes() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedFromFiles()
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background'>
        <p className='animate-pulse text-sm text-muted-foreground'>載入中…</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/trip/:id' element={<TripDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppRoutes />
    </ThemeProvider>
  );
}
