import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // This should be in the same directory as main.tsx
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);