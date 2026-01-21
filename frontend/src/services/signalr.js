/**
 * SignalR Service - DISABLED for Express.js backend
 * 
 * The Express.js backend uses Socket.IO instead of SignalR.
 * This is a stub service to prevent frontend errors.
 * Real-time updates will be handled differently.
 */

class SignalRService {
    constructor() {
        this.connection = null;
        console.log('[SignalR] Service is disabled - using Socket.IO backend');
    }

    async start(accessToken) {
        // Do nothing - SignalR is disabled
        console.log('[SignalR] Start called but service is disabled');
        return false;
    }

    async stop() {
        // Do nothing
    }

    async handleReconnect() {
        // Do nothing
    }

    // Event handlers - no-op
    onTicketCreated(callback) {}
    onTicketUpdated(callback) {}
    onTicketAssigned(callback) {}
    onTicketResolved(callback) {}
    onDirectNotification(callback) {}

    async joinSiteGroup(siteId) {}
    async leaveSiteGroup(siteId) {}

    isConnected() {
        return false;
    }
}

const signalRService = new SignalRService();
export default signalRService;
