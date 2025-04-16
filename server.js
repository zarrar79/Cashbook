const express = require('express');
const db = require('./models'); // Sequelize models
const cors = require('cors');
const authRoutes = require('./routes/auth');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

// Setup socket.io with enhanced configuration
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // frontend origin
    methods: ['GET', 'POST'],
    credentials: true
  },
  connectionStateRecovery: {
    // Enable reconnection logic
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true
  }
});

// Store connected users with additional info
const connectedUsers = new Map(); // Format: { userId: { socketId, lastActive } }
const userSocketMap = {};
// Socket.io authentication middleware
io.on('connection', (socket) => {
  console.log('User Connected:', socket.id);

  // Store the socketId in the userSocketMap whenever a user connects
  socket.on('register', (userId) => {
    userSocketMap[userId] = socket.id;
    console.log(`User ${userId} registered with socket ID: ${socket.id}`);
  });

  // Handle 'paymentMade' event
  socket.on('paymentMade', (data) => {
    const targetSocketId = userSocketMap[data.userId];
    if (targetSocketId) {
      io.to(targetSocketId).emit('paymentMade', {
        from: data.senderId,
        senderName : data.senderName,
        amount: data.amount,
        description: data.description,
        time: data.time,
        message: `You received ₹${data.amount} from ${data.senderName}`,
      });
      console.log(`Payment of ₹${data.amount} sent to user ${data.userId}`);
    } else {
      console.log(`No active connection for user ${data.userId}`);
    }
  });

  // Handle disconnections
  socket.on('disconnect', () => {
    for (const [userId, socketId] of Object.entries(userSocketMap)) {
      if (socketId === socket.id) {
        delete userSocketMap[userId];
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });
});

// Export io, connectedUsers and helper function
app.set('io', io);

// Routes
app.use('/auth', authRoutes);

// Start server
const PORT = process.env.PORT || 3001;
db.sequelize.sync().then(() => {
  console.log('✅ Database synced!');
  server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📡 WebSocket server ready at ws://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('❌ Error syncing database:', err);
});