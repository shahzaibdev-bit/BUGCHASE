import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: Server;

export const initSocket = (server: HttpServer) => {
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://bugchase-client.vercel.app'
    ];
    if (process.env.CLIENT_URL && !allowedOrigins.includes(process.env.CLIENT_URL)) {
        allowedOrigins.push(process.env.CLIENT_URL);
    }

    io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on('connection', (socket: Socket) => {
        console.log(`[Socket] A user connected: ${socket.id}`);

        socket.on('join_report', (reportId: string) => {
            if (reportId) {
                socket.join(reportId);
                console.log(`[Socket] User ${socket.id} joined room: ${reportId}`);
            }
        });

        socket.on('leave_report', (reportId: string) => {
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

export const getIO = (): Server => {
    if (!io) {
        throw new Error('Socket.io is not initialized. Call initSocket() first.');
    }
    return io;
};
