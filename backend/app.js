const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const trafficRoutes = require('./routes/trafficRoutes');
const userRoutes = require('./routes/userRoutes');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', trafficRoutes);
app.use('/api/users', userRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.send('Military Communication Monitoring System API is running...');
});

module.exports = app;
