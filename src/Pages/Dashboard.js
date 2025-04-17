import React, { useEffect, useState } from 'react';
import { useBalance } from '../Context/BalanceContext'; // Import the custom hook
import * as XLSX from 'xlsx';
import { io } from 'socket.io-client';

export const Dashboard = () => {
  const [sentTransactions, setSentTransactions] = useState([]);
  const [receivedTransactions, setReceivedTransactions] = useState([]);
  const [period, setPeriod] = useState('today'); // Track selected period (today or month)
  const { balance, updateBalance } = useBalance(); // Access balance and update function
  const token = localStorage.getItem('token');
  const socket = io('http://localhost:3001')

  useEffect(() => {
    fetch('http://localhost:3001/auth/profile/transactions', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then((response) => response.json())
      .then((data) => {
        const { sent, received } = data.transactions || {};
        setSentTransactions(sent || []);
        setReceivedTransactions(received || []);
      })
      .catch((error) => console.error('Error:', error));
  }, [token]);

  // Combine both sent and received transactions
  const transactions = [
    ...sentTransactions.map((tx) => ({
      ...tx,
      type: 'Sent',
      sender_receiver_name: tx.receiver_name || 'N/A',
    })),
    ...receivedTransactions.map((tx) => ({
      ...tx,
      type: 'Received',
      sender_receiver_name: tx.sender_name || 'N/A',
    })),
  ];

  const filterTransactions = (period) => {
    const today = new Date();
    const filtered = transactions.filter((tx) => {
      const txDate = new Date(tx.createdAt);
      if (period === 'today') {
        return txDate.toDateString() === today.toDateString();
      } else if (period === 'month') {
        return txDate.getMonth() === today.getMonth() && txDate.getFullYear() === today.getFullYear();
      }
      return true;
    });
    return filtered;
  };

  const handleExport = () => {
    const filteredTransactions = filterTransactions(period);
    if (filteredTransactions.length === 0) {
      alert('No transactions found for the selected period.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      filteredTransactions.map((tx) => ({
        'Type': tx.type,
        'Sender/Receiver': tx.type === 'Sent' ? tx.receiver : tx.sender,
        'Amount': `₹${tx.amount}`,
        'Description': tx.description,
        'Date': new Date(tx.createdAt).toLocaleString(),
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    XLSX.writeFile(workbook, `transactions-${period}.xlsx`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      {/* Period Selection */}
      <div className="mb-6">
        <button
          onClick={() => { setPeriod('today'); handleExport(); }}
          className={`py-2 px-4 rounded-md ${period === 'today' ? 'bg-blue-600' : 'bg-blue-400'} text-white hover:bg-blue-700`}
        >
          Today's Transactions
        </button>
        <button
          onClick={() => { setPeriod('month'); handleExport(); }}
          className={`py-2 px-4 rounded-md ${period === 'month' ? 'bg-green-600' : 'bg-green-400'} text-white hover:bg-green-700 ml-4`}
        >
          This Month's Transactions
        </button>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2">Transactions</h2>
        <div className="bg-white rounded shadow overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Sender/Receiver</th>
                <th className="px-4 py-2 text-left">Amount</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length > 0 ? (
                transactions.map((tx) => (
                  <tr key={tx.id} className="border-t">
                    <td className="px-4 py-2">{tx.type}</td>
                    <td className="px-4 py-2">{tx.type === 'Sent' ? tx.receiver : tx.sender}</td>
                    <td className="px-4 py-2">PKR{tx.amount}</td>
                    <td className="px-4 py-2">{tx.description}</td>
                    <td className="px-4 py-2">{new Date(tx.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-4 py-2 text-center">No transactions available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
