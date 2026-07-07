import { createContext, useContext, useReducer } from 'react'

const RoomContext = createContext(null)

const initialState = {
  room: null,
  user: null,
  currentSong: null,
  playing: false,
  currentTime: 0,
  queue: [],
  chat: [],
  votes: { votes: 0, total: 0, threshold: 0 },
  error: null,
  info: null
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_ROOM':
      return {
        ...state,
        room: action.room,
        user: action.user,
        currentSong: action.room.currentSong || null,
        playing: action.room.playing || false,
        currentTime: action.currentTime || 0,
        queue: action.room.queue || [],
        chat: action.room.chat || [],
        votes: { votes: 0, total: 0, threshold: 0 },
        error: null
      }

    case 'PLAYBACK_SYNC':
      return {
        ...state,
        playing: action.payload.playing,
        currentTime: action.payload.currentTime ?? state.currentTime,
        currentSong: action.payload.song !== undefined ? action.payload.song : state.currentSong
      }

    case 'QUEUE_UPDATED':
      return { ...state, queue: action.queue }

    case 'NEW_MESSAGE':
      return { ...state, chat: [...state.chat, action.message] }

    case 'USERS_UPDATED': {
      const updatedUser = action.users.find(u => u.id === state.user?.id)
      return {
        ...state,
        room: state.room ? { ...state.room, users: action.users } : state.room,
        user: updatedUser || state.user
      }
    }

    case 'VOTE_UPDATED':
      return { ...state, votes: action.payload }

    case 'SET_ERROR':
      return { ...state, error: action.message }

    case 'CLEAR_ERROR':
      return { ...state, error: null }

    case 'SET_INFO':
      return { ...state, info: action.message }

    case 'CLEAR_INFO':
      return { ...state, info: null }

    default:
      return state
  }
}

export function RoomProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <RoomContext.Provider value={{ state, dispatch }}>
      {children}
    </RoomContext.Provider>
  )
}

export function useRoom() {
  return useContext(RoomContext)
}
