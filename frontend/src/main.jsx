import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Chat from './pages/Chat.jsx'
import Dashboard from './pages/Dashboard.jsx'

const router = createBrowserRouter([
  { path: '/', element: <Chat /> },
  { path: '/dashboard', element: <Dashboard /> },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
