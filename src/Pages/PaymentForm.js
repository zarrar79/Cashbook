import React, { useState, useEffect, useRef } from 'react';
import { useBalance } from '../Context/BalanceContext';
import { io } from 'socket.io-client';

export const PaymentForm = () => {
    const { balance, updateBalance, setLastTransactionMessage, user } = useBalance();
    const [users, setUsers] = useState([]);
    const [toUser, setToUser] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });
    const socketRef = useRef();

    useEffect(() => {
      socketRef.current = io('http://localhost:3001');
    
      // Retrieve userId from localStorage or other storage
      const userId = localStorage.getItem('userId');
    
      if (!userId) {
        console.error('User ID is not available');
        return;
      }
    
      socketRef.current.on('paymentMade', (data) => {
        console.log(data);
        if(data.senderId !== userId){
        console.log(`Payment received: ₹${data.amount} from ${data.senderName}`);
        updateBalance(data.amount + balance);
        }
        else
        {
        console.log(`Payment sent: ₹${data.amount} to ${data.receiverName}`);
        }
      });
    
      return () => {
        socketRef.current.disconnect();
      };
    }, [updateBalance]);     

    // Fetch users list
    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch('http://localhost:3001/auth/users', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        })
        .then((res) => {
            if (!res.ok) throw new Error('Failed to fetch users');
            return res.json();
        })
        .then((data) => setUsers(data))
        .catch((err) => {
            console.error('Error fetching users:', err);
            setMessage({ text: 'Failed to load recipients', type: 'error' });
        });
    }, []);

    const handleSubmit = async (e) => {
      e.preventDefault();
    
      const paymentAmount = parseFloat(amount);
      const recipientId = parseInt(toUser);
      const senderId = parseInt(localStorage.getItem('userId'));
    
      if (!recipientId || isNaN(paymentAmount) || paymentAmount <= 0) {
        setMessage({ text: 'Invalid payment details', type: 'error' });
        return;
      }
    
      if (paymentAmount > balance) {
        setMessage({ text: 'Insufficient balance!', type: 'error' });
        return;
      }
    
      try {
        const response = await fetch('http://localhost:3001/auth/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            to_user_id: recipientId,
            amount: paymentAmount,
            description,
          }),
        });
    
        const data = await response.json();
    
        if (!response.ok) {
          throw new Error(data.message || 'Payment failed');
        }
    
        const senderName = user?.name || 'Unknown';
        const transactionTime = new Date().toLocaleString();
    
        // Emit to socket after successful transaction
        socketRef.current.emit('paymentMade', {
          recipientId,
          senderId,
          senderName,
          amount: paymentAmount,
          message: `You received ₹${paymentAmount} from ${senderName}`,
          time: transactionTime,
        });

        // Emit balance update after successful transaction
        socketRef.current.emit('updateBalance', balance - paymentAmount);

        setMessage({ text: 'Payment successful!', type: 'success' });
        setLastTransactionMessage('Payment successful');
    
        setToUser('');
        setAmount('');
        setDescription('');
    
        updateBalance(balance - paymentAmount);
      } catch (err) {
        console.error('Payment error:', err);
        setMessage({ text: err.message || 'Payment failed', type: 'error' });
      }
    };

    const filteredUsers = users.filter(u => u.id !== user?.id);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Send Payment</h2>
                
                {message.text && (
                    <div className={`mb-4 p-3 rounded-md text-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-1">
                            Recipient
                        </label>
                        <select
                            id="recipient"
                            value={toUser}
                            onChange={(e) => setToUser(e.target.value)}
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Select User</option>
                            {filteredUsers.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name} ({user.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                            Amount
                        </label>
                        <input
                            id="amount"
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                        <div className="text-xs text-gray-500 mt-1">
                            Available balance: ₹{balance.toFixed(2)}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                            Description (Optional)
                        </label>
                        <textarea
                            id="description"
                            placeholder="What's this payment for?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows="3"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200 disabled:bg-blue-300"
                        disabled={!toUser || !amount || parseFloat(amount) <= 0}
                    >
                        Send Payment
                    </button>
                </form>
            </div>
        </div>
    );
};
