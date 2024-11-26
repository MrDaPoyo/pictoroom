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
var rooms = new Map(); // Map to store room data with users

// Handle WebSocket connections
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a room
    socket.on('joinRoom', (room, username) => {
        socket.join(room);
        const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
        if (roomSize >= 10) {
            socket.emit('roomFull', room);
            return;
        }
        io.to(room).emit('userJoined', { message: `User ${username} joined the room`, userCount: roomSize });
        const colors = ['lime', 'red', 'blue', 'green', 'orange', 'purple', 'black', 'darkslateblue', 'brown', 'magenta'];
        const userColor = colors[roomSize % colors.length];
        socket.emit('assignColor', userColor);
        const userData = { username, socketId: socket.id, color: userColor };
        if (!rooms.has(room)) {
            rooms.set(room, new Map());
        }
        rooms.get(room).set(socket.id, userData);
        console.log(rooms.get(room));
        console.log(`User ${socket.id} joined room ${room}`);
    });

    // Handle new drawing submissions for a specific room
    socket.on('sendDrawing', (room, drawingData, username) => {
        // Add drawing to the feed
        if (drawingData && Object.keys(drawingData).length > 0 && username) {
            drawings.push(drawingData);
        }
        // Broadcast the new drawing to all users in the room
        io.to(room).emit('newDrawing', { drawingData, username });
        const userRooms = Array.from(socket.rooms).filter(room => room !== socket.id);
        userRooms.forEach((roomData) => {
            if (rooms.has(roomData)) {
                rooms.get(roomData).delete(socket.id);
                if (rooms.get(roomData).size === 0) {
                    rooms.delete(roomData);
                }
            }
        });
    });
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        rooms.forEach((users, room) => {
            if (users.has(socket.id)) {
                users.delete(socket.id);
                if (users.size === 0) {
                    rooms.delete(room);
                }
            }
        });
    });
});

app.get('/chat/:room', (req, res) => {
    res.render('chatroom', { room: req.params.room, username: req.query.username });
});

app.post('/joinRoom', async (req, res) => {
    res.redirect(`/chat/${await req.body.room}?username=${req.body.username}`);
});

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/stats', (req, res) => {
    const roomStats = Array.from(rooms.entries()).map(([roomName, users]) => ({
        roomName,
        userCount: users.size,
        users: Array.from(users.values()),
        maxUsers: 10,
    }));

    res.json({
        totalUsers: io.sockets.sockets.size,
        rooms: roomStats,
    });
});


const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
