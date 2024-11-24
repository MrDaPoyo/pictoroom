const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Store the feed of drawings
const drawings = [];

app.get('/chat/:room', (req, res) => {
    res.render('chatroom', {room: req.params.room, username: req.query.username});
});

app.post('/joinRoom', async (req, res) => {
    res.redirect(`/chat/${await req.body.room}?username=${req.body.username}`);
});

app.get('/', (req, res) => {
    res.render('index');
});

// Handle WebSocket connections
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a room
    socket.on('joinRoom', (room) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room ${room}`);

        // Send existing drawings to the newly connected user
        socket.emit('initializeFeed', room, drawings);
    });

    // Join a room
    socket.on('joinRoom', (room) => {
        socket.join(room);
        const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
        if (roomSize >= 10) {
            socket.emit('roomFull', room);
            return;
        }

        const colors = ['lime', 'red', 'blue', 'green', 'orange', 'purple', 'black', 'darkslateblue', 'brown', 'magenta'];
        const userColor = colors[roomSize % colors.length];
        socket.emit('assignColor', userColor);
        console.log(`User ${socket.id} joined room ${room}`);
    });

    // Handle new drawing submissions for a specific room
    socket.on('sendDrawing', (room, drawingData, username) => {
        // Add drawing to the feed
        if (drawingData && Object.keys(drawingData).length > 0 && username) {
            drawings.push(drawingData);
        }
        // Broadcast the new drawing to all users in the room
        io.to(room).emit('newDrawing', { drawingData, username: username });
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
