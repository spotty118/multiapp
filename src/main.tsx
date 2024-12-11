import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './lib/router';
import './index.css';

const element = document.getElementById('root');
if (!element) {
  throw new Error('Root element not found');
}

createRoot(element).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
