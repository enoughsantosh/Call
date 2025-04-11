const socket = io(); // Connect to server
let localStream;
let peerConn;
let room = null;

const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const roomInput = document.getElementById('roomCode');
const status = document.getElementById('status');

// STUN server config for WebRTC
const config = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

createBtn.onclick = async () => {
  room = Math.random().toString(36).substring(2, 8);
  socket.emit('create', room);
  status.textContent = `Room created: ${room}`;
  startCall(true);
};

joinBtn.onclick = () => {
  room = roomInput.value.trim();
  if (!room) return alert("Please enter a room code.");
  socket.emit('join', room);
  status.textContent = `Joined room: ${room}`;
  startCall(false);
};

async function startCall(isCaller) {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    peerConn = new RTCPeerConnection(config);

    // Add local audio stream to peer connection
    localStream.getTracks().forEach(track => peerConn.addTrack(track, localStream));

    // Handle incoming audio stream
    peerConn.ontrack = e => {
      const audio = new Audio();
      audio.srcObject = e.streams[0];
      audio.autoplay = true;
    };

    // ICE candidates handling
    peerConn.onicecandidate = e => {
      if (e.candidate) {
        socket.emit('ice', { room, candidate: e.candidate });
      }
    };

    if (isCaller) {
      const offer = await peerConn.createOffer();
      await peerConn.setLocalDescription(offer);
      socket.emit('offer', { room, offer });
    }
  } catch (err) {
    console.error('Error accessing microphone:', err);
    alert('Microphone access is required to use this app.');
  }
}

// Socket.io signaling handlers
socket.on('joined', async () => {
  // No action needed here unless you want to show "peer joined"
});

socket.on('offer', async ({ offer }) => {
  await peerConn.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConn.createAnswer();
  await peerConn.setLocalDescription(answer);
  socket.emit('answer', { room, answer });
});

socket.on('answer', ({ answer }) => {
  peerConn.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('ice', ({ candidate }) => {
  peerConn.addIceCandidate(new RTCIceCandidate(candidate));
});
