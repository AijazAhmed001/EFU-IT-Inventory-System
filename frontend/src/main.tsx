import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import AppErrorBoundary from './components/feedback/AppErrorBoundary'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary><App /></AppErrorBoundary>
  </React.StrictMode>,
)
