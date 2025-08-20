const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        console.log(`User ${userId} joined room ${roomId}`);
        socket.to(roomId).emit('user-connected', userId);

        // Handle signaling
        socket.on('signal', (data) => {
            console.log(`Relaying signal from ${data.from} to ${data.to}`);
            io.to(data.to).emit('signal', {
                signal: data.signal,
                from: data.from
            });
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', userId);
            socket.to(roomId).emit('user-disconnected', userId);
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
