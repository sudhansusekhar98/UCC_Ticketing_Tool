import ClientRegistration from '../models/ClientRegistration.model.js';
import User from '../models/User.model.js';
import { hashPassword } from '../utils/auth.utils.js';
import {
    sendClientSignupAlertEmail,
    sendClientApprovalEmail,
    sendClientRejectionEmail,
    sendPasswordResetEmail
} from '../utils/email.utils.js';

// Helper: generate a random temp password
const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
    let password = '';
    for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// Helper: derive a safe username from name + random suffix
const generateUsername = (fullName) => {
    const base = fullName.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '').slice(0, 20);
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${base}.${suffix}`;
};

// @desc   Submit a new client registration request
// @route  POST /api/auth/client-signup
// @access Public
export const submitClientSignup = async (req, res, next) => {
    try {
        const { fullName, email, phone, designation, siteName, message } = req.body;

        if (!fullName || !email || !phone || !designation || !siteName) {
            return res.status(400).json({
                success: false,
                message: 'Full name, email, phone, designation, and site name are required'
            });
        }

        // Prevent duplicate pending requests from the same email
        const existing = await ClientRegistration.findOne({ email, status: 'Pending' });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'A registration request with this email is already pending review'
            });
        }

        // Also check if already a registered user
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists. Please log in or contact your administrator.'
            });
        }

        const registration = await ClientRegistration.create({
            fullName,
            email,
            phone,
            designation,
            siteName,
            message: message || ''
        });

        // Fire-and-forget: email all admins
        User.find({ role: 'Admin', isActive: true }).select('email fullName').lean()
            .then(admins => {
                if (admins.length > 0) {
                    sendClientSignupAlertEmail(registration, admins.map(a => a.email)).catch(() => { });
                }
            })
            .catch(() => { });

        return res.status(201).json({
            success: true,
            message: 'Registration request submitted successfully. You will receive an email once your account is approved.'
        });
    } catch (error) {
        next(error);
    }
};

// @desc   List all client registrations (with optional ?status= filter)
// @route  GET /api/admin/client-registrations
// @access Admin
export const listClientRegistrations = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = status ? { status } : {};

        const total = await ClientRegistration.countDocuments(filter);
        const registrations = await ClientRegistration.find(filter)
            .populate('approvedBy', 'fullName')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .lean();

        return res.json({
            success: true,
            data: registrations,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc   Approve a client registration
// @route  POST /api/admin/client-registrations/:id/approve
// @access Admin
export const approveClientRegistration = async (req, res, next) => {
    try {
        const registration = await ClientRegistration.findById(req.params.id);

        if (!registration) {
            return res.status(404).json({ success: false, message: 'Registration not found' });
        }
        if (registration.status !== 'Pending') {
            return res.status(400).json({ success: false, message: `Registration is already ${registration.status}` });
        }

        // Use admin-supplied password if provided, otherwise generate one
        const tempPassword = req.body?.tempPassword?.trim() || generateTempPassword();
        const username = await (async () => {
            let uname = generateUsername(registration.fullName);
            // Ensure uniqueness
            while (await User.findOne({ username: uname })) {
                uname = generateUsername(registration.fullName);
            }
            return uname;
        })();

        const passwordHash = await hashPassword(tempPassword);

        // Create the SiteClient user
        const newUser = await User.create({
            fullName: registration.fullName,
            email: registration.email,
            username,
            passwordHash,
            role: 'SiteClient',
            mobileNumber: registration.phone,
            designation: registration.designation,
            isActive: true
        });

        // Update registration record
        registration.status = 'Approved';
        registration.approvedBy = req.user._id;
        registration.approvedAt = new Date();
        registration.userId = newUser._id;
        await registration.save();

        // Send approval email with credentials (fire-and-forget)
        sendClientApprovalEmail(registration, username, tempPassword).catch(() => { });

        return res.json({
            success: true,
            message: 'Client registration approved and account created',
            data: {
                userId: newUser._id,
                username,
                // Return temp password in API response so admin sees it in the modal
                tempPassword
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc   Reject a client registration
// @route  POST /api/admin/client-registrations/:id/reject
// @access Admin
export const rejectClientRegistration = async (req, res, next) => {
    try {
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ success: false, message: 'A rejection reason is required' });
        }

        const registration = await ClientRegistration.findById(req.params.id);

        if (!registration) {
            return res.status(404).json({ success: false, message: 'Registration not found' });
        }
        if (registration.status !== 'Pending') {
            return res.status(400).json({ success: false, message: `Registration is already ${registration.status}` });
        }

        registration.status = 'Rejected';
        registration.rejectionReason = reason;
        await registration.save();

        // Send rejection email (fire-and-forget)
        sendClientRejectionEmail(registration).catch(() => { });

        return res.json({
            success: true,
            message: 'Registration rejected'
        });
    } catch (error) {
        next(error);
    }
};

// ===================== CLIENT MANAGEMENT (CRUD) =====================

// @desc   List all SiteClient users
// @route  GET /api/client-registrations/clients
// @access Admin
export const listClients = async (req, res, next) => {
    try {
        const { search, page = 1, limit = 50 } = req.query;
        const filter = { role: 'SiteClient' };
        if (search) {
            filter.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }

        const total = await User.countDocuments(filter);
        const clients = await User.find(filter)
            .populate('siteId', 'siteName siteUniqueID')
            .populate('assignedSites', 'siteName siteUniqueID')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .lean();

        return res.json({
            success: true,
            data: clients,
            pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
        });
    } catch (error) {
        next(error);
    }
};

// @desc   Create a new SiteClient user directly (admin bypass of signup flow)
// @route  POST /api/client-registrations/clients
// @access Admin
export const createClient = async (req, res, next) => {
    try {
        const { fullName, email, phone, designation, assignedSites } = req.body;

        if (!fullName || !email) {
            return res.status(400).json({ success: false, message: 'Full name and email are required' });
        }

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({ success: false, message: 'An account with this email already exists' });
        }

        const tempPassword = req.body.tempPassword?.trim() || generateTempPassword();
        const username = await (async () => {
            let uname = generateUsername(fullName);
            while (await User.findOne({ username: uname })) {
                uname = generateUsername(fullName);
            }
            return uname;
        })();

        const passwordHash = await hashPassword(tempPassword);

        const newUser = await User.create({
            fullName,
            email: email.toLowerCase(),
            username,
            passwordHash,
            role: 'SiteClient',
            mobileNumber: phone || '',
            designation: designation || '',
            assignedSites: assignedSites || [],
            isActive: true
        });

        // Send welcome email (fire-and-forget)
        sendClientApprovalEmail({ fullName, email, siteName: 'Assigned Sites', userId: newUser._id }, username, tempPassword).catch(() => { });

        return res.status(201).json({
            success: true,
            message: 'Client account created successfully',
            data: { userId: newUser._id, username, tempPassword }
        });
    } catch (error) {
        next(error);
    }
};

// @desc   Update a SiteClient user
// @route  PUT /api/client-registrations/clients/:id
// @access Admin
export const updateClient = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || user.role !== 'SiteClient') {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        const { fullName, email, phone, designation, isActive, assignedSites } = req.body;

        if (email && email.toLowerCase() !== user.email) {
            const emailTaken = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
            if (emailTaken) {
                return res.status(409).json({ success: false, message: 'Email is already in use by another account' });
            }
            user.email = email.toLowerCase();
        }

        if (fullName !== undefined) user.fullName = fullName;
        if (phone !== undefined) user.mobileNumber = phone;
        if (designation !== undefined) user.designation = designation;
        if (isActive !== undefined) user.isActive = isActive;
        if (assignedSites !== undefined) user.assignedSites = assignedSites;

        await user.save();

        return res.json({ success: true, message: 'Client updated successfully', data: user });
    } catch (error) {
        next(error);
    }
};

// @desc   Delete (deactivate) a SiteClient user
// @route  DELETE /api/client-registrations/clients/:id
// @access Admin
export const deleteClient = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || user.role !== 'SiteClient') {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        user.isActive = false;
        await user.save();

        return res.json({ success: true, message: 'Client account deactivated' });
    } catch (error) {
        next(error);
    }
};

// @desc   Reset a SiteClient's password
// @route  POST /api/client-registrations/clients/:id/reset-password
// @access Admin
export const resetClientPassword = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || user.role !== 'SiteClient') {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        const tempPassword = req.body?.tempPassword?.trim() || generateTempPassword();
        const newHash = await hashPassword(tempPassword);

        user.passwordHash = newHash;
        await user.save();

        // Send password reset email and log notification (fire-and-forget)
        sendPasswordResetEmail(user, tempPassword).catch(() => { });

        return res.json({
            success: true,
            message: 'Password reset successfully. Email sent to client.',
            data: { tempPassword }
        });
    } catch (error) {
        next(error);
    }
};
