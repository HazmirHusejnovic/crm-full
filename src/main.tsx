import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Simple test to verify rendering
const TestComponent = () => <h1>Test Render</h1>

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TestComponent /> {/* Try this first */}
    {/* <App /> */} {/* Then try this after TestComponent works */}
  </React.StrictMode>
)