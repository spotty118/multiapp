import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './lib/router.tsx'
import './index.css'

// Initialize app
const initialize = async () => {
  try {
    // Find root element
    const element = document.getElementById('root')
    if (!element) {
      throw new Error('Root element not found')
    }

    // Create and render app with router
    createRoot(element).render(
      <StrictMode>
        <RouterProvider 
          router={router}
        />
      </StrictMode>
    )
  } catch (error) {
    console.error('Failed to initialize app:', error)
    // Show error in the DOM even if React fails to load
    document.body.innerHTML = `
      <div style="
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        text-align: center;
        font-family: system-ui, -apple-system, sans-serif;
        background: linear-gradient(to bottom right, #EEF2FF, #F5F3FF);
      ">
        <div>
          <h1 style="color: #DC2626; font-size: 1.5rem; margin-bottom: 1rem;">
            Failed to Load Application
          </h1>
          <p style="color: #4B5563; margin-bottom: 1rem;">
            ${error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <button
            onclick="window.location.reload()"
            style="
              background: #6366F1;
              color: white;
              padding: 0.5rem 1rem;
              border-radius: 0.5rem;
              border: none;
              cursor: pointer;
            "
          >
            Retry
          </button>
        </div>
      </div>
    `
  }
}

// Start the app
initialize()