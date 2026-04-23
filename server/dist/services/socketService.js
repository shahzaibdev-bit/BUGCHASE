"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
let io;
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });
    io.on('connection', (socket) => {
        console.log(`[Socket] A user connected: ${socket.id}`);
        socket.on('join_report', (reportId) => {
            if (reportId) {
                socket.join(reportId);
                console.log(`[Socket] User ${socket.id} joined room: ${reportId}`);
            }
        });
        socket.on('leave_report', (reportId) => {
            if (reportId) {
                socket.leave(reportId);
                console.log(`[Socket] User ${socket.id} left room: ${reportId}`);
            }
        });
        socket.on('disconnect', () => {
            console.log(`[Socket] A user disconnected: ${socket.id}`);
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io is not initialized. Call initSocket() first.');
    }
    return io;
};
exports.getIO = getIO;
