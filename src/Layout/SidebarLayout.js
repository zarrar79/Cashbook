import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, FileText, LogOut, Bell } from 'lucide-react';
import { useUser } from '../Context/userContext'; // Import the context hook

const tabs = [
  { name: 'Dashboard', path: '/dashboard', icon: <Home size={18} /> },
  { name: 'Payment', path: '/payment', icon: <FileText size={18} /> },
];

const SidebarLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [showToast, setShowToast] = useState(false);
  const [lastTransactionMessage, setLastTransactionMessage] = useState('');
  const [isNotifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Access user data from the context
  const { user, amount } = useUser();  // Get user name and amount from context

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md p-4">
        <h1 className="text-2xl font-bold mb-2">Welcome {user ? user.name : 'Guest'}</h1>

        {/* Balance Display */}
        <div className="text-gray-800 font-medium mb-4">
          Balance: <span className="text-green-600">PKR {amount.toFixed(2)}</span>
        </div>

        {/* Navigation Tabs */}
        <nav className="space-y-2">
          {tabs.map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex items-center p-2 rounded-lg transition-all ${
                location.pathname === tab.path
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-200'
              }`}
            >
              <span className="mr-2">{tab.icon}</span> {tab.name}
            </Link>
          ))}
        </nav>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center p-2 mt-4 rounded-lg w-full text-red-600 hover:bg-gray-200 transition-all"
        >
          <LogOut size={18} className="mr-2" /> Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {/* Top Right Notification Bell */}
        <div className="flex justify-end mb-4 relative">
          <button
            onClick={() => setNotifOpen(!isNotifOpen)}
            className="relative focus:outline-none"
          >
            <Bell size={24} className="text-gray-700 hover:text-blue-600" />
            {notifications?.length > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-white bg-red-600 rounded-full">
                {notifications.length}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-10 w-72 bg-white border border-gray-200 rounded shadow-lg z-10">
              <div className="p-3 font-semibold border-b bg-gray-100">
                Notifications
              </div>
              <ul className="max-h-60 overflow-auto">
                {notifications && notifications.length > 0 ? (
                  notifications
                    .slice()
                    .reverse()
                    .map((msg, idx) => (
                      <li key={idx} className="p-3 text-sm border-b last:border-b-0 hover:bg-gray-50">
                        {msg}
                      </li>
                    ))
                ) : (
                  <li className="p-3 text-gray-500 text-sm text-center">
                    Inbox is empty
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Toast Notification */}
        {showToast && lastTransactionMessage && (
          <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50">
            {lastTransactionMessage}
          </div>
        )}

        <Outlet />
      </main>
    </div>
  );
};

export default SidebarLayout;
