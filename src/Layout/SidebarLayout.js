import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, FileText, LogOut, Bell, Plus, X } from 'lucide-react';
import { useUser } from '../Context/userContext';

const tabs = [
  { name: 'Dashboard', path: '/dashboard', icon: <Home size={18} /> },
  { name: 'Payment', path: '/payment', icon: <FileText size={18} /> },
];

const SidebarLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, amount, setUserData } = useUser();

  const [showToast, setShowToast] = useState(false);
  const [lastTransactionMessage, setLastTransactionMessage] = useState('');
  const [isNotifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showAddFundsPopup, setShowAddFundsPopup] = useState(false);
  const [fundsAmount, setFundsAmount] = useState();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleAddFunds = async () => {
    if (!fundsAmount || isNaN(fundsAmount) || parseFloat(fundsAmount) <= 0) {
      setLastTransactionMessage('Please enter a valid amount');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }
  
    setIsLoading(true);
    try {
    //   const token = localStorage.getItem('token');
    //   if (!token) {
    //     throw new Error('Not authenticated');
    //   }
  
      const response = await fetch('http://localhost:3001/addFunds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        //   'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: user.email,
          amount: parseFloat(fundsAmount)
        })
      });
  
      const data = await response.json();
      console.log('Add funds response:', data); // Add this line
  
      if (!response.ok){
        throw new Error(data.message || 'Failed to add funds');
      }
      setLastTransactionMessage(`Successfully added PKR ${parseFloat(fundsAmount).toFixed(2)}`);
      setShowToast(true);
      setShowAddFundsPopup(false);
      setFundsAmount('');
    } catch (error) {
      console.error('Add funds error:', error); // Add this line
      setLastTransactionMessage(error.message);
      setShowToast(true);
    } finally {
      setIsLoading(false);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md p-4">
        <h1 className="text-2xl font-bold mb-2">Welcome {user ? user.name : 'Guest'}</h1>

        {/* Balance Display with Add Funds Button */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-gray-800 font-medium">
            Balance: <span className="text-green-600">PKR {amount.toFixed(2)}</span>
          </div>
          <button
            onClick={() => setShowAddFundsPopup(true)}
            className="p-1.5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
            title="Add Funds"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Add Funds Popup */}
        {showAddFundsPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-80">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Add Funds</h3>
                <button 
                  onClick={() => {
                    setShowAddFundsPopup(false);
                    setFundsAmount('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount to Add (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fundsAmount}
                  onChange={(e) => setFundsAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount"
                />
              </div>
              
              <button
                onClick={handleAddFunds}
                disabled={isLoading}
                className={`w-full py-2 px-4 rounded-md text-white ${isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} transition-colors`}
              >
                {isLoading ? 'Processing...' : 'Add Funds'}
              </button>
            </div>
          </div>
        )}

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
        {showToast && (
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