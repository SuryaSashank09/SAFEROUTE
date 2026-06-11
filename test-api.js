/**
 * SafeRoute — API Test Script
 * Run: node test-api.js
 * Make sure server is running first: node server.js
 */

const BASE = 'http://localhost:3000/api';
let token = '';

async function req(method, path, body, label) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {})
    };
    try {
        const res  = await fetch(BASE + path, opts);
        const data = await res.json();
        const icon = data.success ? '✅' : '❌';
        console.log(`${icon} [${method} ${path}] — ${label}`);
        if (!data.success) console.log('   Error:', data.error);
        return data;
    } catch (e) {
        console.log(`❌ [${method} ${path}] — ${label} — NETWORK ERROR: ${e.message}`);
        console.log('   Is the server running? Run: node server.js');
    }
}

async function runTests() {
    console.log('\n🚦 SafeRoute API Tests\n' + '='.repeat(40));

    // Health check
    try {
        const r = await fetch('http://localhost:3000/health');
        const d = await r.json();
        console.log(`✅ [GET /health] — Server & DB status: mongodb=${d.mongodb}`);
    } catch {
        console.log('❌ [GET /health] — Server not reachable! Run: node server.js');
        return;
    }

    // Auth tests
    console.log('\n--- AUTH ---');
    const loginRes = await req('POST', '/auth/login', { email: 'admin@saferoute.in', password: 'admin123' }, 'Admin login');
    if (loginRes?.data?.token) {
        token = loginRes.data.token;
        console.log('   Token saved for subsequent requests');
    }

    await req('POST', '/auth/login', { email: 'wrong@email.com', password: 'bad' }, 'Invalid login (should fail)');
    await req('GET',  '/auth/me',   null, 'Get current user');
    await req('POST', '/auth/register', {
        name: 'Test User', email: `test_${Date.now()}@test.com`, password: 'pass123', phone: '+91 9999999999'
    }, 'Register new user');

    // Hazard tests
    console.log('\n--- HAZARDS ---');
    await req('GET', '/hazards',              null, 'Get all hazards');
    await req('GET', '/hazards?status=active',null, 'Filter active hazards');
    await req('GET', '/hazards?severity=critical', null, 'Filter critical hazards');

    const newHazard = await req('POST', '/hazards', {
        type: 'pothole', severity: 'high', lat: 17.4010, lng: 78.4900,
        location: 'Test Location Road', description: 'Test pothole report from API test',
        reporterName: 'Tester'
    }, 'Create new hazard');

    if (newHazard?.data?.hazard?.hazardId) {
        const hid = newHazard.data.hazard.hazardId;
        await req('GET',   `/hazards/${hid}`,         null,            'Get hazard by ID');
        await req('PATCH', `/hazards/${hid}/verify`,  null,            'Verify hazard (admin)');
        await req('PATCH', `/hazards/${hid}/status`,  { status: 'resolved' }, 'Resolve hazard (admin)');
        await req('DELETE',`/hazards/${hid}`,         null,            'Delete hazard (admin)');
    }

    // Analytics
    console.log('\n--- ANALYTICS ---');
    await req('GET', '/analytics/summary',  null, 'Dashboard summary');
    await req('GET', '/analytics/hotspots', null, 'Hotspots');
    await req('GET', '/analytics/trends',   null, 'Trends (7 days)');

    // Users
    console.log('\n--- USERS ---');
    await req('GET', '/users', null, 'Get all users (admin)');

    // Alerts
    console.log('\n--- ALERTS ---');
    await req('GET', '/alerts', null, 'Get all alerts');
    await req('GET', '/alerts?lat=17.4450&lng=78.3489&radius=10', null, 'Alerts near Jubilee Hills');

    // Logout
    console.log('\n--- CLEANUP ---');
    await req('POST', '/auth/logout', null, 'Logout');

    console.log('\n' + '='.repeat(40));
    console.log('🎉 All tests done! Check ✅ / ❌ above.\n');
}

runTests();
