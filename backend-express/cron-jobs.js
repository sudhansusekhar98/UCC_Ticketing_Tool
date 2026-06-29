import cron from 'node-cron';
import Ticket from './models/Ticket.model.js';
import User from './models/User.model.js';
import Project from './models/Project.model.js';
import PMDailyLog from './models/PMDailyLog.model.js';
import { sendBreachWarningEmail, sendSlaBreachedEmail, sendGeneralNotificationEmail } from './utils/email.utils.js';
import { createSystemNotification } from './controllers/notification.controller.js';

// Setup Cron Jobs
export const setupCronJobs = (io) => {
    console.log('⏰ Initializing Cron Jobs...');

    // 1a. SLA Warning — 4 hours before breach (first reminder)
    // 1b. SLA Warning — 1 hour before breach (final reminder)
    // Both check every 10 minutes, 24/7 (no office-hours gate — VPS timezone may differ)
    cron.schedule('*/10 * * * *', async () => {
        const now = new Date();
        const in4h = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        const in1h = new Date(now.getTime() + 1 * 60 * 60 * 1000);

        const ACTIVE_STATUSES = { $nin: ['Closed', 'Resolved', 'Cancelled', 'Verified'] };
        const NO_ACTIVE_RMA = { $or: [{ rmaId: { $exists: false } }, { rmaId: null }, { rmaFinalized: true }] };

        try {
            // ── 4-hour warning ────────────────────────────────────────────────
            const tickets4h = await Ticket.find({
                status: ACTIVE_STATUSES,
                slaRestoreDue: { $lt: in4h, $gt: now },
                isBreachWarningSent: { $ne: true },
                assignedTo: { $exists: true, $ne: null },
                ...NO_ACTIVE_RMA
            }).populate('assignedTo', 'fullName email _id').limit(200).lean();

            if (tickets4h.length) {
                console.log(`⏰ SLA 4h Warning: ${tickets4h.length} ticket(s)`);
                // Get supervisors & dispatchers to CC
                const supervisors = await User.find({ role: { $in: ['Supervisor', 'Dispatcher'] }, isActive: true }).select('fullName email _id').lean();

                const warned4hIds = [];
                for (const ticket of tickets4h) {
                    const minutesLeft = Math.round((new Date(ticket.slaRestoreDue) - now) / 60000);
                    const sent = await sendBreachWarningEmail(ticket, ticket.assignedTo, minutesLeft);
                    if (sent) {
                        warned4hIds.push(ticket._id);
                        // Notify supervisors by email
                        for (const sup of supervisors) {
                            await sendBreachWarningEmail(ticket, sup, minutesLeft).catch(() => {});
                        }
                        // In-app notification to assigned engineer
                        if (io && ticket.assignedTo?._id) {
                            await createSystemNotification(io, {
                                userId: ticket.assignedTo._id,
                                title: '⚠️ SLA Warning — 4 Hours',
                                message: `Ticket ${ticket.ticketNumber} breaches SLA in ~${minutesLeft} min. Please act now.`,
                                type: 'warning',
                                link: `/tickets/${ticket._id}`
                            });
                        }
                    }
                }
                if (warned4hIds.length) {
                    await Ticket.updateMany({ _id: { $in: warned4hIds } }, { $set: { isBreachWarningSent: true } });
                }
            }

            // ── 1-hour final warning ──────────────────────────────────────────
            const tickets1h = await Ticket.find({
                status: ACTIVE_STATUSES,
                slaRestoreDue: { $lt: in1h, $gt: now },
                slaWarning1hSent: { $ne: true },
                assignedTo: { $exists: true, $ne: null },
                ...NO_ACTIVE_RMA
            }).populate('assignedTo', 'fullName email _id').limit(200).lean();

            if (tickets1h.length) {
                console.log(`⏰ SLA 1h Warning: ${tickets1h.length} ticket(s)`);
                const admins = await User.find({ role: { $in: ['Admin', 'Supervisor'] }, isActive: true }).select('fullName email _id').lean();

                const warned1hIds = [];
                for (const ticket of tickets1h) {
                    const minutesLeft = Math.round((new Date(ticket.slaRestoreDue) - now) / 60000);
                    const sent = await sendBreachWarningEmail(ticket, ticket.assignedTo, minutesLeft);
                    if (sent) {
                        warned1hIds.push(ticket._id);
                        // Alert admins at 1-hour mark too
                        for (const admin of admins) {
                            await sendBreachWarningEmail(ticket, admin, minutesLeft).catch(() => {});
                        }
                        // Urgent in-app notification
                        if (io && ticket.assignedTo?._id) {
                            await createSystemNotification(io, {
                                userId: ticket.assignedTo._id,
                                title: '🚨 SLA Critical — 1 Hour Left',
                                message: `Ticket ${ticket.ticketNumber} breaches SLA in ~${minutesLeft} min. Immediate action required!`,
                                type: 'error',
                                link: `/tickets/${ticket._id}`
                            });
                        }
                    }
                }
                if (warned1hIds.length) {
                    await Ticket.updateMany({ _id: { $in: warned1hIds } }, { $set: { slaWarning1hSent: true } });
                }
            }
        } catch (error) {
            console.error('❌ Error in SLA Warning Cron:', error);
        }
    });

    // 2. SLA Breach Notification Job — checks every 10 minutes, 24/7
    cron.schedule('*/10 * * * *', async () => {
        const now = new Date();

        try {
            const breachedTickets = await Ticket.find({
                status: { $nin: ['Closed', 'Resolved', 'Cancelled', 'Verified'] },
                slaRestoreDue: { $lt: now },
                isSlaBreachedNotificationSent: { $ne: true },
                $or: [{ rmaId: { $exists: false } }, { rmaId: null }, { rmaFinalized: true }]
            }).populate('assignedTo', 'fullName email _id').limit(200).lean();

            if (breachedTickets.length) {
                console.log(`⏰ SLA Breach: ${breachedTickets.length} newly breached ticket(s)`);
                const admins = await User.find({ role: { $in: ['Admin', 'Supervisor'] }, isActive: true }).select('fullName email _id').lean();

                const breachedIds = [];
                for (const ticket of breachedTickets) {
                    const sent = await sendSlaBreachedEmail(ticket, ticket.assignedTo, admins);
                    if (sent) {
                        breachedIds.push(ticket._id);
                        // In-app notification to assigned engineer
                        if (io && ticket.assignedTo?._id) {
                            await createSystemNotification(io, {
                                userId: ticket.assignedTo._id,
                                title: '🚨 SLA BREACHED',
                                message: `Ticket ${ticket.ticketNumber} has breached its SLA deadline. Immediate escalation required.`,
                                type: 'error',
                                link: `/tickets/${ticket._id}`
                            });
                        }
                        // In-app notification to admins
                        for (const admin of admins) {
                            if (io && admin._id) {
                                await createSystemNotification(io, {
                                    userId: admin._id,
                                    title: '🚨 SLA BREACHED — Admin Alert',
                                    message: `Ticket ${ticket.ticketNumber} has breached SLA. Assigned to: ${ticket.assignedTo?.fullName || 'Unassigned'}.`,
                                    type: 'error',
                                    link: `/tickets/${ticket._id}`
                                }).catch(() => {});
                            }
                        }
                    }
                }
                if (breachedIds.length) {
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
