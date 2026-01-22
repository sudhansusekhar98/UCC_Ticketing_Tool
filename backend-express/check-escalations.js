const mongoose = require('mongoose');

const dbUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ucc_ticketing';

mongoose.connect(dbUri).then(async () => {
    console.log('Connected to MongoDB');

    const Ticket = mongoose.model('Ticket', new mongoose.Schema({}, { strict: false }));

    const escalatedStatusCount = await Ticket.countDocuments({ status: 'Escalated' });
    const hasEscalationLevel = await Ticket.countDocuments({ escalationLevel: { $gt: 0 } });

    console.log('\n=== ESCALATION STATISTICS ===');
    console.log('Tickets with status=Escalated (ongoing):', escalatedStatusCount);
    console.log('Tickets with escalationLevel > 0 (ever escalated):', hasEscalationLevel);

    const samples = await Ticket.find({ escalationLevel: { $gt: 0 } })
        .select('ticketNumber status escalationLevel escalatedOn escalationAcceptedOn')
        .sort({ escalatedOn: -1 })
        .limit(20);

    console.log('\n=== TICKETS WITH ESCALATION LEVEL > 0 ===');
    if (samples.length > 0) {
        samples.forEach(t => {
            console.log(`  - ${t.ticketNumber}: status="${t.status}", level=${t.escalationLevel}, escalated=${t.escalatedOn ? 'Yes' : 'No'}, accepted=${t.escalationAcceptedOn ? 'Yes' : 'No'}`);
        });
    } else {
        console.log('  No tickets found with escalationLevel > 0');
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
}).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
