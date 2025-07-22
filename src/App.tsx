import React from 'react';

export default function App() {
  return (
    <div className="app">
      <h1>Welcome to My React App</h1>
      <p>Start building your application here.</p>
      <button 
        onClick={() => alert('Button clicked!')}
        style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
      >
        Click Me
      </button>
    </div>
  );
}