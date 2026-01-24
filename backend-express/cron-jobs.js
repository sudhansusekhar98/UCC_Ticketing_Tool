import cron from 'node-cron';
import Ticket from './models/Ticket.model.js';
import User from './models/User.model.js';
import { sendBreachWarningEmail, sendSlaBreachedEmail } from './utils/email.utils.js';

// Setup Cron Jobs
export const setupCronJobs = () => {
    console.log('⏰ Initializing Cron Jobs...');

    // 1. Pre-Breach Warning Job
    // Checks every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
        // Only run during office hours (9 AM to 6 PM)
        const now = new Date();
        const currentHour = now.getHours();

        if (currentHour < 9 || currentHour >= 18) {
            return; // Skip outside office hours
        }

        console.log('⏰ Running Pre-Breach Warning Check...');

        try {
            // Find active tickets approaching breach
            // active: not closed/resolved/cancelled
            // approaching: due in < 4 hours
            // not notified yet: isBreachWarningSent = false

            const warningThreshold = new Date(now.getTime() + 4 * 60 * 60 * 1000); // Now + 4 hours

            const ticketsToWarn = await Ticket.find({
                status: { $nin: ['Closed', 'Resolved', 'Cancelled', 'Verified'] },
                slaRestoreDue: { $lt: warningThreshold, $gt: now }, // Due within next 4 hours
                isBreachWarningSent: { $ne: true },
                assignedTo: { $exists: true, $ne: null }
            }).populate('assignedTo');
            console.log(`   Found ${ticketsToWarn.length} tickets to warn.`);

            for (const ticket of ticketsToWarn) {
                if (ticket.assignedTo && ticket.assignedTo.email) {
                    const sent = await sendBreachWarningEmail(ticket, ticket.assignedTo);
                    if (sent) {
                        ticket.isBreachWarningSent = true;
                        await ticket.save();
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error in Pre-Breach Warning Cron:', error);
        }
    });

    // 2. SLA Breach Notification Job
    // Checks every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
        console.log('⏰ Running SLA Breach Check...');
        const now = new Date();

        try {
            // Find tickets that have JUST breached (or breached recently but not notified)
            // breached: due < now
            // not notified: isSlaBreachedNotificationSent = false

            const breachedTickets = await Ticket.find({
                status: { $nin: ['Closed', 'Resolved', 'Cancelled', 'Verified'] },
                slaRestoreDue: { $lt: now },
                isSlaBreachedNotificationSent: { $ne: true },
                assignedTo: { $exists: true, $ne: null }
            }).populate('assignedTo');

            if (breachedTickets.length > 0) {
                console.log(`   Found ${breachedTickets.length} newly breached tickets.`);

                // Fetch admins once
                const admins = await User.find({ role: 'Admin', isActive: true });

                for (const ticket of breachedTickets) {
                    // Notify logic
                    const sent = await sendSlaBreachedEmail(ticket, ticket.assignedTo, admins);

                    if (sent) {
                        ticket.isSlaBreachedNotificationSent = true;
                        // Ensure SLA tracking flag is also set
                        if (!ticket.isSLARestoreBreached) {
                            ticket.isSLARestoreBreached = true;
                        }
                        await ticket.save();
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error in SLA Breach Check Cron:', error);
        }
    });
};
