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
          amount DECIMAL(10, 2) DEFAULT 0
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

  const getUserQuery = `
    SELECT * FROM users WHERE email = ?
  `;

  db.query(getUserQuery, [email], (err, result) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).send('Error fetching user');
    }

    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    
    const user = result[0];

    console.log(user,'----->result');
    console.log(user.transactions);
    console.log((typeof user.transactions === 'string'));
    
    if (user.transactions && typeof user.transactions === 'string') {
      user.transactions = JSON.parse(user.transactions);
    } else if (!user.transactions) {
      user.transactions = { list: [] };
    }


    res.status(200).json(user);
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
  
  if (!sender_id || !to_user_id || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Invalid transaction details' });
  }

  db.beginTransaction(async (beginErr) => {
    if (beginErr) {
      return res.status(500).json({ message: 'Error starting transaction' });
    }

    try {
      // Check if this is an edit of an existing transaction
      const isEdit = flag === true && !!transactionId;

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

        // Verify sender has enough balance for the edit
        if (senderData.amount < amountDifference) {
          throw new Error('Insufficient balance for this edit');
        }

        // Update transaction details
        senderTxn.amount = amount;
        recipientTxn.amount = amount;
        senderTxn.timeStamp = timestamp;
        recipientTxn.timeStamp = timestamp;

        // Add edit history
        senderTxn.edits = senderTxn.edits || [];
        recipientTxn.edits = recipientTxn.edits || [];
        
        senderTxn.edits.unshift({
          oldAmount: oldAmount,
          newAmount: amount,
          timeStamp: timestamp
        });

        recipientTxn.edits.unshift({
          oldAmount: oldAmount,
          newAmount: amount,
          timeStamp: timestamp
        });

        // Increment edit count
        senderTxn.editCount = (senderTxn.editCount || 0) + 1;
        recipientTxn.editCount = (recipientTxn.editCount || 0) + 1;

        // The amount to actually transfer is the difference
        amountChange = amountDifference;
      } else {
        // NEW TRANSACTION
        if (senderData.amount < amount) {
          throw new Error('Insufficient balance');
        }

        actualTransactionId = `txn_${Date.now()}_${Math.random().toString(16).slice(2)}`;

        // Create new transaction records
        const senderTransaction = {
          id: actualTransactionId,
          receiver_id: to_user_id,
          name: recipientData.name,
          amount: amount,
          editCount: 0,
          type: 'Sent',
          timeStamp: timestamp,
          edits: []
        };

        const recipientTransaction = {
          id: actualTransactionId,
          sender_id: sender_id,
          name: senderData.name,
          amount: amount,
          editCount: 0,
          type: 'Received',
          timeStamp: timestamp,
          edits: []
        };

        // Add to beginning of lists
        senderTransactions.list.unshift(senderTransaction);
        recipientTransactions.list.unshift(recipientTransaction);

        // The full amount should be transferred for new transactions
        amountChange = amount;
      }

      // Update database records
      await Promise.all([
        // Update sender amount
        new Promise((resolve, reject) => {
          db.query(
            'UPDATE users SET amount = amount - ? WHERE id = ?',
            [amountChange, sender_id],
            (err) => err ? reject(err) : resolve()
          );
        }),
        // Update recipient amount
        new Promise((resolve, reject) => {
          db.query(
            'UPDATE users SET amount = amount + ? WHERE id = ?',
            [amountChange, to_user_id],
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