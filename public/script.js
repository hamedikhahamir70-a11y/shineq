const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const myVideo = document.createElement('video');
myVideo.muted = true;

const peers = {};
const ROOM_ID = 'default-room'; // For simplicity, everyone joins the same room

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    addVideoStream(myVideo, stream);

    socket.emit('join-room', ROOM_ID, socket.id);

    socket.on('user-connected', userId => {
        console.log('User connected:', userId);
        connectToNewUser(userId, stream);
    });

    socket.on('signal', data => {
        if (peers[data.from]) {
            peers[data.from].signal(data.signal);
        }
    });

    socket.on('user-disconnected', userId => {
        console.log('User disconnected:', userId);
        if (peers[userId]) {
            peers[userId].destroy();
        }
        const videoElement = document.getElementById(userId);
        if (videoElement) {
            videoElement.parentElement.remove();
        }
    });
});

function connectToNewUser(userId, stream) {
    const peer = new SimplePeer({
        initiator: true, // The new user initiates the connection
        trickle: false, // Disable trickle ICE for simplicity
        stream: stream
    });

    peer.on('signal', signal => {
        socket.emit('signal', { to: userId, from: socket.id, signal });
    });

    peer.on('stream', userStream => {
        const userVideo = document.createElement('video');
        userVideo.id = userId;
        addVideoStream(userVideo, userStream);
    });

    peer.on('close', () => {
        const videoElement = document.getElementById(userId);
        if (videoElement) {
            videoElement.parentElement.remove();
        }
    });

    peers[userId] = peer;
}

// This function is called when we receive a signal from another user
socket.on('signal', data => {
    // Check if we already have a peer for this user
    if (peers[data.from]) {
        peers[data.from].signal(data.signal);
    } else {
        // If not, create a new peer (we are the receiver)
        const peer = new SimplePeer({
            initiator: false,
            trickle: false,
            stream: myVideo.srcObject // Send our stream back
        });

        peer.on('signal', signal => {
            socket.emit('signal', { to: data.from, from: socket.id, signal });
        });

        peer.on('stream', userStream => {
            const userVideo = document.createElement('video');
            userVideo.id = data.from;
            addVideoStream(userVideo, userStream);
        });

        peer.on('close', () => {
            const videoElement = document.getElementById(data.from);
            if (videoElement) {
                videoElement.parentElement.remove();
            }
        });

        peer.signal(data.signal); // The crucial step to accept the connection
        peers[data.from] = peer;
    }
});

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    const videoWrapper = document.createElement('div');
    videoWrapper.append(video);
    videoGrid.append(videoWrapper);
}
