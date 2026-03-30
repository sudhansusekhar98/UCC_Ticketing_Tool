import cron from 'node-cron';
import Ticket from './models/Ticket.model.js';
import User from './models/User.model.js';
import Project from './models/Project.model.js';
import PMDailyLog from './models/PMDailyLog.model.js';
import { sendBreachWarningEmail, sendSlaBreachedEmail, sendGeneralNotificationEmail } from './utils/email.utils.js';
import { createSystemNotification } from './controllers/notification.controller.js';

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
            // NOTE: Skip tickets with an active (non-finalized) RMA — TAT doesn't apply during RMA

            const warningThreshold = new Date(now.getTime() + 4 * 60 * 60 * 1000); // Now + 4 hours

            const ticketsToWarn = await Ticket.find({
                $and: [
                    { status: { $nin: ['Closed', 'Resolved', 'Cancelled', 'Verified'] } },
                    { slaRestoreDue: { $lt: warningThreshold, $gt: now } },
                    { isBreachWarningSent: { $ne: true } },
                    { assignedTo: { $exists: true, $ne: null } },
                    // Exclude tickets with an active RMA (rma exists but not finalized)
                    { $or: [{ rmaId: { $exists: false } }, { rmaId: null }, { rmaFinalized: true }] }
                ]
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
            // NOTE: Skip tickets with an active (non-finalized) RMA — TAT doesn't apply during RMA

            const breachedTickets = await Ticket.find({
                $and: [
                    { status: { $nin: ['Closed', 'Resolved', 'Cancelled', 'Verified'] } },
                    { slaRestoreDue: { $lt: now } },
                    { isSlaBreachedNotificationSent: { $ne: true } },
                    { assignedTo: { $exists: true, $ne: null } },
                    // Exclude tickets with an active RMA (rma exists but not finalized)
                    { $or: [{ rmaId: { $exists: false } }, { rmaId: null }, { rmaFinalized: true }] }
                ]
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

    // 3. PM Daily Log Reminder Job
    // Runs at 7 PM (19:00) daily to remind PMs who haven't submitted their daily log
    cron.schedule('0 19 * * *', async () => {
        console.log('⏰ Running PM Daily Log Reminder Check...');
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        try {
            // Find all active projects
            const activeProjects = await Project.find({
                status: 'Active',
                isActive: true
            }).populate('assignedPM', 'name email');

            if (activeProjects.length === 0) {
                console.log('   No active projects found.');
                return;
            }

            console.log(`   Checking ${activeProjects.length} active projects...`);

            for (const project of activeProjects) {
                if (!project.assignedPM || !project.assignedPM.email) {
                    continue; // Skip projects without assigned PM
                }

                // Check if PM has submitted today's log
                const todayLog = await PMDailyLog.findOne({
                    projectId: project._id,
                    submittedBy: project.assignedPM._id,
                    logDate: { $gte: todayStart }
                });

                if (!todayLog) {
                    // PM hasn't submitted log for today - send reminder
                    console.log(`   Sending reminder to ${project.assignedPM.name} for project ${project.projectNumber}`);

                    // Send email reminder
                    try {
                        await sendGeneralNotificationEmail(
                            project.assignedPM.email,
                            'Daily Log Reminder',
                            `Hi ${project.assignedPM.name},\n\nThis is a reminder to submit your daily end-of-day log for project "${project.projectName}" (${project.projectNumber}).\n\nPlease submit your log before the end of the day.\n\nThank you.`
                        );
                    } catch (emailErr) {
                        console.error(`   Failed to send email to ${project.assignedPM.email}:`, emailErr.message);
                    }

                    // Create in-app notification (if io is available)
                    try {
                        // Note: In cron context, we might not have io available
                        // This is a best-effort notification
                    } catch (notifErr) {
                        console.error('   Failed to create in-app notification:', notifErr.message);
                    }
                }
            }

            console.log('   PM Daily Log Reminder Check completed.');
        } catch (error) {
            console.error('❌ Error in PM Daily Log Reminder Cron:', error);
        }
    });

    // 4. Auto-Lock PM Daily Logs after 24 hours
    // Runs every hour to lock logs that are older than 24 hours
    cron.schedule('0 * * * *', async () => {
        console.log('⏰ Running PM Daily Log Auto-Lock...');

        try {
            const result = await PMDailyLog.lockExpiredLogs();
            if (result.modifiedCount > 0) {
                console.log(`   Locked ${result.modifiedCount} expired daily logs.`);
            }
        } catch (error) {
            console.error('❌ Error in PM Daily Log Auto-Lock Cron:', error);
        }
    });
};
