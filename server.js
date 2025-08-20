const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', userId);
        console.log(`User ${userId} joined room ${roomId}`);

        socket.on('signal', (data) => {
            socket.to(data.to).emit('signal', {
                from: userId,
                signal: data.signal
            });
        });

        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId);
            console.log('User disconnected:', userId);
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
