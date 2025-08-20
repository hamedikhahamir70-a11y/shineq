const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const myVideo = document.createElement('video');
myVideo.muted = true;

const peers = {};
const ROOM_ID = 'default-room';
let myStream;

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    myStream = stream;
    addVideoStream(myVideo, stream);

    socket.emit('join-room', ROOM_ID, socket.id);

    socket.on('all-users', users => {
        users.forEach(userId => {
            const peer = createPeer(userId, socket.id, stream);
            peers[userId] = peer;
        });
    });

    socket.on('user-connected', userId => {
        const peer = createPeer(userId, socket.id, stream);
        peers[userId] = peer;
    });

    socket.on('user-joined', payload => {
        const peer = addPeer(payload.signal, payload.callerID, stream);
        peers[payload.callerID] = peer;
    });

    socket.on('receiving-returned-signal', payload => {
        const item = peers[payload.id];
        item.signal(payload.signal);
    });

    socket.on('user-disconnected', userId => {
        if (peers[userId]) {
            peers[userId].destroy();
        }
        const video = document.getElementById(userId);
        if (video) {
            video.parentElement.remove();
        }
        delete peers[userId];
    });
});

function createPeer(userToSignal, callerID, stream) {
    const peer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream,
    });

    peer.on('signal', signal => {
        socket.emit('sending-signal', { userToSignal, callerID, signal });
    });

    peer.on('stream', userStream => {
        const userVideo = document.createElement('video');
        addVideoStream(userVideo, userStream, userToSignal);
    });

    return peer;
}

function addPeer(incomingSignal, callerID, stream) {
    const peer = new SimplePeer({
        initiator: false,
        trickle: false,
        stream,
    });

    peer.on('signal', signal => {
        socket.emit('returning-signal', { signal, callerID });
    });

    peer.on('stream', userStream => {
        const userVideo = document.createElement('video');
        addVideoStream(userVideo, userStream, callerID);
    });

    peer.signal(incomingSignal);
    return peer;
}

function addVideoStream(video, stream, userId) {
    video.srcObject = stream;
    if (userId) {
        video.id = userId;
    }
    video.playsInline = true;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'video-container';
    videoWrapper.append(video);
    videoGrid.append(videoWrapper);
}
