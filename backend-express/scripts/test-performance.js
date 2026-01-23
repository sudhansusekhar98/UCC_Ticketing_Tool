import axios from 'axios';

/**
 * Backend Performance Diagnostic Tool
 * Tests API response times to identify bottlenecks
 * 
 * Usage: node scripts/test-performance.js
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';
const AUTH_TOKEN = process.env.TEST_TOKEN; // Add your JWT token here for authenticated endpoints

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const testEndpoint = async (name, url, method = 'GET', auth = false) => {
    const headers = {};
    if (auth && AUTH_TOKEN) {
        headers.Authorization = `Bearer ${AUTH_TOKEN}`;
    }

    const start = Date.now();
    try {
        const response = await axios({
            method,
            url: `${API_BASE_URL}${url}`,
            headers,
            timeout: 10000
        });

        const duration = Date.now() - start;
        const status = response.status === 200 ? '✅' : '⚠️';
        const speed = duration < 200 ? '🚀' : duration < 500 ? '⚡' : duration < 1000 ? '🐌' : '🐢';

        console.log(`${status} ${speed} ${name.padEnd(40)} ${duration}ms`);

        return { name, duration, success: true, status: response.status };
    } catch (error) {
        const duration = Date.now() - start;
        const errorMsg = error.response?.status || error.code || 'FAILED';
        console.log(`❌ ⛔ ${name.padEnd(40)} ${duration}ms (${errorMsg})`);

        return { name, duration, success: false, error: errorMsg };
    }
};

async function runPerformanceTests() {
    console.log('\n🔍 Backend Performance Diagnostic\n');
    console.log('='.repeat(70));
    console.log('\nTesting API endpoints...\n');

    const results = [];

    // Health check (no auth)
    results.push(await testEndpoint('Health Check', '/health', 'GET', false));
    await delay(100);

    // Auth endpoints
    console.log('\n📝 Authentication Endpoints:');
    // Note: Login requires credentials, skipping for now

    // Public/Low-auth endpoints
    console.log('\n🔓 Public Endpoints:');
    results.push(await testEndpoint('Lookups - Categories', '/lookups/categories', 'GET', false));
    await delay(100);

    results.push(await testEndpoint('Lookups - Priorities', '/lookups/priorities', 'GET', false));
    await delay(100);

    // Authenticated endpoints (only if token provided)
    if (AUTH_TOKEN) {
        console.log('\n🔒 Authenticated Endpoints:');

        results.push(await testEndpoint('Dashboard Stats', '/tickets/dashboard/stats', 'GET', true));
        await delay(100);

        results.push(await testEndpoint('Tickets List (limit=10)', '/tickets?limit=10', 'GET', true));
        await delay(100);

        results.push(await testEndpoint('Tickets List (limit=50)', '/tickets?limit=50', 'GET', true));
        await delay(100);

        results.push(await testEndpoint('Assets List (limit=20)', '/assets?limit=20', 'GET', true));
        await delay(100);

        results.push(await testEndpoint('Users List', '/users', 'GET', true));
        await delay(100);

        results.push(await testEndpoint('Sites List', '/sites', 'GET', true));
        await delay(100);

        results.push(await testEndpoint('RMA List', '/rma', 'GET', true));
        await delay(100);

        results.push(await testEndpoint('Notifications', '/notifications', 'GET', true));
        await delay(100);
    } else {
        console.log('\n⚠️  Skipping authenticated endpoints (no token provided)');
        console.log('   To test authenticated endpoints, set TEST_TOKEN environment variable');
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('\n📊 Performance Summary:\n');

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    if (successful.length > 0) {
        const avgTime = Math.round(successful.reduce((sum, r) => sum + r.duration, 0) / successful.length);
        const maxTime = Math.max(...successful.map(r => r.duration));
        const minTime = Math.min(...successful.map(r => r.duration));

        console.log(`✅ Successful Requests: ${successful.length}/${results.length}`);
        console.log(`⚡ Average Response Time: ${avgTime}ms`);
        console.log(`🚀 Fastest: ${minTime}ms`);
        console.log(`🐌 Slowest: ${maxTime}ms`);

        // Performance rating
        console.log('\n📈 Performance Rating:');
        if (avgTime < 200) {
            console.log('   🌟🌟🌟🌟🌟 EXCELLENT - All systems optimal!');
        } else if (avgTime < 500) {
            console.log('   🌟🌟🌟🌟 GOOD - Performance is acceptable');
        } else if (avgTime < 1000) {
            console.log('   🌟🌟🌟 FAIR - Some optimization needed');
        } else if (avgTime < 2000) {
            console.log('   🌟🌟 POOR - Significant optimization required');
        } else {
            console.log('   🌟 CRITICAL - Immediate action required!');
        }

        // Slow endpoints
        const slowEndpoints = successful.filter(r => r.duration > 500);
        if (slowEndpoints.length > 0) {
            console.log('\n⚠️  Slow Endpoints (>500ms):');
            slowEndpoints.forEach(r => {
                console.log(`   - ${r.name}: ${r.duration}ms`);
            });
        }
    }

    if (failed.length > 0) {
        console.log(`\n❌ Failed Requests: ${failed.length}`);
        failed.forEach(r => {
            console.log(`   - ${r.name}: ${r.error}`);
        });
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n💡 Recommendations:\n');

    const avgTime = successful.length > 0
        ? Math.round(successful.reduce((sum, r) => sum + r.duration, 0) / successful.length)
        : 0;

    if (avgTime > 500) {
        console.log('   1. ✅ DONE: Removed blocking DB middleware from server.js');
        console.log('   2. 🔨 TODO: Run indexing script: node scripts/add-performance-indexes.js');
        console.log('   3. 🔨 TODO: Replace getDashboardStats with optimized version');
        console.log('   4. 🔨 TODO: Restart backend server');
    } else if (avgTime > 200) {
        console.log('   1. ✅ Good progress! Most endpoints are fast');
        console.log('   2. Review slow endpoints listed above');
        console.log('   3. Consider implementing caching for frequently accessed data');
    } else {
        console.log('   🎉 Excellent performance! No immediate action needed');
        console.log('   💡 Consider implementing caching to further improve response times');
    }

    console.log('\n📖 For detailed performance fix guide, see:');
    console.log('   PERFORMANCE_FIX_SUMMARY.md\n');
}

// Run tests
runPerformanceTests().catch(error => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
});
