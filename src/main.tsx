import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { OnboardingPage } from './pages/OnboardingPage.tsx'
import { ClientDetailPage } from './pages/ClientDetailPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<App />} />
        <Route path="/clients/new" element={<OnboardingPage />} />
        <Route path="/clients/:id" element={<ClientDetailPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
