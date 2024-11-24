const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('view engine', 'ejs');

// Store the feed of drawings
const drawings = [];

app.get('/', (req, res) => {
    res.render('index');
});

// Handle WebSocket connections
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Send existing drawings to the newly connected user
    socket.emit('initializeFeed', drawings);

    // Handle new drawing submissions
    socket.on('sendDrawing', (drawingData) => {
        // Add drawing to the feed
        if (drawingData && Object.keys(drawingData).length > 0) {
            drawings.push(drawingData);
        }

        // Broadcast the new drawing to all users
        io.emit('newDrawing', drawingData);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
