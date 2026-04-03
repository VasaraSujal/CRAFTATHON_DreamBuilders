const dotenv = require('dotenv');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Setup Socket.io for Real-time events
const io = new Server(server, {
    cors: {
        origin: '*', // Adjust this for production
    }
});

io.on('connection', (socket) => {
    console.log(`New WebSocket connection: ${socket.id}`);
    
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

app.set('io', io);
