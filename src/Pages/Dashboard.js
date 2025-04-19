import React, { useEffect, useState } from 'react';
import { useUser } from '../Context/userContext';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const { 
    setUserData, 
    email, 
    setTransactionRecipient,
    user,
    transactions
  } = useUser();
  
  const [period, setPeriod] = useState('today');
  const [allTransactions, setAllTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Format transaction data for display
  const formatTransactions = (txList) => {
    return txList.map(tx => ({
      ...tx,
      amount: parseFloat(tx.amount),
      timestamp: new Date(tx.timeStamp),
      recipientName: tx.name, // Name of the recipient from transaction
      isEditable: tx.type === 'Sent' // Only sent transactions can be edited
    }));
  };

  useEffect(() => {
    setTransactionRecipient({});
    if (email) {
      setIsLoading(true);
      fetch('http://localhost:3001/getUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email }),
      })
        .then(res => res.json())
        .then(data => {
          console.log(data,'---->useEffect');
          if (data) {
            setUserData(data);
            
            // Process transactions with format function
            const formatted = formatTransactions(data.transactions?.list || []);
            setAllTransactions(formatted);
          }
        })
        .catch(err => console.error('Error fetching user:', err))
        .finally(() => setIsLoading(false));
    }
  }, []);

  // Filter transactions based on selected period
  const filterTransactions = (period) => {
    const today = new Date();
    return allTransactions.filter(tx => {
      const txDate = tx.timestamp;
      switch (period) {
        case 'today':
          return txDate.toDateString() === today.toDateString();
        case 'month':
          return (
            txDate.getMonth() === today.getMonth() &&
            txDate.getFullYear() === today.getFullYear()
          );
        default:
          return true;
      }
    });
  };

  // Handle row click for sent transactions
  const handleRowClick = (transaction) => {
    console.log(transaction,'handleRow');
    if (transaction.type === 'Sent') {
      setTransactionRecipient({
        id: transaction.receiver_id,
        name: transaction.recipientName,
        tId : transaction.id
      });
      navigate('/payment');
    }
  };

  // Export filtered transactions to Excel
  const handleExport = () => {
    const filtered = filterTransactions(period);
    if (filtered.length === 0) {
      alert('No transactions for selected period.');
      return;
    }

    const exportData = filtered.map(tx => ({
      'Type': tx.type,
      'Recipient': tx.recipientName,
      'Amount': `₹${tx.amount.toFixed(2)}`,
      'Date': tx.timestamp.toLocaleString(),
      'Transaction ID': tx.id,
      'Edit Count': tx.edits?.length || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    XLSX.writeFile(workbook, `transactions-${period}.xlsx`);
  };

  if (isLoading) {
    return <div className="p-6">Loading transactions...</div>;
  }

  return (
    <div className="p-6">
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
              period === timePeriod 
                ? `bg-${timePeriod === 'today' ? 'blue' : timePeriod === 'month' ? 'green' : 'purple'}-600` 
                : `bg-${timePeriod === 'today' ? 'blue' : timePeriod === 'month' ? 'green' : 'purple'}-400`
            } text-white hover:bg-${timePeriod === 'today' ? 'blue' : timePeriod === 'month' ? 'green' : 'purple'}-700`}
          >
            {timePeriod === 'all' ? 'All Transactions' : `This ${timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)}`}
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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Type', 'Recipient', 'Amount', 'Date', 'Status'].map(header => (
                  <th 
                    key={header} 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {user?.transactions?.list?.length > 0 ? (
                user.transactions.list.map((transaction) => (
                  <tr 
                    key={transaction.id} 
                    onClick={() => handleRowClick(transaction)}
                    className={`${transaction.type === 'Sent' ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${transaction.type === 'Sent' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {transaction.type || 'Transaction'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transaction.name || transaction.recipientName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    PKR{Number(transaction.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.timeStamp ? 
                        new Date(transaction.timeStamp).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                        {console.log(
                         transaction.edits,'----->eidts')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {transaction.edits?.length > 0 ? (
                        <div className="space-y-1">
                          {transaction.edits.map((edit, index) => (
                            <div key={index} className="flex items-center text-xs">
                              <span className="font-medium mr-1">Edit {index + 1}:</span>
                              <span className="text-gray-600 mr-2">PKR{Number(edit.newAmount).toFixed(2)}</span>
                              <span className="text-gray-400">
                                {edit.timeStamp ? new Date(edit.timeStamp).toLocaleTimeString() : 'N/A'}
                                {console.log(edit,'----->amount')
                          }
                                
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No edits</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};