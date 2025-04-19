import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// 🔽 Import the BalanceProvider and UserProvider
import { UserProvider } from './Context/userContext'; // import your UserContext here

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* Wrap your entire app with both providers */}
      <UserProvider> {/* Wrap with UserProvider */}
        <App />
      </UserProvider>
  </React.StrictMode>
);

// Optional: performance reporting
reportWebVitals();
