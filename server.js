/**
 * SafeRoute — Backend Server (MongoDB Edition)
 * Node.js + Express + Mongoose REST API
 * Geethanjali College of Engineering & Technology
 * Web Technologies (20CS22004) — PBL Project
 */

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const crypto     = require('crypto');
const mongoose   = require('mongoose');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// MONGODB CONNECTION
// =====================================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/saferoute';

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB connected successfully →', MONGODB_URI);
        seedDatabase(); // seed default data on first run
    })
    .catch(err => {
        console.error('❌ MongoDB connection failed:', err.message);
        console.error('   Make sure MongoDB Compass / mongod is running!');
        process.exit(1);
    });

mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));
mongoose.connection.on('reconnected',  () => console.log('✅ MongoDB reconnected'));

// =====================================================
// MONGOOSE SCHEMAS & MODELS
// =====================================================

// --- User Schema ---
const userSchema = new mongoose.Schema({
    name:      { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true },
    phone:     { type: String, default: '' },
    role:      { type: String, enum: ['user', 'admin', 'authority'], default: 'user' },
    active:    { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// --- Hazard Schema ---
const hazardSchema = new mongoose.Schema({
    hazardId:     { type: String, unique: true },   // e.g. SR-2847
    type:         { type: String, required: true, enum: ['accident','congestion','roadwork','pothole','weather','other'] },
    icon:         { type: String },
    severity:     { type: String, required: true, enum: ['low','medium','high','critical'] },
    lat:          { type: Number, required: true },
    lng:          { type: Number, required: true },
    location:     { type: String, required: true },
    description:  { type: String, required: true },
    reportedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reporterName: { type: String, default: 'Anonymous' },
    reporterPhone:{ type: String, default: '' },
    status:       { type: String, enum: ['pending','active','resolved'], default: 'pending' },
    verified:     { type: Boolean, default: false },
    resolvedAt:   { type: Date, default: null },
}, { timestamps: true });

const Hazard = mongoose.model('Hazard', hazardSchema);

// --- Session Schema ---
const sessionSchema = new mongoose.Schema({
    token:     { type: String, required: true, unique: true },
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
}, { timestamps: true });

// Auto-delete expired sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Session = mongoose.model('Session', sessionSchema);

// --- Counter Schema (for SR-XXXX IDs) ---
const counterSchema = new mongoose.Schema({
    _id:  { type: String, required: true },
    seq:  { type: Number, default: 2848 }
});
const Counter = mongoose.model('Counter', counterSchema);

// =====================================================
// HELPERS
// =====================================================
function hashPassword(pw) {
    return crypto.createHash('sha256').update(pw + 'saferoute_salt').digest('hex');
}

function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

async function generateHazardId() {
    const counter = await Counter.findByIdAndUpdate(
        'hazardSeq',
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return `SR-${counter.seq}`;
}

const typeIcons = { accident:'💥', congestion:'🚦', roadwork:'🔧', pothole:'🕳️', weather:'🌧️', other:'❗' };

function successResponse(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({ success: true, message, data, timestamp: new Date().toISOString() });
}

function errorResponse(res, error, statusCode = 400) {
    return res.status(statusCode).json({ success: false, error, timestamp: new Date().toISOString() });
}

// =====================================================
// SEED DEFAULT DATA (runs only if DB is empty)
// =====================================================
async function seedDatabase() {
    try {
        const userCount = await User.countDocuments();
        if (userCount > 0) {
            console.log('ℹ️  Database already has data — skipping seed.');
            return;
        }

        console.log('🌱 Seeding default users and hazards...');

        // Create default users
        const admin = await User.create({
            name: 'Admin User', email: 'admin@saferoute.in',
            password: hashPassword('admin123'), role: 'admin', phone: '+91 9876543210'
        });
        const authority = await User.create({
            name: 'Traffic Authority', email: 'authority@hyderabad.gov.in',
            password: hashPassword('auth123'), role: 'authority', phone: '+91 9988776655'
        });
        const demoUser = await User.create({
            name: 'Demo User', email: 'user@saferoute.in',
            password: hashPassword('user123'), role: 'user', phone: '+91 9000012345'
        });

        // Create default hazards
        const now = Date.now();
        const hazardData = [
            { type:'accident',   severity:'critical', lat:17.4450, lng:78.3489, location:'Jubilee Hills Road No.36',  description:'Major multi-vehicle accident. Emergency services on site.',  reportedBy:demoUser._id, reporterName:'Ravi K.',  status:'active',   verified:true,  createdAt:new Date(now-5*60000) },
            { type:'congestion', severity:'high',     lat:17.4326, lng:78.4071, location:'Banjara Hills Road No.1',   description:'Heavy traffic congestion. 3km backup.',                      reportedBy:demoUser._id, reporterName:'Priya M.', status:'active',   verified:true,  createdAt:new Date(now-12*60000) },
            { type:'weather',    severity:'critical', lat:17.3900, lng:78.4600, location:'MGBS Flyover',              description:'Flash floods on bridge. Road closed.',                       reportedBy:authority._id,reporterName:'Admin',    status:'active',   verified:true,  createdAt:new Date(now-15*60000) },
            { type:'pothole',    severity:'medium',   lat:17.3850, lng:78.4867, location:'Dilsukhnagar Main Road',    description:'Large pothole causing tire damage.',                         reportedBy:demoUser._id, reporterName:'Sneha R.', status:'pending',  verified:false, createdAt:new Date(now-25*60000) },
            { type:'accident',   severity:'high',     lat:17.4600, lng:78.3700, location:'Film Nagar Junction',       description:'Car crash into divider. One lane blocked.',                  reportedBy:demoUser._id, reporterName:'Kiran P.', status:'active',   verified:true,  createdAt:new Date(now-30*60000) },
            { type:'roadwork',   severity:'low',      lat:17.4950, lng:78.3900, location:'Ameerpet X Roads',          description:'Road resurfacing. One lane closed.',                         reportedBy:admin._id,    reporterName:'Admin',    status:'resolved', verified:true,  resolvedAt:new Date(now-5*60000),  createdAt:new Date(now-60*60000) },
            { type:'congestion', severity:'medium',   lat:17.4480, lng:78.5100, location:'Uppal Ring Road',           description:'Signal malfunction causing traffic buildup.',                reportedBy:demoUser._id, reporterName:'Meera V.', status:'active',   verified:true,  createdAt:new Date(now-18*60000) },
            { type:'pothole',    severity:'high',     lat:17.4700, lng:78.3800, location:'SR Nagar Main Road',        description:'Multiple potholes. Road in poor condition.',                 reportedBy:demoUser._id, reporterName:'Rohit T.', status:'pending',  verified:false, createdAt:new Date(now-45*60000) },
        ];

        // Generate sequential SR IDs
        await Counter.findByIdAndUpdate('hazardSeq', { seq: 2840 }, { upsert: true });
        for (const h of hazardData) {
            const hazardId = await generateHazardId();
            await Hazard.create({ ...h, hazardId, icon: typeIcons[h.type] || '❗' });
        }

        console.log('✅ Seed complete — 3 users, 8 hazards created.');
        console.log('   Admin:     admin@saferoute.in / admin123');
        console.log('   Authority: authority@hyderabad.gov.in / auth123');
        console.log('   User:      user@saferoute.in / user123');
    } catch (err) {
        console.error('❌ Seed error:', err.message);
    }
}

// =====================================================
// MIDDLEWARE
// =====================================================
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500', '*'],
    methods: ['GET','POST','PUT','DELETE','PATCH'],
    allowedHeaders: ['Content-Type','Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Request logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// =====================================================
// AUTH MIDDLEWARE
// =====================================================
async function authenticate(req, res, next) {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
        return errorResponse(res, 'Authentication required', 401);
    }
    const token = auth.split(' ')[1];
    try {
        const session = await Session.findOne({ token, expiresAt: { $gt: new Date() } }).populate('userId');
        if (!session) return errorResponse(res, 'Invalid or expired session', 401);
        req.user = session.userId;
        next();
    } catch (err) {
        return errorResponse(res, 'Authentication error', 500);
    }
}

function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin' && req.user.role !== 'authority') {
        return errorResponse(res, 'Insufficient permissions', 403);
    }
    next();
}

// =====================================================
// ROUTES — AUTH
// =====================================================

// POST /api/auth/login
// Body: { email, password, role }
// RBAC: role in body must match role stored in DB
app.post('/api/auth/login', async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password) return errorResponse(res, 'Email and password are required');

    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return errorResponse(res, 'No account found with this email', 404);
        if (user.password !== hashPassword(password)) return errorResponse(res, 'Incorrect password', 401);
        if (!user.active) return errorResponse(res, 'Account is deactivated. Contact admin.', 403);

        // RBAC check: if caller specified a role, it must match DB role
        if (role && role !== user.role) {
            return errorResponse(
                res,
                `Access denied. This account is registered as '${user.role}', not '${role}'. Please select the correct role.`,
                403
            );
        }

        const token = generateSessionToken();
        await Session.create({ token, userId: user._id, expiresAt: new Date(Date.now() + 24*60*60*1000) });

        const { password: _, ...safeUser } = user.toObject();
        return successResponse(res, { token, user: safeUser }, 'Login successful');
    } catch (err) {
        return errorResponse(res, 'Login failed: ' + err.message, 500);
    }
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password) return errorResponse(res, 'Name, email, and password are required');
    if (password.length < 6) return errorResponse(res, 'Password must be at least 6 characters');

    // Validate role — only allow known roles, default to 'user'
    const validRoles = ['user', 'admin', 'authority'];
    const assignedRole = validRoles.includes(role) ? role : 'user';

    try {
        const exists = await User.findOne({ email: email.toLowerCase() });
        if (exists) return errorResponse(res, 'An account with this email already exists', 409);

        const user = await User.create({
            name, email, phone: phone || '',
            password: hashPassword(password), role: assignedRole
        });

        const token = generateSessionToken();
        await Session.create({ token, userId: user._id, expiresAt: new Date(Date.now() + 24*60*60*1000) });

        const { password: _, ...safeUser } = user.toObject();
        return successResponse(res, { token, user: safeUser }, 'Account created successfully', 201);
    } catch (err) {
        return errorResponse(res, 'Registration failed: ' + err.message, 500);
    }
});

// POST /api/auth/logout
app.post('/api/auth/logout', authenticate, async (req, res) => {
    const token = req.headers['authorization'].split(' ')[1];
    await Session.deleteOne({ token });
    return successResponse(res, null, 'Logged out successfully');
});

// GET /api/auth/me
app.get('/api/auth/me', authenticate, (req, res) => {
    const { password: _, ...safeUser } = req.user.toObject();
    return successResponse(res, { user: safeUser });
});

// =====================================================
// ROUTES — HAZARDS
// =====================================================

// GET /api/hazards
app.get('/api/hazards', async (req, res) => {
    let { type, severity, status, limit = 100, lat, lng, radius } = req.query;
    const filter = {};
    if (type)     filter.type     = type;
    if (severity) filter.severity = severity;
    if (status)   filter.status   = status;

    try {
        let results = await Hazard.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit));

        // Radius filter (km)
        if (lat && lng && radius) {
            const R = 6371;
            results = results.filter(h => {
                const dLat = (h.lat - parseFloat(lat)) * Math.PI / 180;
                const dLng = (h.lng - parseFloat(lng)) * Math.PI / 180;
                const a = Math.sin(dLat/2)**2 + Math.cos(parseFloat(lat)*Math.PI/180) * Math.cos(h.lat*Math.PI/180) * Math.sin(dLng/2)**2;
                return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) <= parseFloat(radius);
            });
        }

        return successResponse(res, {
            hazards: results,
            total: results.length,
            active: results.filter(h => h.status === 'active').length
        });
    } catch (err) {
        return errorResponse(res, 'Failed to fetch hazards: ' + err.message, 500);
    }
});

// GET /api/hazards/:id
app.get('/api/hazards/:id', async (req, res) => {
    try {
        const hazard = await Hazard.findOne({ hazardId: req.params.id });
        if (!hazard) return errorResponse(res, 'Hazard not found', 404);
        return successResponse(res, { hazard });
    } catch (err) {
        return errorResponse(res, 'Error: ' + err.message, 500);
    }
});

// POST /api/hazards
app.post('/api/hazards', async (req, res) => {
    const { type, severity, lat, lng, location, description, reporterName, reporterPhone } = req.body;
    if (!type || !severity || !lat || !lng || !location || !description) {
        return errorResponse(res, 'type, severity, lat, lng, location, and description are required');
    }

    try {
        const hazardId = await generateHazardId();
        const hazard = await Hazard.create({
            hazardId, type, icon: typeIcons[type] || '❗',
            severity, lat: parseFloat(lat), lng: parseFloat(lng),
            location, description,
            reporterName: reporterName || 'Anonymous',
            reporterPhone: reporterPhone || '',
            status: 'pending', verified: false
        });
        return successResponse(res, { hazard }, 'Hazard report submitted successfully', 201);
    } catch (err) {
        return errorResponse(res, 'Failed to create hazard: ' + err.message, 500);
    }
});

// PATCH /api/hazards/:id/status
app.patch('/api/hazards/:id/status', authenticate, requireAdmin, async (req, res) => {
    const { status } = req.body;
    if (!['active','resolved','pending'].includes(status)) return errorResponse(res, 'Invalid status');

    try {
        const update = { status };
        if (status === 'resolved') update.resolvedAt = new Date();
        const hazard = await Hazard.findOneAndUpdate({ hazardId: req.params.id }, update, { new: true });
        if (!hazard) return errorResponse(res, 'Hazard not found', 404);
        return successResponse(res, { hazard }, `Hazard ${req.params.id} status updated to ${status}`);
    } catch (err) {
        return errorResponse(res, 'Update failed: ' + err.message, 500);
    }
});

// PATCH /api/hazards/:id/verify
app.patch('/api/hazards/:id/verify', authenticate, requireAdmin, async (req, res) => {
    try {
        const hazard = await Hazard.findOneAndUpdate(
            { hazardId: req.params.id },
            { verified: true, status: 'active' },
            { new: true }
        );
        if (!hazard) return errorResponse(res, 'Hazard not found', 404);
        return successResponse(res, { hazard }, 'Hazard verified and activated');
    } catch (err) {
        return errorResponse(res, 'Verify failed: ' + err.message, 500);
    }
});

// DELETE /api/hazards/:id
app.delete('/api/hazards/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const deleted = await Hazard.findOneAndDelete({ hazardId: req.params.id });
        if (!deleted) return errorResponse(res, 'Hazard not found', 404);
        return successResponse(res, { deleted }, 'Hazard deleted successfully');
    } catch (err) {
        return errorResponse(res, 'Delete failed: ' + err.message, 500);
    }
});

// =====================================================
// ROUTES — ANALYTICS
// =====================================================

// GET /api/analytics/summary
app.get('/api/analytics/summary', async (req, res) => {
    try {
        const [total, active, resolved, critical, pending, last24h, lastWeek, totalUsers] = await Promise.all([
            Hazard.countDocuments(),
            Hazard.countDocuments({ status: 'active' }),
            Hazard.countDocuments({ status: 'resolved' }),
            Hazard.countDocuments({ severity: 'critical', status: 'active' }),
            Hazard.countDocuments({ verified: false }),
            Hazard.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) } }),
            Hazard.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) } }),
            User.countDocuments()
        ]);

        const byType = await Hazard.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]);
        const bySeverity = await Hazard.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]);
        const recentActivity = await Hazard.find().sort({ createdAt: -1 }).limit(5);

        const byTypeObj = {};
        byType.forEach(t => byTypeObj[t._id] = t.count);
        const bySeverityObj = {};
        bySeverity.forEach(s => bySeverityObj[s._id] = s.count);

        return successResponse(res, {
            summary: {
                totalReports: total, activeHazards: active, resolvedHazards: resolved,
                criticalActive: critical, pendingVerification: pending,
                reportsLast24h: last24h, reportsLastWeek: lastWeek,
                resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
                totalUsers
            },
            byType: byTypeObj,
            bySeverity: bySeverityObj,
            recentActivity
        });
    } catch (err) {
        return errorResponse(res, 'Analytics error: ' + err.message, 500);
    }
});

// GET /api/analytics/hotspots
app.get('/api/analytics/hotspots', async (req, res) => {
    try {
        const hotspots = await Hazard.aggregate([
            { $group: { _id: '$location', count: { $sum: 1 }, lat: { $first: '$lat' }, lng: { $first: '$lng' } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            { $project: { location: '$_id', count: 1, lat: 1, lng: 1, _id: 0 } }
        ]);
        return successResponse(res, { hotspots });
    } catch (err) {
        return errorResponse(res, 'Hotspots error: ' + err.message, 500);
    }
});

// GET /api/analytics/trends
app.get('/api/analytics/trends', async (req, res) => {
    const days = parseInt(req.query.days) || 7;
    try {
        const trend = [];
        const now = new Date();
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const start = new Date(date.setHours(0,0,0,0));
            const end   = new Date(date.setHours(23,59,59,999));
            const count = await Hazard.countDocuments({ createdAt: { $gte: start, $lte: end } });
            trend.push({
                date: start.toISOString().split('T')[0],
                label: start.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' }),
                count: count + Math.floor(Math.random() * 12) + 5  // simulated extra for demo
            });
        }
        return successResponse(res, { trend, days });
    } catch (err) {
        return errorResponse(res, 'Trends error: ' + err.message, 500);
    }
});

// =====================================================
// ROUTES — USERS (Admin)
// =====================================================

// GET /api/users
app.get('/api/users', authenticate, requireAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        return successResponse(res, { users, total: users.length });
    } catch (err) {
        return errorResponse(res, 'Users error: ' + err.message, 500);
    }
});

// PATCH /api/users/:id/status
app.patch('/api/users/:id/status', authenticate, requireAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { active: req.body.active !== false },
            { new: true }
        ).select('-password');
        if (!user) return errorResponse(res, 'User not found', 404);
        return successResponse(res, { user }, 'User status updated');
    } catch (err) {
        return errorResponse(res, 'Update error: ' + err.message, 500);
    }
});

// =====================================================
// ROUTES — ALERTS
// =====================================================

// GET /api/alerts
app.get('/api/alerts', async (req, res) => {
    const { lat, lng, radius = 5 } = req.query;
    try {
        let alerts = await Hazard.find({ status: 'active', severity: { $in: ['critical','high'] } })
                                 .sort({ createdAt: -1 }).limit(20);
        if (lat && lng) {
            const R = 6371;
            alerts = alerts.filter(h => {
                const dLat = (h.lat - parseFloat(lat)) * Math.PI / 180;
                const dLng = (h.lng - parseFloat(lng)) * Math.PI / 180;
                const a = Math.sin(dLat/2)**2 + Math.cos(parseFloat(lat)*Math.PI/180) * Math.cos(h.lat*Math.PI/180) * Math.sin(dLng/2)**2;
                return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) <= parseFloat(radius);
            });
        }
        return successResponse(res, {
            alerts: alerts.slice(0, 10),
            count: alerts.length,
            message: alerts.length > 0 ? `${alerts.length} active hazard alert(s) in your area` : 'No active alerts nearby'
        });
    } catch (err) {
        return errorResponse(res, 'Alerts error: ' + err.message, 500);
    }
});

// =====================================================
// HEALTH & API DOCS
// =====================================================
app.get('/api', (req, res) => {
    return successResponse(res, {
        name: 'SafeRoute API (MongoDB)',
        version: '2.0.0',
        status: 'running',
        database: mongoose.connection.readyState === 1 ? '✅ MongoDB connected' : '❌ Disconnected',
        endpoints: {
            auth:      ['POST /api/auth/login','POST /api/auth/register','POST /api/auth/logout','GET /api/auth/me'],
            hazards:   ['GET /api/hazards','GET /api/hazards/:id','POST /api/hazards','PATCH /api/hazards/:id/status','PATCH /api/hazards/:id/verify','DELETE /api/hazards/:id'],
            analytics: ['GET /api/analytics/summary','GET /api/analytics/hotspots','GET /api/analytics/trends'],
            users:     ['GET /api/users','PATCH /api/users/:id/status'],
            alerts:    ['GET /api/alerts']
        },
        defaultAccounts: {
            admin:     { email: 'admin@saferoute.in',             password: 'admin123', role: 'admin'     },
            authority: { email: 'authority@hyderabad.gov.in',     password: 'auth123',  role: 'authority' },
            user:      { email: 'user@saferoute.in',              password: 'user123',  role: 'user'      }
        },
        college: 'Geethanjali College of Engineering & Technology',
        subject: 'Web Technologies (20CS22004) — PBL'
    });
});

app.get('/health', async (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        database: 'saferoute'
    });
});

// 404
app.use((req, res) => res.status(404).json({ success: false, error: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

// =====================================================
// START SERVER
// =====================================================
app.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║     SafeRoute Backend Server (MongoDB)       ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  Running at:  http://localhost:${PORT}            ║`);
    console.log(`║  API Docs:    http://localhost:${PORT}/api        ║`);
    console.log(`║  Health:      http://localhost:${PORT}/health     ║`);
    console.log('║  GCET Web Technologies PBL Project           ║');
    console.log('╚══════════════════════════════════════════════╝\n');
});

module.exports = app;
