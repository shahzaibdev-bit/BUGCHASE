import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: Server;

export const initSocket = (server: HttpServer) => {
    const allowedOrigins = new Set([
        'http://localhost:3000',
        'http://localhost:5173',
        'https://bugchase-client.vercel.app',
    ]);
    if (process.env.CLIENT_URL) {
        process.env.CLIENT_URL.split(',')
            .map((origin) => origin.trim().replace(/\/$/, ''))
            .filter(Boolean)
            .forEach((origin) => allowedOrigins.add(origin));
    }

    io = new Server(server, {
        cors: {
            origin(origin, callback) {
                if (!origin) return callback(null, true);

                const normalizedOrigin = origin.replace(/\/$/, '');
                const isAllowed =
                    allowedOrigins.has(normalizedOrigin) ||
                    /^https:\/\/bugchase-client-[a-z0-9-]+\.vercel\.app$/i.test(normalizedOrigin);

                if (isAllowed) return callback(null, true);
                return callback(new Error(`CORS blocked origin: ${origin}`));
            },
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
