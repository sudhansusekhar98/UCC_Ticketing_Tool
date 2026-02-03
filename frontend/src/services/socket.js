import { io } from 'socket.io-client';

// Use environment variable for API URL, removing '/api' suffix for socket connection
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = API_URL.replace('/api', '');

// Check if we're on a serverless platform that doesn't support WebSockets
const isServerlessPlatform = () => {
    const hostname = window.location.hostname;
    // Vercel, Netlify, and similar platforms don't support persistent WebSocket connections
    // Also includes custom domains hosted on Vercel
    return hostname.includes('vercel.app') ||
        hostname.includes('netlify.app') ||
        hostname.includes('amplifyapp.com') ||
        hostname.includes('vluccc.com') ||  
        hostname.includes('ticketops') ||    
        import.meta.env.VITE_DISABLE_WEBSOCKET === 'true';
};

// Environment flag to completely disable socket (useful for serverless deployments)
const SOCKET_ENABLED = !isServerlessPlatform();

class SocketService {
    socket = null;
    isConnected = false;
    reconnectAttempts = 0;
    maxReconnectAttempts = 3; // Reduced attempts for faster fallback
    connectionTimeout = null;
    isDisabled = false;

    constructor() {
        // Disable socket on serverless platforms
        if (!SOCKET_ENABLED) {
            this.isDisabled = true;
            console.log('[Socket] WebSocket disabled on serverless platform - using HTTP polling for updates');
        }
    }

    connect() {
        // Skip connection on serverless platforms
        if (this.isDisabled) {
            console.log('[Socket] Skipping connection - running on serverless platform');
            return null;
        }

        if (this.socket && this.isConnected) {
            return this.socket;
        }

        // Prevent multiple simultaneous connection attempts
        if (this.socket && this.socket.connecting) {
            return this.socket;
        }

        try {
            this.socket = io(SOCKET_URL, {
                transports: ['websocket'], // Try WebSocket first
                upgrade: true, // Allow upgrade from polling if needed
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: 2000,
                reconnectionDelayMax: 10000,
                timeout: 10000, // Connection timeout
                autoConnect: true,
            });

            this.socket.on('connect', () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                console.log('[Socket] Connected:', this.socket.id);
            });

            this.socket.on('disconnect', (reason) => {
                this.isConnected = false;
                console.log('[Socket] Disconnected:', reason);

                // If server closed the connection, don't aggressively retry
                if (reason === 'io server disconnect' || reason === 'transport close') {
                    this.handlePermanentDisconnect();
                }
            });

            this.socket.on('connect_error', (error) => {
                this.reconnectAttempts++;
                console.warn(`[Socket] Connection error (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}):`, error.message);

                // After max attempts, disable socket to prevent console spam
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    this.handlePermanentDisconnect();
                }
            });

            this.socket.on('reconnect_failed', () => {
                console.warn('[Socket] Reconnection failed - switching to polling mode');
                this.handlePermanentDisconnect();
            });

        } catch (error) {
            console.error('[Socket] Failed to initialize:', error);
            this.isDisabled = true;
        }

        return this.socket;
    }

    handlePermanentDisconnect() {
        console.log('[Socket] WebSocket not available - real-time updates disabled');
        console.log('[Socket] App will use HTTP polling for updates instead');
        this.isDisabled = true;
        this.disconnect();
    }

    disconnect() {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
    }

    getSocket() {
        return this.socket;
    }

    isSocketEnabled() {
        return !this.isDisabled && this.isConnected;
    }

    // Join a specific ticket room for targeted updates
    joinTicketRoom(ticketId) {
        if (this.socket && this.isConnected) {
            this.socket.emit('join:ticket', ticketId);
        }
    }

    // Leave a ticket room
    leaveTicketRoom(ticketId) {
        if (this.socket && this.isConnected) {
            this.socket.emit('leave:ticket', ticketId);
        }
    }

    // Join user room for user-specific notifications
    joinUserRoom(userId) {
        if (this.socket && this.isConnected) {
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
