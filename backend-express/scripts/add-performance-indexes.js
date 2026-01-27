import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ticket from '../models/Ticket.model.js';
import Asset from '../models/Asset.model.js';
import User from '../models/User.model.js';
import TicketActivity from '../models/TicketActivity.model.js';
import RMARequest from '../models/RMARequest.model.js';
import connectDB from '../config/database.js';

dotenv.config();

/**
 * Database Indexing Script
 * Adds critical missing indexes to improve query performance
 * Run with: node scripts/add-performance-indexes.js
 */

const safeCreateIndex = async (model, keys, options = {}) => {
    try {
        await model.collection.createIndex(keys, options);
        console.log(`  ✓ Created index: ${options.name || JSON.stringify(keys)}`);
    } catch (error) {
        if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
            console.log(`  ℹ Skipping index (already exists with different name/options): ${options.name || JSON.stringify(keys)}`);
        } else if (error.code === 68 || error.codeName === 'IndexAlreadyExists') {
            console.log(`  ℹ Skipping index (already exists): ${options.name || JSON.stringify(keys)}`);
        } else {
            console.error(`  ✗ Error creating index ${options.name || JSON.stringify(keys)}:`, error.message);
        }
    }
};

async function addPerformanceIndexes() {
    try {
        console.log('\n🔧 Adding Performance Indexes...\n');

        await connectDB();

        // ==================== TICKET INDEXES ====================
        console.log('📊 Creating Ticket indexes...');

        await safeCreateIndex(Ticket, { status: 1 }, { name: 'idx_status' });
        await safeCreateIndex(Ticket, { assignedTo: 1 }, { name: 'idx_assignedTo' });
        await safeCreateIndex(Ticket, { siteId: 1 }, { name: 'idx_siteId' });
        await safeCreateIndex(Ticket, { assetId: 1 }, { name: 'idx_assetId' });
        await safeCreateIndex(Ticket, { createdBy: 1 }, { name: 'idx_createdBy' });
        await safeCreateIndex(Ticket, { createdAt: -1 }, { name: 'idx_createdAt_desc' });
        await safeCreateIndex(Ticket, { isSLARestoreBreached: 1, status: 1 }, { name: 'idx_sla_breach_status' });
        await safeCreateIndex(Ticket, { slaRestoreDue: 1, status: 1 }, { name: 'idx_sla_due_status' });
        await safeCreateIndex(Ticket, { resolvedOn: -1 }, { name: 'idx_resolvedOn_desc' });
        await safeCreateIndex(Ticket, { ticketNumber: 1 }, { name: 'idx_ticketNumber', unique: true });
        await safeCreateIndex(Ticket, { priority: 1 }, { name: 'idx_priority' });
        await safeCreateIndex(Ticket, { category: 1 }, { name: 'idx_category' });
        await safeCreateIndex(Ticket, { escalationLevel: 1 }, { name: 'idx_escalationLevel' });
        await safeCreateIndex(Ticket, { status: 1, priority: 1, createdAt: -1 }, { name: 'idx_status_priority_created' });

        // ==================== ASSET INDEXES ====================
        console.log('\n📊 Creating Asset indexes...');

        await safeCreateIndex(Asset, { siteId: 1 }, { name: 'idx_asset_siteId' });
        await safeCreateIndex(Asset, { status: 1 }, { name: 'idx_asset_status' });
        await safeCreateIndex(Asset, { isActive: 1 }, { name: 'idx_asset_isActive' });
        await safeCreateIndex(Asset, { isActive: 1, status: 1, siteId: 1 }, { name: 'idx_asset_active_status_site' });
        await safeCreateIndex(Asset, { assetCode: 1 }, { name: 'idx_asset_code' });
        await safeCreateIndex(Asset, { serialNumber: 1 }, { name: 'idx_asset_serial' });

        // ==================== USER INDEXES ====================
        console.log('\n📊 Creating User indexes...');

        await safeCreateIndex(User, { username: 1 }, { name: 'idx_user_username', unique: true });
        await safeCreateIndex(User, { email: 1 }, { name: 'idx_user_email' });
        await safeCreateIndex(User, { isActive: 1 }, { name: 'idx_user_active' });
        await safeCreateIndex(User, { role: 1 }, { name: 'idx_user_role' });
        await safeCreateIndex(User, { assignedSites: 1 }, { name: 'idx_user_sites' });

        // ==================== TICKET ACTIVITY INDEXES ====================
        console.log('\n📊 Creating TicketActivity indexes...');

        await safeCreateIndex(TicketActivity, { ticketId: 1, createdAt: -1 }, { name: 'idx_activity_ticket_created' });
        await safeCreateIndex(TicketActivity, { userId: 1 }, { name: 'idx_activity_user' });
        await safeCreateIndex(TicketActivity, { activityType: 1 }, { name: 'idx_activity_type' });

        // ==================== RMA INDEXES ====================
        console.log('\n📊 Creating RMA indexes...');

        await safeCreateIndex(RMARequest, { ticketId: 1 }, { name: 'idx_rma_ticket' });
        await safeCreateIndex(RMARequest, { status: 1 }, { name: 'idx_rma_status' });
        await safeCreateIndex(RMARequest, { siteId: 1 }, { name: 'idx_rma_site' });
        await safeCreateIndex(RMARequest, { originalAssetId: 1 }, { name: 'idx_rma_asset' });
        await safeCreateIndex(RMARequest, { createdAt: -1 }, { name: 'idx_rma_created' });

        console.log('\n✅ Performance indexing complete!\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Critical error during indexing:', error);
        process.exit(1);
    }
}

addPerformanceIndexes();
