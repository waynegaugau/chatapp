
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { authRouter, userRouter } from './routes/index.js';
import { Chat } from './models/Chat.js';
import { verifySocketToken } from './middleware/auth.js';

import { bucket } from './firebase-admin.js';

// Configuration
const app = express();
dotenv.config();
app.use(express.json());
app.use(cookieParser());

// Creating server instance for socket.io server constructor and allow cors for client origin
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  },
  cookie: true,
});

// Express allow cors from client origin for normal APIs
app.use(
  cors({
   origin: process.env.CLIENT_ORIGIN,

 credentials: true,
  })
);

// API routes for auth and user
app.use('/user', userRouter);
app.use('/auth', authRouter);

// WebSocket initialization
io.on('connection', (socket) => {
  const verifiedUser = verifySocketToken(socket);

  if (verifiedUser?.id === socket.handshake.auth.userId) {
    let currentRoom;

    // Start a chat room
    socket.on('start-chat', async (data, callback) => {
      // if sender is authorized then join the room
      if (verifiedUser.id === data.senderId) {
        if (currentRoom) socket.leave(currentRoom); // leave current room on joining a new one

        currentRoom = data.roomId;
        socket.join(data.roomId);

        // send previous chat message as response to client
        const roomDb = await Chat.findOne({ room: currentRoom });
        callback({
          prevChats: roomDb?.messages,
        });
      } else {
        socket.emit('error', {
          type: 'auth-error',
          message: 'Not authorized to join room',
        });
        console.error('Not authorized to join room');
      }
    });

    // Listen for new messages, store in db and forward to receiver
    socket.on('send', async (data, callback) => {
      if (!currentRoom) {
        socket.emit('error', {
          type: 'room-error',
          message: 'No room selected',
        });
        console.error('No room selected');
        return;
      }
    
      try {
        // Tạo object message chuẩn hóa
        const newMessage = {
          sender: data.sender,
          receiver: data.receiver,
          message: data.message,
          attachment: data.attachment || null,
          originalName: data.originalName || null,
          mimeType: data.mimeType || null,
          sentAt: new Date(),
        };
    
        // Lưu vào MongoDB
        await Chat.findOneAndUpdate(
          { room: currentRoom },
          {
            $push: { messages: newMessage },
            $set: { activity: { lastMessage: newMessage, status: 'sent' } },
          },
          { upsert: true }
        );
    
        // Emit cho các client khác
        socket.to(currentRoom).emit('receive', newMessage);
    
        // Callback xác nhận
        callback({ sent: true });
        
        // Update activity
        io.emit(`${currentRoom}-activity`);
      } catch (err) {
        socket.emit('error', {
          type: 'send-error',
          message: 'Error sending message.',
        });
        console.error(err);
      }
    });
    

    // Custom event to return room activity or update on seen messages
    socket.on('room-activity-request', async (roomId, reqType, callback) => {
      const room = await Chat.findOne({ room: roomId });

      if (reqType === 'fetch') {
        callback({ roomActivity: room?.activity });
      }

      if (reqType === 'mark-seen' && room) {
        room.activity.status = 'seen';
        room.save();
        socket.to(roomId).emit('room-activity-updated', room?.activity);
      }
    });

    // When a user add a friend, check if that friend is currently online and then emit an event to update its friend list
    socket.on('add-friend', (data) => {
      let friendSocket;
      // Find the the added friends is online
      io.sockets.sockets.forEach((s) => {
        if (s.handshake.auth.userId === data) {
          friendSocket = s;
        }
      });
      // then emit event to that friend to update its friends asynchronously
      friendSocket?.emit('update-friends');
    });
  } else {
    socket.emit('error', {
      type: 'auth-error',
      message: 'Not Authorized, Login with valid credentials',
    });
    console.error('Not Authorized, Login with valid credentials');
  }

  // Emit all online users on a socket connection/disconnection
  io.emit('online-users-updated', getOnlineUsers());
  socket.on('disconnect', () => {
    io.emit('online-users-updated', getOnlineUsers());
  });
});

const getOnlineUsers = () => {
  let onlineUsers = [];

  io.sockets.sockets.forEach((socket) =>
    onlineUsers.push(socket.handshake.auth.userId)
  );

  return onlineUsers;
};

// Server startup
const port = process.env.PORT || 5000;
httpServer.listen(port, async () => {
  console.log('sever running on port ' + port);
  // MongoDB connection
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log('connected to mongodb');
    })
    .catch((err) => console.error(err));

    console.log('server running on port ' + port);
    // 🔥 Test kết nối Firebase Storage
    try {
      const [files] = await bucket.getFiles({ maxResults: 1 });
      console.log('Connected to Firebase Storage. Sample file:', files[0]?.name || 'No files found.');
    } catch (error) {
      console.error('Failed to connect to Firebase Storage:', error);
    }
  
    
});

app.get('/file', async (req, res) => {
	 // const { filename } = req.query;
	let { filename } = req.query;

// Nếu filename là 1 URL firebase thì cần extract tên file đúng
if (filename.includes('firebasestorage.googleapis.com')) {
  try {
    const decodedUrl = decodeURIComponent(filename);
    const start = decodedUrl.indexOf('/o/') + 3;
    const end = decodedUrl.indexOf('?alt=');
    if (start !== -1 && end !== -1) {
      filename = decodedUrl.substring(start, end);
    }
  } catch (error) {
    console.error('Error extracting filename on server:', error);
    return res.status(400).json({ message: 'Invalid filename' });
  }
}


  if (!filename) {
    return res.status(400).json({ message: 'Filename is required' });
  }

  const file = bucket.file(filename);

  try {
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000,
    });

    res.json({ url });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({ message: 'Failed to generate signed URL' });
  }
});
