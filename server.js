const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let db;

const rootConnection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: ''
});

rootConnection.connect(err => {
  if (err) throw err;
  console.log('Connected to MySQL server.');

  rootConnection.query('CREATE DATABASE IF NOT EXISTS cashbook', (err) => {
    if (err) throw err;
    console.log('Database `cashbook` is ready.');

    db = mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'cashbook'
    });

    db.connect(err => {
      if (err) throw err;
      console.log('Connected to `cashbook` database.');

      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255),
          email VARCHAR(255) UNIQUE,
          password VARCHAR(255),
          transactions JSON,
          amount DECIMAL(10, 2) DEFAULT 0,
          transaction_count INT DEFAULT 0
        )
      `;

      db.query(createUsersTable, (err) => {
        if (err) throw err;
        console.log('Table `users` is ready.');
      });
    });
  });
});

// Signup endpoint
app.post('/signup', (req, res) => {
  const { name, email, password } = req.body;

  const checkQuery = 'SELECT * FROM users WHERE email = ?';
  db.query(checkQuery, [email], (err, results) => {
    if (err) return res.status(500).send('Error checking user');

    if (results.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const transactions = JSON.stringify({ list: [] });
    const insertQuery = 'INSERT INTO users (name, email, password, transactions) VALUES (?, ?, ?, ?)';

    db.query(insertQuery, [name, email, password, transactions], (err, result) => {
      if (err) return res.status(500).send('Error creating user');
      res.status(201).json({ message: 'User created successfully' });
    });
  });
});

// Signin endpoint
app.post('/signin', (req, res) => {
  const { email, password } = req.body;

  const query = 'SELECT id, name, email, transactions, amount FROM users WHERE email = ? AND password = ?';
  db.query(query, [email, password], (err, results) => {
    if (err) return res.status(500).send('Error during login');

    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = results[0];
    if (user.transactions && typeof user.transactions === 'string') {
      user.transactions = JSON.parse(user.transactions);
    } else if (!user.transactions) {
      user.transactions = { list: [] };
    }

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        amount: user.amount,
        transactions: user.transactions
      }
    });
  });
});

// Add amount endpoint
app.post('/addAmount', (req, res) => {
  const { email, amount } = req.body;

  if (!email || isNaN(amount)) {
    return res.status(400).json({ message: 'Invalid email or amount' });
  }

  const updateQuery = `
    UPDATE users
    SET amount = amount + ?
    WHERE email = ?
  `;

  db.query(updateQuery, [amount, email], (err, result) => {
    if (err) return res.status(500).send('Error updating amount');

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Amount updated successfully' });
  });
});

// Get user endpoint
app.post('/getUser', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const getUserQuery = `SELECT * FROM users WHERE email = ?`;

  db.query(getUserQuery, [email], (err, result) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).send('Error fetching user');
    }

    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result[0];
    
    // Initialize transactions if not present
    if (user.transactions && typeof user.transactions === 'string') {
      user.transactions = JSON.parse(user.transactions);
    } else if (!user.transactions) {
      user.transactions = { list: [] };
    }

    // Ensure transactions.list exists
    if (!user.transactions.list) {
      user.transactions.list = [];
    }

    // Initialize counts if not present
    user.transaction_count = user.transaction_count || 0;

    // Track new transactions
    let newTransactions = [];
    if (user.transaction_count < user.transactions.list.length) {
      const difference = user.transactions.list.length - user.transaction_count;
      const sorted = [...user.transactions.list].sort((a, b) => 
        new Date(b.timeStamp) - new Date(a.timeStamp)
      );
      newTransactions = sorted.slice(0, difference);
    }

    // Track edit changes
    let editNotifications = [];
    user.transactions.list.forEach(tx => {
      tx.editCount = tx.editCount || 0;
      const editsLength = tx.edits?.length || 0;

      if (tx.editCount < editsLength) {
        const difference = editsLength - tx.editCount;
        const sortedEdits = [...tx.edits].sort((a, b) => 
          new Date(b.timeStamp) - new Date(a.timeStamp)
        );
        editNotifications.push(...sortedEdits.slice(0, difference).map(edit => ({
          ...tx,
          editData: edit
        })));
        tx.editCount = editsLength; // Update count
      }
    });

    // Update database if changes found
    if (newTransactions.length > 0 || editNotifications.length > 0) {
      const updateQuery = `UPDATE users SET transactions = ?, transaction_count = ? WHERE email = ?`;
      db.query(updateQuery, [
        JSON.stringify(user.transactions),
        user.transactions.list.length,
        email
      ], (updateErr) => {
        if (updateErr) {
          console.error('Error updating user:', updateErr);
        }
        return res.status(200).json({
          ...user,
          notifications: {
            newTransactions,
            editNotifications
          }
        });
      });
    } else {
      return res.status(200).json(user);
    }
  });
});

// Get all users endpoint
app.post('/users', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const query = 'SELECT id, name, amount FROM users WHERE email != ?';

  db.query(query, [email], (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).send('Error fetching users');
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    res.status(200).json({
      message: 'Users fetched successfully',
      users: results
    });
  });
});

// Unified transactions endpoint (handles both new transactions and edits)
app.post('/transactions', (req, res) => {
  const { to_user_id, amount, sender, transactionId, flag } = req.body;
  const sender_id = sender;
  const isEdit = flag;
  
  if (!sender_id || !to_user_id || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Invalid transaction details' });
  }

  db.beginTransaction(async (beginErr) => {
    if (beginErr) {
      return res.status(500).json({ message: 'Error starting transaction' });
    }

    try {

      // 1. Get sender data
      const [senderData] = await new Promise((resolve, reject) => {
        db.query('SELECT id, name, amount, transactions FROM users WHERE id = ? FOR UPDATE', [sender_id], (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });

      if (!senderData) {
        throw new Error('Sender not found');
      }

      // 2. Get recipient data
      const [recipientData] = await new Promise((resolve, reject) => {
        db.query('SELECT id, name, amount, transactions FROM users WHERE id = ? FOR UPDATE', [to_user_id], (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });

      if (!recipientData) {
        throw new Error('Recipient not found');
      }

      // Parse transactions for both users
      let senderTransactions = { list: [] };
      if (senderData.transactions) {
        senderTransactions = typeof senderData.transactions === 'string' ? 
          JSON.parse(senderData.transactions) : 
          senderData.transactions;
      }

      let recipientTransactions = { list: [] };
      if (recipientData.transactions) {
        recipientTransactions = typeof recipientData.transactions === 'string' ? 
          JSON.parse(recipientData.transactions) : 
          recipientData.transactions;
      }

      let actualTransactionId = transactionId;
      const timestamp = new Date().toISOString();
      let amountChange;

      if (isEdit) {
        // EDIT EXISTING TRANSACTION
        const findTransaction = (list) => list.find(t => t.id === transactionId);
        
        const senderTxn = findTransaction(senderTransactions.list);
        const recipientTxn = findTransaction(recipientTransactions.list);

        if (!senderTxn || !recipientTxn) {
          throw new Error('Transaction not found for editing');
        }

        const oldAmount = senderTxn.amount;
        const amountDifference = amount - oldAmount;

        if (senderData.amount < amountDifference) {
          throw new Error('Insufficient balance for this edit');
        }

        // Create new edit record
        const editRecord = {
          oldAmount: oldAmount,
          newAmount: amount,
          timeStamp: timestamp
        };

        // Update sender transaction with immutable update
        senderTransactions.list = senderTransactions.list.map(tx => {
          if (tx.id === transactionId) {
            return {
              ...tx,
              amount: amount,
              timeStamp: timestamp,
              edits: [editRecord, ...(tx.edits || [])],
              editCount: (tx.editCount || 0) + 1
            };
          }
          return tx;
        });

        // Update recipient transaction with immutable update
        recipientTransactions.list = recipientTransactions.list.map(tx => {
          if (tx.id === transactionId) {
            return {
              ...tx,
              amount: amount,
              timeStamp: timestamp,
              edits: [editRecord, ...(tx.edits || [])],
              editCount: (tx.editCount || 0) + 1
            };
          }
          return tx;
        });

        amountChange = amountDifference;
      } else {
        // NEW TRANSACTION


        if (senderData.amount < amount) {
          throw new Error('Insufficient balance');
        }


        actualTransactionId = `txn_${Date.now()}_${Math.random().toString(16).slice(2)}`;

        // Create new transaction records with empty edits array
        const senderTransaction = {
          id: actualTransactionId,
          receiver_id: to_user_id,
          name: recipientData.name,
          amount: amount,
          editCount: 0,
          type: 'Sent',
          timeStamp: timestamp,
          edits: [] // Initialize empty edits array
        };

        const recipientTransaction = {
          id: actualTransactionId,
          sender_id: sender_id,
          name: senderData.name,
          amount: amount,
          editCount: 0,
          type: 'Received',
          timeStamp: timestamp,
          edits: [] // Initialize empty edits array
        };

        // Add to beginning of lists
        senderTransactions.list.unshift(senderTransaction);
        recipientTransactions.list.unshift(recipientTransaction);
        amountChange = amount;
      }

      // Update database records
      await Promise.all([
        // Update sender amount
        new Promise((resolve, reject) => {
          db.query(
            'UPDATE users SET amount = amount - ? WHERE id = ?',
            [amount, sender_id],
            (err) => err ? reject(err) : resolve()
          );
        }),
        // Update recipient amount
        new Promise((resolve, reject) => {
          db.query(
            'UPDATE users SET amount = amount + ? WHERE id = ?',
            [amount, to_user_id],
            (err) => err ? reject(err) : resolve()
          );
        }),
        // Update sender transactions
        new Promise((resolve, reject) => {
          db.query(
            'UPDATE users SET transactions = ? WHERE id = ?',
            [JSON.stringify(senderTransactions), sender_id],
            (err) => err ? reject(err) : resolve()
          );
        }),
        // Update recipient transactions
        new Promise((resolve, reject) => {
          db.query(
            'UPDATE users SET transactions = ? WHERE id = ?',
            [JSON.stringify(recipientTransactions), to_user_id],
            (err) => err ? reject(err) : resolve()
          );
        })
      ]);

      await new Promise((resolve, reject) => {
        db.commit(err => err ? reject(err) : resolve());
      });
      
      res.status(200).json({
        message: isEdit ? 'Transaction edited successfully' : 'Payment successful',
        transactionId: actualTransactionId,
        sender: senderData.name,
        recipient: recipientData.name,
        amount: amount,
        timestamp: timestamp,
        isEdit: isEdit
      });
    } catch (error) {
      await new Promise((resolve) => {
        db.rollback(() => resolve());
      });
      
      console.error('Transaction error:', error);
      res.status(400).json({ 
        message: error.message || 'Transaction failed',
        details: error.message.includes('balance') ? 'Not enough funds' : 'Transaction error'
      });
    }
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});