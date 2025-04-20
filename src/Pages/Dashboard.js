import React, { useEffect, useState } from 'react';
import { useUser } from '../Context/userContext';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const { setUserData, email, setTransactionRecipient, user } = useUser();
  const [period, setPeriod] = useState('today');
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [currentNotification, setCurrentNotification] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('http://localhost:3001/getUser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await response.json();
        
        setUserData(data);
        setTransactions(data.transactions?.list || []);

        // Process notifications
        const notifs = [];
        if (data.notifications) {
          // Add new transaction notifications
          data.notifications.newTransactions?.forEach(tx => {
            notifs.push({
              type: 'new',
              title: 'New Transaction',
              message: `${tx.type} PKR${tx.amount.toFixed(2)} ${tx.type === 'Sent' ? 'to' : 'from'} ${tx.name}`,
              timestamp: tx.timeStamp
            });
          });

          // Add edit notifications
          data.notifications.editNotifications?.forEach(tx => {
            notifs.push({
              type: 'edit',
              title: 'Transaction Updated',
              message: `Amount changed from PKR${tx.editData.oldAmount.toFixed(2)} to PKR${tx.editData.newAmount.toFixed(2)}`,
              timestamp: tx.editData.timeStamp
            });
          });
        }

        setNotifications(notifs);
        if (notifs.length > 0) {
          setCurrentNotification(notifs[0]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (email) {
      fetchUserData();
    }
  }, []);

  const handleNotificationClose = () => {
    const remaining = notifications.slice(1);
    setNotifications(remaining);
    setCurrentNotification(remaining[0] || null);
  };

  const filterTransactions = (period) => {
    const today = new Date();
    return transactions.filter(tx => {
      const txDate = new Date(tx.timeStamp);
      switch (period) {
        case 'today': return txDate.toDateString() === today.toDateString();
        case 'month': return txDate.getMonth() === today.getMonth() && txDate.getFullYear() === today.getFullYear();
        default: return true;
      }
    });
  };

  const handleRowClick = (transaction) => {
    if (transaction.type === 'Sent') {
      setTransactionRecipient({
        id: transaction.receiver_id,
        name: transaction.name,
        tId: transaction.id
      });
      navigate('/payment');
    }
  };

  const handleExport = () => {
    const data = filterTransactions(period).map(tx => ({
      Type: tx.type,
      Recipient: tx.name,
      Amount: `PKR${tx.amount.toFixed(2)}`,
      Date: new Date(tx.timeStamp).toLocaleString(),
      'Transaction ID': tx.id,
      'Edit Count': tx.editCount || 0
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, `transactions-${period}.xlsx`);
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      {/* Notification Popup */}
      {currentNotification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md p-4 rounded-lg shadow-lg border mx-4 ${
          currentNotification.type === 'new' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex justify-between items-center mb-2">
            <h3 className={`font-bold text-lg ${
              currentNotification.type === 'new' ? 'text-green-800' : 'text-blue-800'
            }`}>
              {currentNotification.title}
            </h3>
            <button onClick={handleNotificationClose} className="text-gray-500 hover:text-gray-700">
              ×
            </button>
          </div>
          <div className="mb-4">
            <p className="text-gray-800">{currentNotification.message}</p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(currentNotification.timestamp).toLocaleString()}
            </p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleNotificationClose}
              className={`px-3 py-1 rounded text-white ${
                currentNotification.type === 'new' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {notifications.length > 1 ? 'Next' : 'Close'}
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Transaction History</h1>
        <div className="text-lg font-semibold">
          Balance: PKR{(user?.amount || 0).toFixed(2)}
        </div>
      </div>

      <div className="mb-6 flex gap-4">
        {['today', 'month', 'all'].map(timePeriod => (
          <button
            key={timePeriod}
            onClick={() => setPeriod(timePeriod)}
            className={`py-2 px-4 rounded-md capitalize ${
              period === timePeriod ? 'bg-blue-600' : 'bg-blue-400'
            } text-white hover:bg-blue-700`}
          >
            {timePeriod === 'all' ? 'All Transactions' : `This ${timePeriod}`}
          </button>
        ))}
        <button
          onClick={handleExport}
          className="ml-auto py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Export to Excel
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Type', 'Recipient', 'Amount', 'Date', 'Edits'].map(header => (
                <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filterTransactions(period).length > 0 ? (
              filterTransactions(period).map(tx => (
                <tr 
                  key={tx.id} 
                  onClick={() => handleRowClick(tx)}
                  className={`${tx.type === 'Sent' ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      tx.type === 'Sent' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {tx.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    PKR{Number(tx.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(tx.timeStamp).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
  {tx.edits?.length ? (
    <div className="space-y-1">
      <div>{tx.edits.length} edits</div>
      {tx.edits.map((edit, index) => (
        <div key={index} className="text-xs text-gray-400">
          #{index + 1}: {edit.newAmount} at {new Date(edit.timeStamp).toLocaleString()}
        </div>
      ))}
    </div>
  ) : (
    0
  )}
</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center">No transactions found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};