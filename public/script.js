const socket = io('https://call-w9t9.onrender.com');
let localStream, peerConn, room = null, isCaller = false;
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// UI
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const roomInput = document.getElementById('roomCode');
const status = document.getElementById('status');
const controls = document.getElementById('controls');
const muteBtn = document.getElementById('muteBtn');
const speakerIndicator = document.getElementById('speakerIndicator');
let isMuted = false;
let remoteAnalyser;

createBtn.onclick = () => {
  room = Math.random().toString(36).substring(2, 8);
  isCaller = true;
  socket.emit('create', room);
  status.textContent = `Room created: ${room}`;
};

joinBtn.onclick = () => {
  room = roomInput.value.trim();
  if (!room) return alert("Enter a room code.");
  isCaller = false;
  socket.emit('join', room);
  status.textContent = `Joined room: ${room}`;
};

socket.on('joined', () => {
  if (isCaller) {
    startCall(true);
  }
});

async function startCall(shouldMakeOffer) {
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  peerConn = new RTCPeerConnection(config);
  localStream.getTracks().forEach(track => peerConn.addTrack(track, localStream));

  peerConn.onicecandidate = e => {
    if (e.candidate) {
      socket.emit('ice', { room, candidate: e.candidate });
    }
  };

  peerConn.ontrack = event => {
    const [remoteStream] = event.streams;
    const audio = new Audio();
    audio.srcObject = remoteStream;
    audio.autoplay = true;
    setupVoiceActivity(remoteStream);
  };

  if (shouldMakeOffer) {
    const offer = await peerConn.createOffer();
    await peerConn.setLocalDescription(offer);
    socket.emit('offer', { room, offer });
  }

  controls.style.display = 'block';
}

socket.on('offer', async ({ offer }) => {
  await startCall(false);
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

muteBtn.onclick = () => {
  isMuted = !isMuted;
  localStream.getAudioTracks()[0].enabled = !isMuted;
  muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
};

// Voice Activity Detection
function setupVoiceActivity(stream) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaStreamSource(stream);
  remoteAnalyser = audioCtx.createAnalyser();
  source.connect(remoteAnalyser);
  remoteAnalyser.fftSize = 512;

  const data = new Uint8Array(remoteAnalyser.frequencyBinCount);

  const checkVolume = () => {
    remoteAnalyser.getByteFrequencyData(data);
    const avg = data.reduce((a, b) => a + b) / data.length;
    speakerIndicator.style.backgroundColor = avg > 10 ? 'green' : 'gray';
    requestAnimationFrame(checkVolume);
  };

  checkVolume();
}
