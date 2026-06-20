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
                status: { $nin: ['Closed', 'Resolved', 'Cancelled', 'Verified'] },
                slaRestoreDue: { $lt: warningThreshold, $gt: now },
                isBreachWarningSent: { $ne: true },
                assignedTo: { $exists: true, $ne: null },
                $or: [{ rmaId: { $exists: false } }, { rmaId: null }, { rmaFinalized: true }]
            }).populate('assignedTo', 'fullName email').limit(200).lean();
            console.log(`   Found ${ticketsToWarn.length} tickets to warn.`);

            const warnedIds = [];
            for (const ticket of ticketsToWarn) {
                if (ticket.assignedTo?.email) {
                    const sent = await sendBreachWarningEmail(ticket, ticket.assignedTo);
                    if (sent) warnedIds.push(ticket._id);
                }
            }
            if (warnedIds.length > 0) {
                await Ticket.updateMany({ _id: { $in: warnedIds } }, { $set: { isBreachWarningSent: true } });
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
                status: { $nin: ['Closed', 'Resolved', 'Cancelled', 'Verified'] },
                slaRestoreDue: { $lt: now },
                isSlaBreachedNotificationSent: { $ne: true },
                assignedTo: { $exists: true, $ne: null },
                $or: [{ rmaId: { $exists: false } }, { rmaId: null }, { rmaFinalized: true }]
            }).populate('assignedTo', 'fullName email').limit(200).lean();

            if (breachedTickets.length > 0) {
                console.log(`   Found ${breachedTickets.length} newly breached tickets.`);

                const admins = await User.find({ role: 'Admin', isActive: true }).select('fullName email').lean();

                const breachedIds = [];
                for (const ticket of breachedTickets) {
                    const sent = await sendSlaBreachedEmail(ticket, ticket.assignedTo, admins);
                    if (sent) breachedIds.push(ticket._id);
                }
                if (breachedIds.length > 0) {
                    await Ticket.updateMany(
                        { _id: { $in: breachedIds } },
                        { $set: { isSlaBreachedNotificationSent: true, isSLARestoreBreached: true } }
                    );
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
            }).populate('assignedPM', 'name email').lean();

            if (activeProjects.length === 0) {
                console.log('   No active projects found.');
                return;
            }

            console.log(`   Checking ${activeProjects.length} active projects...`);

            // Batch-fetch all today's logs in one query instead of one per project
            const projectIds = activeProjects.map(p => p._id);
            const todayLogs = await PMDailyLog.find({
                projectId: { $in: projectIds },
                logDate: { $gte: todayStart }
            }).select('projectId submittedBy').lean();

            // Build a set of "projectId:pmId" keys that have submitted
            const submittedSet = new Set(
                todayLogs.map(log => `${log.projectId}:${log.submittedBy}`)
            );

            for (const project of activeProjects) {
                if (!project.assignedPM || !project.assignedPM.email) {
                    continue;
                }

                const key = `${project._id}:${project.assignedPM._id}`;
                if (!submittedSet.has(key)) {
                    console.log(`   Sending reminder to ${project.assignedPM.name} for project ${project.projectNumber}`);

                    try {
                        await sendGeneralNotificationEmail(
                            project.assignedPM.email,
                            'Daily Log Reminder',
                            `Hi ${project.assignedPM.name},\n\nThis is a reminder to submit your daily end-of-day log for project "${project.projectName}" (${project.projectNumber}).\n\nPlease submit your log before the end of the day.\n\nThank you.`
                        );
                    } catch (emailErr) {
                        console.error(`   Failed to send email to ${project.assignedPM.email}:`, emailErr.message);
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
