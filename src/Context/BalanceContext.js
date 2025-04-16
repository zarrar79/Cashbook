// src/Context/BalanceContext.js
import React, { createContext, useContext, useState } from 'react';

const BalanceContext = createContext();

export const BalanceProvider = ({ children }) => {
  const [balance, setBalance] = useState(1000); // initial balance
  const [lastTransactionMessage, setLastTransactionMessage] = useState('');
  const [user, setUser] = useState(null); // State to store user data

  const updateBalance = (newBalance) => {
    setBalance(newBalance);
  };

  const setUserData = (userData) => {
    setUser(userData); // Update user data
  };

  return (
    <BalanceContext.Provider value={{ balance, updateBalance, lastTransactionMessage, setLastTransactionMessage, user, setUserData }}>
      {children}
    </BalanceContext.Provider>
  );
};

export const useBalance = () => useContext(BalanceContext);
