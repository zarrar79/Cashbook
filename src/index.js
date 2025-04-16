import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// 🔽 Import the BalanceProvider
import { BalanceProvider } from './Context/BalanceContext'; // update path if needed

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* Wrap your entire app with the provider */}
    <BalanceProvider>
      <App />
    </BalanceProvider>
  </React.StrictMode>
);

// Optional: performance reporting
reportWebVitals();
