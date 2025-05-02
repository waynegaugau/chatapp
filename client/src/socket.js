import { io } from 'socket.io-client';

const uri = import.meta.env.VITE_SERVER_ORIGIN || 'http://34.81.113.128:5000';

export const socket = io(uri, {
  autoConnect: false,
  withCredentials: true,
});
