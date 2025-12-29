import * as signalR from '@microsoft/signalr';

class SignalRService {
    constructor() {
        this.connection = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    async start(accessToken) {
        if (this.connection) {
            await this.stop();
        }

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl('http://localhost:5119/hubs/tickets', {
                accessTokenFactory: () => accessToken,
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
            .configureLogging(signalR.LogLevel.Information)
            .build();

        this.connection.onreconnecting((error) => {
            console.log('SignalR Reconnecting...', error);
        });

        this.connection.onreconnected((connectionId) => {
            console.log('SignalR Reconnected:', connectionId);
            this.reconnectAttempts = 0;
        });

        this.connection.onclose((error) => {
            console.log('SignalR Connection closed:', error);
            this.handleReconnect();
        });

        try {
            await this.connection.start();
            console.log('SignalR Connected');
            this.reconnectAttempts = 0;
            return true;
        } catch (error) {
            console.error('SignalR Connection failed:', error);
            return false;
        }
    }

    async stop() {
        if (this.connection) {
            await this.connection.stop();
            this.connection = null;
        }
    }

    async handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            console.log(`Attempting to reconnect in ${delay}ms...`);
            setTimeout(async () => {
                const token = localStorage.getItem('accessToken');
                if (token) {
                    await this.start(token);
                }
            }, delay);
        }
    }

    // Event handlers
    onTicketCreated(callback) {
        if (this.connection) {
            this.connection.on('TicketCreated', callback);
        }
    }

    onTicketUpdated(callback) {
        if (this.connection) {
            this.connection.on('TicketUpdated', callback);
        }
    }

    onTicketAssigned(callback) {
        if (this.connection) {
            this.connection.on('TicketAssigned', callback);
        }
    }

    onTicketResolved(callback) {
        if (this.connection) {
            this.connection.on('TicketResolved', callback);
        }
    }

    onDirectNotification(callback) {
        if (this.connection) {
            this.connection.on('DirectNotification', callback);
        }
    }

    // Join site-specific group
    async joinSiteGroup(siteId) {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            await this.connection.invoke('JoinSiteGroup', siteId);
        }
    }

    async leaveSiteGroup(siteId) {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            await this.connection.invoke('LeaveSiteGroup', siteId);
        }
    }

    isConnected() {
        return this.connection?.state === signalR.HubConnectionState.Connected;
    }
}

const signalRService = new SignalRService();
export default signalRService;
