const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files (if needed)
app.use(express.static('public'));

// Set EJS as the template engine
app.set('view engine', 'ejs');

// Route for the main page
app.get('/', (req, res) => {
    res.render('index');
});

// WebSocket logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Listen for drawing data and broadcast to other clients
    socket.on('draw', (data) => {
        socket.broadcast.emit('draw', data);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
