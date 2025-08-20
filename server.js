const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const userToRoom = {};

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        userToRoom[socket.id] = roomId;
        console.log(`User ${userId} joined room ${roomId}`);
        
        // Inform the new user about existing users
        const usersInRoom = io.sockets.adapter.rooms.get(roomId);
        if (usersInRoom) {
            const otherUsers = Array.from(usersInRoom).filter(id => id !== socket.id);
            socket.emit('all-users', otherUsers);
        }

        // Inform existing users about the new user
        socket.to(roomId).emit('user-connected', socket.id);
    });

    socket.on('sending-signal', payload => {
        io.to(payload.userToSignal).emit('user-joined', { signal: payload.signal, callerID: payload.callerID });
    });

    socket.on('returning-signal', payload => {
        io.to(payload.callerID).emit('receiving-returned-signal', { signal: payload.signal, id: socket.id });
    });

    socket.on('disconnect', () => {
        const roomId = userToRoom[socket.id];
        if (roomId) {
            socket.to(roomId).emit('user-disconnected', socket.id);
            delete userToRoom[socket.id];
            console.log('User disconnected:', socket.id);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
