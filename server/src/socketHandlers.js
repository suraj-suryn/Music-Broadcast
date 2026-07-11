const { v4: uuidv4 } = require('uuid');
const {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomBySocket,
  getRoom,
  getCurrentTime,
  serializeRoom
} = require('./rooms');

module.exports = function registerHandlers(io, socket) {

  // ── Create Room ──────────────────────────────────────────
  socket.on('create-room', ({ name, password = '' } = {}) => {
    if (!name || !name.trim()) return socket.emit('error', { message: 'Name is required' });

    const { room, user } = createRoom(socket, name.trim());
    room.password = password.trim();
    socket.join(room.code);
    socket.emit('room-created', { roomCode: room.code, user, room: serializeRoom(room) });
  });

  // ── Join Room ────────────────────────────────────────────
  socket.on('join-room', ({ roomCode, name, password = '' } = {}) => {
    if (!name || !name.trim()) return socket.emit('error', { message: 'Name is required' });
    if (!roomCode || !roomCode.trim()) return socket.emit('error', { message: 'Room code is required' });

    const code = roomCode.trim().toUpperCase();
    const preRoom = getRoom(code);
    if (!preRoom) return socket.emit('error', { message: 'Room not found' });

    // Check password
    if (preRoom.password && preRoom.password !== password.trim()) {
      return socket.emit('error', { message: 'Wrong password', needsPassword: true });
    }

    // Approval gate — skip for original host rejoin
    const isRestoredHost = name.trim().toLowerCase() === preRoom.originalHostName.toLowerCase();
    if (preRoom.requireApproval && !isRestoredHost) {
      preRoom.pendingUsers.push({ socketId: socket.id, name: name.trim(), requestedAt: Date.now() });
      socket.emit('join-request-received', { roomCode: code });
      io.to(code).emit('pending-users-updated', { pendingUsers: preRoom.pendingUsers });
      return;
    }

    const result = joinRoom(code, socket.id, name.trim());
    if (result.error) return socket.emit('error', { message: result.error });

    const { room, user, hostRestored } = result;
    socket.join(room.code);

    const currentTime = getCurrentTime(room);
    socket.emit('room-joined', { room: serializeRoom(room), user, currentTime });
    // Notify existing users — include joinerName for join toast
    socket.to(room.code).emit('user-joined', { users: room.users, hostRestored, joinerName: hostRestored ? null : user.name });
  });

  // ── Approve Join (host only) ─────────────────────────────
  socket.on('approve-join', ({ socketId } = {}) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const host = room.users.find(u => u.id === socket.id);
    if (!host?.isHost) return;
    const idx = room.pendingUsers.findIndex(p => p.socketId === socketId);
    if (idx === -1) return;

    const [pending] = room.pendingUsers.splice(idx, 1);
    io.to(room.code).emit('pending-users-updated', { pendingUsers: room.pendingUsers });

    const result = joinRoom(room.code, pending.socketId, pending.name);
    if (result.error) { io.to(pending.socketId).emit('join-rejected', { reason: result.error }); return; }

    const { user, hostRestored } = result;
    const targetSocket = io.sockets.sockets.get(pending.socketId);
    if (targetSocket) targetSocket.join(room.code);

    const currentTime = getCurrentTime(room);
    io.to(pending.socketId).emit('room-joined', { room: serializeRoom(room), user, currentTime });
    socket.to(room.code).emit('user-joined', { users: room.users, hostRestored: false, joinerName: user.name });
  });

  // ── Reject Join (host only) ──────────────────────────────
  socket.on('reject-join', ({ socketId } = {}) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const host = room.users.find(u => u.id === socket.id);
    if (!host?.isHost) return;
    room.pendingUsers = room.pendingUsers.filter(p => p.socketId !== socketId);
    io.to(socketId).emit('join-rejected', { reason: 'The host declined your request.' });
    io.to(room.code).emit('pending-users-updated', { pendingUsers: room.pendingUsers });
  });

  // ── Set Require Approval (host only) ────────────────────
  socket.on('set-require-approval', ({ enabled } = {}) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const user = room.users.find(u => u.id === socket.id);
    if (!user?.isHost) return;
    room.requireApproval = !!enabled;
    io.to(room.code).emit('require-approval-changed', { requireApproval: room.requireApproval });
  });

  // ── Add to Queue (host, or any user in co-DJ mode) ──────
  socket.on('add-to-queue', ({ song } = {}) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const user = room.users.find(u => u.id === socket.id);
    if (!user) return;
    if (!user.isHost && !room.coDjMode) return socket.emit('error', { message: 'Only the host can add songs' });
    if (!song || !song.source || !song.url) return socket.emit('error', { message: 'Invalid song data' });

    const newSong = { ...song, id: uuidv4() };
    room.queue.push(newSong);

    if (!room.currentSong) {
      advanceSong(io, room);
    } else {
      io.to(room.code).emit('queue-updated', { queue: room.queue });
    }
  });

  // ── Set Co-DJ Mode (host only) ───────────────────────────
  socket.on('set-codj-mode', ({ enabled } = {}) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const user = room.users.find(u => u.id === socket.id);
    if (!user?.isHost) return;
    room.coDjMode = !!enabled;
    io.to(room.code).emit('codj-mode-changed', { coDjMode: room.coDjMode });
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

    if (room.repeat && room.currentSong) {
      // Loop: restart the same song for everyone
      room.playedSeconds = 0;
      room.startedAt = Date.now();
      room.voteSkips.clear();
      io.to(room.code).emit('playback-sync', {
        playing: true,
        currentTime: 0,
        timestamp: room.startedAt,
        song: room.currentSong
      });
    } else {
      advanceSong(io, room);
    }
  });

  // ── Set Repeat (host only) ───────────────────────────────
  socket.on('set-repeat', ({ repeat } = {}) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const user = room.users.find(u => u.id === socket.id);
    if (!user?.isHost) return;
    room.repeat = !!repeat;
    io.to(room.code).emit('repeat-changed', { repeat: room.repeat });
  });
  // ── Set Queue Mode (host only) ────────────────────────
  // mode: 'consume' (default) — remove song after play
  //       'cycle'            — move song to end of queue (loop forever)
  socket.on('set-queue-mode', ({ mode } = {}) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const user = room.users.find(u => u.id === socket.id);
    if (!user?.isHost) return;
    if (mode !== 'consume' && mode !== 'cycle') return;
    room.queueMode = mode;
    io.to(room.code).emit('queue-mode-changed', { queueMode: room.queueMode });
  });
  // ── Share Control (any host → grants host to another user) ──
  socket.on('share-control', ({ toUserId } = {}) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const from = room.users.find(u => u.id === socket.id);
    if (!from?.isHost) return;
    const to = room.users.find(u => u.id === toUserId);
    if (!to || to.isHost) return;

    to.isHost = true;
    room.voteSkips.delete(toUserId);

    io.to(room.code).emit('user-joined', { users: room.users, hostRestored: false });
    io.to(room.code).emit('host-transferred', {
      users:        room.users,
      newHostName:  to.name,
      prevHostName: null  // null signals "shared" not "transferred"
    });
  });

  // ── Revoke Control (any host → removes host from a non-creator) ──
  socket.on('revoke-control', ({ fromUserId } = {}) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const requester = room.users.find(u => u.id === socket.id);
    if (!requester?.isHost) return;
    const target = room.users.find(u => u.id === fromUserId);
    if (!target || !target.isHost || target.isCreator) return; // can't revoke creator

    target.isHost = false;
    io.to(room.code).emit('user-joined', { users: room.users, hostRestored: false });
  });

  // ── Reorder Queue (host only) ─────────────────────────────
  socket.on('reorder-queue', ({ fromIndex, toIndex } = {}) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const user = room.users.find(u => u.id === socket.id);
    if (!user?.isHost) return;
    if (typeof fromIndex !== 'number' || typeof toIndex !== 'number') return;
    const len = room.queue.length;
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= len || toIndex >= len || fromIndex === toIndex) return;
    const [moved] = room.queue.splice(fromIndex, 1);
    room.queue.splice(toIndex, 0, moved);
    io.to(room.code).emit('queue-updated', { queue: room.queue });
  });

  // ── Rename Self ──────────────────────────────────────────
  socket.on('rename-user', ({ name } = {}) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const user = room.users.find(u => u.id === socket.id);
    if (!user) return;
    const trimmed = (name || '').trim().slice(0, 30);
    if (!trimmed) return socket.emit('error', { message: 'Name cannot be empty' });
    user.name = trimmed;
    // Update originalHostName if host renames themselves
    if (user.isHost) room.originalHostName = trimmed;
    io.to(room.code).emit('user-joined', { users: room.users, hostRestored: false });
  });

  // ── Kick User (host only) ────────────────────────────────
  socket.on('kick-user', ({ userId } = {}) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const kicker = room.users.find(u => u.id === socket.id);
    if (!kicker?.isHost) return;
    if (!userId || userId === socket.id) return;
    const target = room.users.find(u => u.id === userId);
    if (!target || target.isHost) return;

    room.users = room.users.filter(u => u.id !== userId);
    room.voteSkips.delete(userId);

    io.to(userId).emit('kicked');
    io.to(room.code).emit('user-left', { users: room.users });
  });

  // ── Suggest Song (any non-host user) ────────────────────
  socket.on('suggest-song', ({ song } = {}) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const user = room.users.find(u => u.id === socket.id);
    if (!user) return;
    if (!song || !song.source || !song.url) return;
    if (room.suggestions.length >= 20) return socket.emit('error', { message: 'Suggestion queue is full (max 20)' });

    const suggestion = { ...song, id: uuidv4(), suggestedBy: user.name, suggestedById: socket.id };
    room.suggestions.push(suggestion);
    io.to(room.code).emit('suggestions-updated', { suggestions: room.suggestions });
  });

  // ── Approve Suggestion (host only) ──────────────────────
  socket.on('approve-suggestion', ({ suggestionId } = {}) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const user = room.users.find(u => u.id === socket.id);
    if (!user?.isHost) return;
    const idx = room.suggestions.findIndex(s => s.id === suggestionId);
    if (idx === -1) return;

    const [suggestion] = room.suggestions.splice(idx, 1);
    // Add to queue (strip suggestion metadata)
    const { suggestedBy, suggestedById, ...song } = suggestion;
    room.queue.push(song);
    if (!room.currentSong) advanceSong(io, room);
    else io.to(room.code).emit('queue-updated', { queue: room.queue });
    io.to(room.code).emit('suggestions-updated', { suggestions: room.suggestions });
  });

  // ── Reject Suggestion (host only) ───────────────────────
  socket.on('reject-suggestion', ({ suggestionId } = {}) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const user = room.users.find(u => u.id === socket.id);
    if (!user?.isHost) return;
    room.suggestions = room.suggestions.filter(s => s.id !== suggestionId);
    io.to(room.code).emit('suggestions-updated', { suggestions: room.suggestions });
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

  // ── Emoji Reaction (any user) ────────────────────────────
  // Pure broadcast — no state stored, ephemeral visual only
  socket.on('send-reaction', ({ emoji } = {}) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const user = room.users.find(u => u.id === socket.id);
    if (!user || !emoji) return;
    io.to(room.code).emit('reaction', { emoji, name: user.name, id: `${Date.now()}-${socket.id}` });
  });

  // ── Request Sync (any client) ─────────────────────────────
  // Used by clients returning from background to re-sync playback state.
  socket.on('request-sync', () => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    socket.emit('playback-sync', {
      playing: room.playing,
      currentTime: getCurrentTime(room),
      timestamp: room.playing ? Date.now() : null,
      song: room.currentSong
    });
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
  // Archive the finishing song to history
  if (room.currentSong) {
    room.history.push({ ...room.currentSong, playedAt: Date.now() });
    if (room.history.length > 100) room.history.shift();
    io.to(room.code).emit('history-updated', { history: room.history });
  }

  // In cycle mode: push the current (just-finished) song back to end of queue
  if (room.queueMode === 'cycle' && room.currentSong) {
    room.queue.push({ ...room.currentSong });
  }

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
