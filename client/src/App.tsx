import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { ThemeProvider } from '@/context/ThemeContext.tsx';
import Home from '@/pages/Home';
import TripDetail from '@/pages/TripDetail';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/trip/:id' element={<TripDetail />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
