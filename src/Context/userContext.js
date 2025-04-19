import React, { createContext, useState, useContext } from 'react';

const UserContext = createContext();

export const useUser = () => {
  return useContext(UserContext);
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [sentTransactions, setSentTransactions] = useState([]);
  const [receivedTransactions, setReceivedTransactions] = useState([]);
  const [amount, setAmount] = useState(0);
  const [email, setEmail] = useState('');
  const [transactionRecipient, setTransactionRecipient] = useState({});
  const [transactions, setTransactions] = useState({});

  const setUserData = (userData) => {
    const { transactions } = userData;
    console.log(userData,'----->userData1');
    
    setUser(userData);
    setSentTransactions(userData.transactions?.sent || []);
    setReceivedTransactions(userData.transactions?.received || []);
    setAmount(userData.amount);
    setEmail(userData.email)
    setTransactions(userData.transactions)
  };

  return (
    <UserContext.Provider
      value={{
        user,
        sentTransactions,
        receivedTransactions,
        amount,
        setUserData,
        email,
        setEmail,
        transactionRecipient, 
        setTransactionRecipient,
        transactions
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
