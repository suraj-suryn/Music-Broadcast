const { v4: uuidv4 } = require('uuid');
const {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomBySocket,
  getCurrentTime,
  serializeRoom
} = require('./rooms');

module.exports = function registerHandlers(io, socket) {

  // ── Create Room ──────────────────────────────────────────
  socket.on('create-room', ({ name } = {}) => {
    if (!name || !name.trim()) return socket.emit('error', { message: 'Name is required' });

    const { room, user } = createRoom(socket, name.trim());
    socket.join(room.code);
    socket.emit('room-created', { roomCode: room.code, user, room: serializeRoom(room) });
  });

  // ── Join Room ────────────────────────────────────────────
  socket.on('join-room', ({ roomCode, name } = {}) => {
    if (!name || !name.trim()) return socket.emit('error', { message: 'Name is required' });
    if (!roomCode || !roomCode.trim()) return socket.emit('error', { message: 'Room code is required' });

    const result = joinRoom(roomCode.trim().toUpperCase(), socket.id, name.trim());
    if (result.error) return socket.emit('error', { message: result.error });

    const { room, user, hostRestored } = result;
    socket.join(room.code);

    const currentTime = getCurrentTime(room);
    socket.emit('room-joined', { room: serializeRoom(room), user, currentTime });
    // Notify existing users — pass hostRestored so they can show a toast
    socket.to(room.code).emit('user-joined', { users: room.users, hostRestored });
  });

  // ── Add to Queue (host only) ─────────────────────────────
  socket.on('add-to-queue', ({ song } = {}) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const user = room.users.find(u => u.id === socket.id);
    if (!user?.isHost) return socket.emit('error', { message: 'Only the host can add songs' });
    if (!song || !song.source || !song.url) return socket.emit('error', { message: 'Invalid song data' });

    const newSong = { ...song, id: uuidv4() };
    room.queue.push(newSong);

    if (!room.currentSong) {
      advanceSong(io, room);
    } else {
      io.to(room.code).emit('queue-updated', { queue: room.queue });
    }
  });

  // ── Remove from Queue (host only) ───────────────────────
  socket.on('remove-from-queue', ({ songId } = {}) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const user = room.users.find(u => u.id === socket.id);
    if (!user?.isHost) return;

    room.queue = room.queue.filter(s => s.id !== songId);
    io.to(room.code).emit('queue-updated', { queue: room.queue });
  });

  // ── Play (host only) ─────────────────────────────────────
  socket.on('play', () => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const user = room.users.find(u => u.id === socket.id);
    if (!user?.isHost || !room.currentSong) return;

    room.playing = true;
    room.startedAt = Date.now();

    io.to(room.code).emit('playback-sync', {
      playing: true,
      currentTime: room.playedSeconds,
      timestamp: room.startedAt,
      song: room.currentSong
    });
  });

  // ── Pause (host only) ────────────────────────────────────
  socket.on('pause', () => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const user = room.users.find(u => u.id === socket.id);
    if (!user?.isHost) return;

    room.playedSeconds = getCurrentTime(room);
    room.playing = false;

    io.to(room.code).emit('playback-sync', {
      playing: false,
      currentTime: room.playedSeconds,
      song: room.currentSong
    });
  });

  // ── Seek (host only) ─────────────────────────────────────
  socket.on('seek', ({ time } = {}) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const user = room.users.find(u => u.id === socket.id);
    if (!user?.isHost || typeof time !== 'number') return;

    room.playedSeconds = time;
    if (room.playing) room.startedAt = Date.now();

    io.to(room.code).emit('playback-sync', {
      playing: room.playing,
      currentTime: time,
      timestamp: room.playing ? room.startedAt : null,
      song: room.currentSong
    });
  });

  // ── Next Song (host only) ────────────────────────────────
  socket.on('next-song', () => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const user = room.users.find(u => u.id === socket.id);
    if (!user?.isHost) return;

    advanceSong(io, room);
  });

  // ── Song Ended (any client) ──────────────────────────────
  socket.on('song-ended', () => {
    const room = getRoomBySocket(socket.id);
    if (!room || !room.playing) return;
    advanceSong(io, room);
  });

  // ── Vote to Skip (guests only) ──────────────────────────
  socket.on('vote-skip', () => {
    const room = getRoomBySocket(socket.id);
    if (!room || !room.currentSong) return;
    const user = room.users.find(u => u.id === socket.id);
    if (!user || user.isHost) return;

    room.voteSkips.add(socket.id);
    const nonHostCount = room.users.filter(u => !u.isHost).length;
    const votes = room.voteSkips.size;

    io.to(room.code).emit('vote-updated', {
      votes,
      total: nonHostCount,
      threshold: Math.ceil(nonHostCount / 2)
    });

    if (votes > nonHostCount / 2) {
      room.voteSkips.clear();
      advanceSong(io, room);
    }
  });

  // ── Chat ─────────────────────────────────────────────────
  socket.on('send-message', ({ text } = {}) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const user = room.users.find(u => u.id === socket.id);
    if (!user || !text || !text.trim()) return;

    const msg = {
      userName: user.name,
      text: text.trim().slice(0, 500),
      timestamp: Date.now()
    };
    room.chat.push(msg);
    if (room.chat.length > 100) room.chat.shift();

    io.to(room.code).emit('new-message', msg);
  });

  // ── Disconnect ───────────────────────────────────────────
  socket.on('disconnect', () => {
    const result = leaveRoom(socket.id);
    if (!result || result.users.length === 0) return;

    io.to(result.code).emit('user-left', {
      users: result.users,
      hostChanged: result.hostChanged
    });
  });
};

// ── Helper ───────────────────────────────────────────────────
function advanceSong(io, room) {
  if (room.queue.length === 0) {
    room.currentSong = null;
    room.playing = false;
    room.playedSeconds = 0;
    room.startedAt = null;
    io.to(room.code).emit('playback-sync', { playing: false, currentTime: 0, song: null });
    io.to(room.code).emit('queue-updated', { queue: [] });
    return;
  }

  room.currentSong = room.queue.shift();
  room.playing = true;
  room.playedSeconds = 0;
  room.startedAt = Date.now();
  room.voteSkips.clear();

  io.to(room.code).emit('playback-sync', {
    playing: true,
    currentTime: 0,
    timestamp: room.startedAt,
    song: room.currentSong
  });
  io.to(room.code).emit('queue-updated', { queue: room.queue });
}
