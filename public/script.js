const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const myVideo = document.createElement('video');
myVideo.muted = true; // Mute our own video to prevent echo

const peers = {}; // Object to store all peer connections
const ROOM_ID = 'default-room';

// Get user's camera and microphone
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    addVideoStream(myVideo, stream, true); // Add our own video stream

    // When a new user connects, this event is received by existing users
    socket.on('user-connected', userId => {
        console.log('New user connected, creating peer for:', userId);
        connectToNewUser(userId, stream);
    });

    // When we receive a signal from another peer
    socket.on('signal', data => {
        console.log('Received signal from:', data.from);
        // If a peer connection already exists for the sender, pass the signal
        if (peers[data.from]) {
            peers[data.from].signal(data.signal);
        }
    });

    // Join the room
    socket.emit('join-room', ROOM_ID, socket.id);

}).catch(err => {
    console.error('Failed to get local stream', err);
});

// Function to connect to a new user
function connectToNewUser(userId, stream) {
    // Create a new peer connection, we are the initiator
    const peer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream: stream,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        }
    });

    // This event fires when the peer has a signal to send
    peer.on('signal', signal => {
        console.log('Sending signal to:', userId);
        socket.emit('signal', { to: userId, from: socket.id, signal });
    });

    // This event fires when we receive the remote user's stream
    peer.on('stream', userStream => {
        console.log('Received stream from:', userId);
        const userVideo = document.createElement('video');
        addVideoStream(userVideo, userStream, false);
    });

    // Store the new peer connection
    peers[userId] = peer;
}

// When a user disconnects, remove their video and destroy the peer connection
socket.on('user-disconnected', userId => {
    console.log('User disconnected:', userId);
    if (peers[userId]) {
        peers[userId].destroy();
        delete peers[userId];
    }
    const videoElement = document.getElementById(userId);
    if (videoElement) {
        videoElement.parentElement.remove();
    }
});

// Function to add a video stream to the grid
function addVideoStream(video, stream, isLocal) {
    video.srcObject = stream;
    if (!isLocal) {
        video.id = stream.id; // Use a unique ID for remote streams
    }
    video.playsInline = true; // Necessary for iOS Safari
    video.addEventListener('loadedmetadata', () => {
        video.play().catch(e => console.error('Video play failed:', e));
    });
    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'video-container';
    videoWrapper.append(video);
    videoGrid.append(videoWrapper);
}
