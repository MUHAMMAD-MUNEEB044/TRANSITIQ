// Holds the Socket.IO server instance so any module can broadcast without
// importing server.js (which created a circular dependency).
let ioInstance = null;

export const setIO = (io) => {
  ioInstance = io;
};

export const getIO = () => ioInstance;
