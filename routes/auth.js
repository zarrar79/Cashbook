const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { sequelize, User, Transaction } = require("../models"); // Correct import for sequelize
const { Op } = require("sequelize"); // Sequelize operators
const { io } = require("socket.io-client");
const router = express.Router();
const userSocketMap = {};

// Middleware to verify JWT token and extract userId
const verifyToken = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }
};

// ✅ SIGN-UP ROUTE
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res
      .status(201)
      .json({ message: "User created successfully", user: newUser });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ SIGN-IN ROUTE
router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: "User not found" });


    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Logged in successfully!",
      token,
      user,
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ USERS LIST ROUTE
router.get("/users", verifyToken, async (req, res) => {
  try {
    const users = await User.findAll({
      where: {
        id: { [Op.ne]: req.userId },
      },
    });
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ TRANSACTION ROUTE
router.post("/transactions", verifyToken, async (req, res) => {
    const { to_user_id, amount, description } = req.body;
    const senderId = req.userId;
  
    try {
      if (!to_user_id || !amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "Invalid transaction data" });
      }
  
      if (parseInt(to_user_id) === senderId) {
        return res.status(400).json({ message: "You cannot send money to yourself" });
      }
  
      const [sender, receiver] = await Promise.all([
        User.findByPk(senderId, {
          attributes: ["id", "name", "email", "amount"],
        }),
        User.findByPk(to_user_id, {
          attributes: ["id", "name", "email", "amount"],
        }),
      ]);
  
      if (!receiver) {
        return res.status(404).json({ message: "Recipient not found" });
      }
  
      const parsedAmount = parseFloat(amount);
      if (parseFloat(sender.amount) < parsedAmount) {
        return res.status(400).json({
          message: "Insufficient balance",
          currentBalance: sender.amount,
          requiredAmount: amount,
        });
      }
  
      // Format the current time for the transaction
      const transactionTime = new Date().toLocaleString(); // Get current time as string
  
      // Emit socket event after successful transaction
      const io = req.app.get('io');
      // Update sender's and receiver's balance
await sender.update({ amount: sender.amount - parsedAmount });
await receiver.update({ amount: receiver.amount + parsedAmount });

// Emit socket event for balance update
if (io) {
  io.emit("balanceUpdated", {
    userId: senderId,
    newBalance: sender.amount - parsedAmount
  });
}

// Emit the paymentMade event as well
if (io) {
    // First get the receiver's details from database
    const receiver = await User.findByPk(to_user_id, {
      attributes: ['id', 'name']
    });
  
    // Emit the paymentMade event with complete information
    io.emit("paymentMade", {
      senderId: senderId,
      senderName: sender.name,
      receiverId: to_user_id,  // Add receiver ID
      receiverName: receiver.name,  // Add receiver name
      amount: parsedAmount,
      description,
      time: transactionTime
    });

    io.to(to_user_id.toString()).emit('paymentMade', {
        senderId,
        senderName: sender.name,
        receiverId: to_user_id,
        receiverName: receiver.name,
        amount: parsedAmount,
        type: 'received' // Helps frontend distinguish
      });
  }

  
      return res.status(201).json({
        success: true,
        message: "Transaction completed successfully",
      });
    } catch (error) {
      console.error("Transaction error:", error);
      if (error.name === "SequelizeDatabaseError") {
        return res.status(503).json({
          success: false,
          message: "Service temporarily unavailable",
        });
      }
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  });    

// ✅ PROFILE TRANSACTIONS ROUTE
router.get("/profile/transactions", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Fetch the user and their transactions along with sender/receiver details
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Transaction,
          as: "sentTransactions", // Alias for sent transactions
          attributes: ["id", "type", "amount", "description", "createdAt"],
          include: [
            {
              model: User,
              as: "receiver", // The receiver user for sent transactions
              attributes: ["id", "name", "email"],
            },
          ],
        },
        {
          model: Transaction,
          as: "receivedTransactions", // Alias for received transactions
          attributes: ["id", "type", "amount", "description", "createdAt"],
          include: [
            {
              model: User,
              as: "sender", // The sender user for received transactions
              attributes: ["id", "name", "email"],
            },
          ],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prepare the response data
    const transactions = {
      sent: user.sentTransactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        createdAt: transaction.createdAt,
        receiver: transaction.receiver ? transaction.receiver.name : "N/A", // Receiver's name
        receiver_id: transaction.receiver ? transaction.receiver.id : null, // Receiver's ID
      })),
      received: user.receivedTransactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        createdAt: transaction.createdAt,
        sender: transaction.sender ? transaction.sender.name : "N/A", // Sender's name
        sender_id: transaction.sender ? transaction.sender.id : null, // Sender's ID
      })),
    };

    res.status(200).json({ transactions });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching transactions" });
  }
});

module.exports = router;
