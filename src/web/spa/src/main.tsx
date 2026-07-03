import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ImpersonationProvider } from '@/shell/ImpersonationContext';
import { AuthProvider } from '@/shell/AuthContext';
import { AppLayout } from '@/shell/AppLayout';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ImpersonationProvider>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </ImpersonationProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
