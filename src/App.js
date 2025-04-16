// App.js
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Dashboard } from './Pages/Dashboard';
import { PaymentForm } from './Pages/PaymentForm';
import AuthForm from './Pages/AuthForm';
import SidebarLayout from './Layout/SidebarLayout';
import { BalanceProvider } from './Context/BalanceContext';

function App() {
  return (
    <BalanceProvider>
      <Router>
        <Routes>
          {/* Home page shows the AuthForm */}
          <Route path="/" element={<AuthForm />} />

          {/* Auth page (optional if different from home) */}
          <Route path="/auth" element={<AuthForm />} />

          {/* All routes that need sidebar layout */}
          <Route path="/" element={<SidebarLayout />}>
            {/* Add an Outlet here so nested routes can render */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="payment" element={<PaymentForm />} />
          </Route>
        </Routes>
      </Router>
    </BalanceProvider>
  );
}

export default App;
