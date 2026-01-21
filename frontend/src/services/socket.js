import { io } from 'socket.io-client';

// Use environment variable for API URL, removing '/api' suffix for socket connection
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = API_URL.replace('/api', '');

class SocketService {
    socket = null;

    connect() {
        if (!this.socket) {
            this.socket = io(SOCKET_URL, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
            });

            this.socket.on('connect', () => {
                console.log('🔌 Socket connected:', this.socket.id);
            });

            this.socket.on('disconnect', (reason) => {
                console.log('🔌 Socket disconnected:', reason);
            });

            this.socket.on('connect_error', (error) => {
                console.error('🔌 Socket connection error:', error.message);
            });
        }
        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    getSocket() {
        return this.socket;
    }

    // Join a specific ticket room for targeted updates
    joinTicketRoom(ticketId) {
        if (this.socket) {
            this.socket.emit('join:ticket', ticketId);
        }
    }

    // Leave a ticket room
    leaveTicketRoom(ticketId) {
        if (this.socket) {
            this.socket.emit('leave:ticket', ticketId);
        }
    }

    // Join user room for user-specific notifications
    joinUserRoom(userId) {
        if (this.socket) {
            this.socket.emit('join', userId);
        }
    }

    // Subscribe to activity updates for a specific ticket
    onActivityCreated(callback) {
        if (this.socket) {
            this.socket.on('activity:created', callback);
        }
    }

    // Unsubscribe from activity updates
    offActivityCreated(callback) {
        if (this.socket) {
            this.socket.off('activity:created', callback);
        }
    }

    // Generic event listener
    on(event, callback) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    // Remove event listener
    off(event, callback) {
        if (this.socket) {
            this.socket.off(event, callback);
        }
    }
}

// Singleton instance
const socketService = new SocketService();
export default socketService;
