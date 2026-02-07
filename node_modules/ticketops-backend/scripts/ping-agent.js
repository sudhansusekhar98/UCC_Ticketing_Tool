import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import readline from 'readline';

const execAsync = promisify(exec);
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function startAgent() {
    console.log('--- TicketOps Asset Ping Agent ---');

    const apiUrl = await question('Enter Vercel Backend URL (e.g. https://your-app.vercel.app/api): ');
    const username = await question('Username: ');
    const password = await question('Password: ');

    try {
        console.log('\nAuthenticating...');
        const loginRes = await axios.post(`${apiUrl}/auth/login`, { username, password });
        const token = loginRes.data.data.token;
        const authHeader = { headers: { Authorization: `Bearer ${token}` } };

        console.log('Login successful.');

        async function checkLoop() {
            try {
                console.log(`\n[${new Date().toLocaleTimeString()}] Fetching assets for ping check...`);

                // Use the check-status endpoint which now just returns the list
                const { data: fetchRes } = await axios.post(`${apiUrl}/assets/check-status`, {}, authHeader);
                const assets = fetchRes.data;

                if (!assets || assets.length === 0) {
                    console.log('No assets to check.');
                    return;
                }

                console.log(`Pinging ${assets.length} assets locally...`);

                const results = [];
                for (const asset of assets) {
                    let status = 'Offline';
                    if (!asset.ipAddress) {
                        status = 'Passive Device';
                    } else {
                        try {
                            const { stdout } = await execAsync(`powershell.exe -Command "Test-Connection -ComputerName ${asset.ipAddress} -Count 1 -Quiet"`, { timeout: 4000 });
                            status = stdout.trim() === 'True' ? 'Online' : 'Offline';
                        } catch {
                            status = 'Offline';
                        }
                    }
                    results.push({ id: asset._id, status });
                    console.log(`${status === 'Online' ? '✅' : '❌'} ${asset.assetCode} (${asset.ipAddress || 'No IP'}) -> ${status}`);
                }

                console.log('Sending results to cloud...');
                await axios.post(`${apiUrl}/assets/bulk-status-update`, { results }, authHeader);
                console.log('Results synced.');

            } catch (err) {
                console.error('Check failed:', err.response?.data?.message || err.message);
            }
        }

        // Run once and then every 10 minutes (or manual trigger from UI)
        await checkLoop();
        console.log('\nWaiting 10 minutes for next check (Leave this window open)...');
        setInterval(checkLoop, 10 * 60 * 1000);

    } catch (err) {
        console.error('Authentication failed:', err.response?.data?.message || err.message);
        rl.close();
    }
}

startAgent();
