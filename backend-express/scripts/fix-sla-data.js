import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ticket from '../models/Ticket.model.js';
import SLAPolicy from '../models/SLAPolicy.model.js';
import Asset from '../models/Asset.model.js'; // Needed as it's used in Ticket pre-save

dotenv.config(); // Defaults to .env in current directory (backend-express)

const fixSlaData = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');

        const tickets = await Ticket.find({
            $or: [
                { slaPolicyId: { $exists: false } },
                { slaPolicyId: null },
                { slaResponseDue: { $exists: false } },
                { slaRestoreDue: { $exists: false } }
            ]
        });

        console.log(`Found ${tickets.length} tickets needing SLA data repair.`);

        for (const ticket of tickets) {
            try {
                console.log(`Repairing ticket: ${ticket.ticketNumber}...`);

                // Trigger pre-save hook
                await ticket.save();

                console.log(`   ✅ Repaired: ${ticket.ticketNumber} -> Priority: ${ticket.priority}`);
            } catch (err) {
                if (err.name === 'ValidationError') {
                    console.warn(`   ⚠️ Validation failed for ${ticket.ticketNumber}. Forcing save without validation...`);
                    // If validation fails (e.g. missing fields in legacy data), force save just the SLA fields
                    await ticket.save({ validateBeforeSave: false });
                    console.log(`    Force Repaired: ${ticket.ticketNumber}`);
                } else {
                    console.error(`    Failed to repair ${ticket.ticketNumber}:`, err.message);
                }
            }
        }

        console.log('\nAll tickets processed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error repairing SLA data:', error);
        process.exit(1);
    }
};

fixSlaData();
