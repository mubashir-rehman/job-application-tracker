import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import App from './App.tsx';
import PrivacyPolicy from './pages/PrivacyPolicy.tsx';
import OAuthConsent from './pages/OAuthConsent.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* reducedMotion="user" makes all framer-motion animations honor the OS
        prefers-reduced-motion setting (the CSS @media block only covers
        CSS-driven animation/transition). */}
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/oauth/consent" element={<OAuthConsent />} />
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  </StrictMode>,
);
