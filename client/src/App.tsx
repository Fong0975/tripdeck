import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import LoadingIndicator from '@/components/ui/LoadingIndicator';
import { ThemeProvider } from '@/context/ThemeContext.tsx';

const Home = lazy(() => import('@/pages/Home'));
const TripDetail = lazy(() => import('@/pages/TripDetail'));

function RouteFallback() {
  return (
    <div className='bg-background flex min-h-screen items-center justify-center'>
      <LoadingIndicator />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/trip/:id' element={<TripDetail />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}
