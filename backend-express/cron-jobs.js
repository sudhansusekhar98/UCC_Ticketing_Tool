import cron from 'node-cron';
import Ticket from './models/Ticket.model.js';
import User from './models/User.model.js';
import Project from './models/Project.model.js';
import PMDailyLog from './models/PMDailyLog.model.js';
import TicketActivity from './models/TicketActivity.model.js';
import { sendBreachWarningEmail, sendSlaBreachedEmail, sendGeneralNotificationEmail, sendSlaOverdueReminderEmail } from './utils/email.utils.js';
import { createSystemNotification } from './controllers/notification.controller.js';
import { resolveSlaPolicy, isAutoEscalationEnabled } from './utils/sla.utils.js';

// Turns "a@x.com, b@y.com" into [{ email: 'a@x.com', fullName: 'Escalation Contact' }, ...]
const parseEscalationEmails = (raw) => (raw || '')
    .split(/[,;]/)
    .map(e => e.trim())
    .filter(Boolean)
    .map(email => ({ email, fullName: 'Escalation Contact' }));

// Setup Cron Jobs
export const setupCronJobs = (io) => {
    console.log('⏰ Initializing Cron Jobs...');

    // 1a. SLA Warning - Level 1 (first reminder, per-priority/site escalationLevel1Minutes before breach)
    // 1b. SLA Warning - Level 2 (final reminder, per-priority/site escalationLevel2Minutes before breach)
    // Thresholds come from Settings → Global Default SLA (or a site's SLA override), not hardcoded.
    // Both check every 10 minutes, 24/7 (no office-hours gate - VPS timezone may differ)
    cron.schedule('*/10 * * * *', async () => {
        const now = new Date();
        const in4h = new Date(now.getTime() + 4 * 60 * 60 * 1000);

        const ACTIVE_STATUSES = { $nin: ['Closed', 'Resolved', 'Cancelled', 'Verified', 'OnHold'] };
        const NO_ACTIVE_RMA = { $or: [{ rmaId: { $exists: false } }, { rmaId: null }, { rmaFinalized: true }] };

        try {
            // ── Auto-update At Risk flag ──────────────────────────────────────
            // Mark tickets as At Risk when slaRestoreDue is within 4 hours (fixed visual indicator, independent of escalation config)
            const atRiskResult = await Ticket.updateMany(
                {
                    status: ACTIVE_STATUSES,
                    slaRestoreDue: { $lte: in4h, $gt: now },
                    isSLARestoreBreached: { $ne: true },
                    isSLAResponseBreached: { $ne: true }
                },
                { $set: { isSLAResponseBreached: true } }
            );
            if (atRiskResult.modifiedCount > 0) {
                console.log(`⏰ SLA At Risk: marked ${atRiskResult.modifiedCount} ticket(s) as At Risk`);
            }

            // Clear At Risk flag for tickets that are back on track (e.g. SLA extended / priority changed)
            await Ticket.updateMany(
                {
                    status: ACTIVE_STATUSES,
                    slaRestoreDue: { $gt: in4h },
                    isSLARestoreBreached: { $ne: true },
                    isSLAResponseBreached: true
                },
                { $set: { isSLAResponseBreached: false } }
            );

            // Escalation warnings are gated by the "Enable Auto-Escalation" setting
            if (!(await isAutoEscalationEnabled())) return;

            // Wide net: pull any active ticket due within 24h, then apply each ticket's own escalation
            // thresholds (site override → global SLAPolicy → defaults) instead of one hardcoded window.
            const maxLookahead = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const candidates = await Ticket.find({
                status: ACTIVE_STATUSES,
                slaRestoreDue: { $lt: maxLookahead, $gt: now },
                assignedTo: { $exists: true, $ne: null },
                $or: [{ isBreachWarningSent: { $ne: true } }, { slaWarning1hSent: { $ne: true } }],
                ...NO_ACTIVE_RMA
            }).populate('assignedTo', 'fullName email _id').limit(300).lean();

            if (!candidates.length) return;

            const supervisors = await User.find({ role: { $in: ['Supervisor', 'Dispatcher'] }, isActive: true }).select('fullName email _id').lean();
            const admins = await User.find({ role: { $in: ['Admin', 'Supervisor'] }, isActive: true }).select('fullName email _id').lean();

            const warnedL1Ids = [];
            const warnedL2Ids = [];

            for (const ticket of candidates) {
                const policy = await resolveSlaPolicy(ticket.priority, ticket.siteId);
                const minutesLeft = Math.round((new Date(ticket.slaRestoreDue) - now) / 60000);

                if (!ticket.isBreachWarningSent && minutesLeft <= policy.escalationLevel1Minutes) {
                    const sent = await sendBreachWarningEmail(ticket, ticket.assignedTo, minutesLeft);
                    if (sent) {
                        warnedL1Ids.push(ticket._id);
                        for (const sup of supervisors) {
                            await sendBreachWarningEmail(ticket, sup, minutesLeft).catch(() => {});
                        }
                        for (const contact of parseEscalationEmails(policy.escalationL1Emails)) {
                            await sendBreachWarningEmail(ticket, contact, minutesLeft).catch(() => {});
                        }
                        if (io && ticket.assignedTo?._id) {
                            await createSystemNotification(io, {
                                userId: ticket.assignedTo._id,
                                title: '⚠️ SLA Warning',
                                message: `Ticket ${ticket.ticketNumber} breaches SLA in ~${minutesLeft} min. Please act now.`,
                                type: 'warning',
                                link: `/tickets/${ticket._id}`
                            });
                        }
                    }
                }

                if (!ticket.slaWarning1hSent && minutesLeft <= policy.escalationLevel2Minutes) {
                    const sent = await sendBreachWarningEmail(ticket, ticket.assignedTo, minutesLeft);
                    if (sent) {
                        warnedL2Ids.push(ticket._id);
                        for (const admin of admins) {
                            await sendBreachWarningEmail(ticket, admin, minutesLeft).catch(() => {});
                        }
                        for (const contact of parseEscalationEmails(policy.escalationL2Emails)) {
                            await sendBreachWarningEmail(ticket, contact, minutesLeft).catch(() => {});
                        }
                        if (io && ticket.assignedTo?._id) {
                            await createSystemNotification(io, {
                                userId: ticket.assignedTo._id,
                                title: '🚨 SLA Critical',
                                message: `Ticket ${ticket.ticketNumber} breaches SLA in ~${minutesLeft} min. Immediate action required!`,
                                type: 'error',
                                link: `/tickets/${ticket._id}`
                            });
                        }
                    }
                }
            }

            if (warnedL1Ids.length) {
                console.log(`⏰ SLA Level 1 Warning: ${warnedL1Ids.length} ticket(s)`);
                await Ticket.updateMany({ _id: { $in: warnedL1Ids } }, { $set: { isBreachWarningSent: true } });
            }
            if (warnedL2Ids.length) {
                console.log(`⏰ SLA Level 2 Warning: ${warnedL2Ids.length} ticket(s)`);
                await Ticket.updateMany({ _id: { $in: warnedL2Ids } }, { $set: { slaWarning1hSent: true } });
            }
        } catch (error) {
            console.error('❌ Error in SLA Warning Cron:', error);
        }
    });

    // 2. SLA Breach Notification Job - checks every 10 minutes, 24/7
    cron.schedule('*/10 * * * *', async () => {
        const now = new Date();

        try {
            const breachedTickets = await Ticket.find({
                status: { $nin: ['Closed', 'Resolved', 'Cancelled', 'Verified', 'OnHold'] },
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
                                    title: '🚨 SLA BREACHED Admin Alert',
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

                    // Log SLA breach as an activity entry on each ticket's timeline
                    const activityDocs = breachedTickets
                        .filter(t => breachedIds.some(id => String(id) === String(t._id)))
                        .map(ticket => {
                            const due = new Date(ticket.slaRestoreDue);
                            const dueStr = due.toLocaleString('en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit', hour12: false
                            });
                            return {
                                ticketId: ticket._id,
                                activityType: 'SLABreach',
                                isSystem: true,
                                content: `SLA breached. Resolution target was ${dueStr}. This ticket has exceeded its SLA deadline and requires immediate attention.`
                            };
                        });
                    if (activityDocs.length) {
                        await TicketActivity.insertMany(activityDocs).catch(err =>
                            console.error('Failed to log SLA breach activities:', err)
                        );
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error in SLA Breach Check Cron:', error);
        }
    });

    // 3. SLA Overdue Reminder - every 15 min, only within 10:00-19:00 IST, throttled to 3h per ticket.
    // Skips tickets with a pending SLA extension request (don't nag while it's under review).
    cron.schedule('*/15 * * * *', async () => {
        const now = new Date();
        const istHour = parseInt(
            new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(now),
            10
        );
        if (istHour < 10 || istHour >= 19) return;

        const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

        try {
            const dueTickets = await Ticket.find({
                status: { $nin: ['Closed', 'Resolved', 'Cancelled', 'Verified', 'OnHold'] },
                isSLARestoreBreached: true,
                'slaExtension.status': { $ne: 'Pending' },
                $or: [{ rmaId: { $exists: false } }, { rmaId: null }, { rmaFinalized: true }],
                $and: [
                    { $or: [{ lastSlaReminderSentAt: null }, { lastSlaReminderSentAt: { $lte: threeHoursAgo } }] }
                ]
            }).populate('assignedTo', 'fullName email _id').limit(200).lean();

            if (dueTickets.length) {
                const remindedIds = [];
                for (const ticket of dueTickets) {
                    if (!ticket.assignedTo?.email) continue;
                    const sent = await sendSlaOverdueReminderEmail(ticket, ticket.assignedTo);
                    if (sent) {
                        remindedIds.push(ticket._id);
                        if (io) {
                            await createSystemNotification(io, {
                                userId: ticket.assignedTo._id,
                                title: '⏰ SLA Still Overdue',
                                message: `Ticket ${ticket.ticketNumber} is past its SLA deadline. Please update it or request an extension.`,
                                type: 'error',
                                link: `/tickets/${ticket._id}`
                            }).catch(() => {});
                        }
                    }
                }
                if (remindedIds.length) {
                    await Ticket.updateMany({ _id: { $in: remindedIds } }, { $set: { lastSlaReminderSentAt: now } });
                    console.log(`⏰ SLA Reminder: ${remindedIds.length} ticket(s) reminded`);
                }
            }
        } catch (error) {
            console.error('❌ Error in SLA Reminder Cron:', error);
        }
    });

    // 4. PM Daily Log Reminder Job
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

    // 5. Auto-Lock PM Daily Logs after 24 hours
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
