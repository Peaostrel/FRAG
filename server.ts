import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { openDatabase } from './server/database.mjs';
import { handleApi, hashPassword } from './server/lib/club-api.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createHttpServer(app);
const port = Number(process.env.PORT || 3000);
const dbPath = process.env.DB_PATH || join(__dirname, 'data', 'frag.sqlite');
const adminPasswordEnv = process.env.ADMIN_SETUP_CODE || 'admin123';

// Initialize SQLite database and run migrations
const DB = openDatabase(dbPath, join(__dirname, 'migrations'));

// Ensure a default admin exists for club management and seed 2026 club operations
async function initDefaultAdminAndSeed2026() {
  try {
    let adminUser = await DB.prepare("SELECT id, email FROM users WHERE role='admin' LIMIT 1").first();
    if (!adminUser) {
      const email = 'admin@frag.local';
      const name = 'Администратор FRAG';
      const defaultPassword = 'admin12345';
      const passwordHash = await hashPassword(defaultPassword, 100000);
      const id = crypto.randomUUID();
      await DB.prepare("INSERT INTO users (id,email,name,password_hash,role,created) VALUES (?,?,?,?,'admin',?)")
        .bind(id, email, name, passwordHash, Date.parse('2026-01-01T08:00:00+04:00'))
        .run();
      adminUser = { id, email };
      console.log(`[FRAG] Default Administrator created: ${email} (Password: ${defaultPassword})`);
    }

    // Seed full-year 2026 club activity (Jan - Dec 2026) if not seeded yet
    const countRow = await DB.prepare('SELECT COUNT(*) as cnt FROM bookings').first();
    const existingCount = Number(countRow?.cnt || 0);

    const players = [
      { id: 'usr-2026-01', name: 'donk_64', email: 'donk64@frag.club' },
      { id: 'usr-2026-02', name: 'm0NESY_awp', email: 'm0nesy@frag.club' },
      { id: 'usr-2026-03', name: 's1mple_sar', email: 's1mple.sar@frag.club' },
      { id: 'usr-2026-04', name: 'sh1ro_sniper', email: 'sh1ro@frag.club' },
      { id: 'usr-2026-05', name: 'magixx_spirit', email: 'magixx@frag.club' },
      { id: 'usr-2026-06', name: 'chopper_igl', email: 'chopper@frag.club' },
      { id: 'usr-2026-07', name: 'b1t_headshot', email: 'b1t.aim@frag.club' },
      { id: 'usr-2026-08', name: 'fame_vp', email: 'fame.vp@frag.club' },
      { id: 'usr-2026-09', name: 'fl1t_rifle', email: 'fl1t@frag.club' },
      { id: 'usr-2026-10', name: 'jame_time', email: 'jame.save@frag.club' },
      { id: 'usr-2026-11', name: 'electronic_cl', email: 'electronic@frag.club' },
      { id: 'usr-2026-12', name: 'perfecto_clutch', email: 'perfecto@frag.club' },
      { id: 'usr-2026-13', name: 'degster_flick', email: 'degster@frag.club' },
      { id: 'usr-2026-14', name: 'patsi_rush', email: 'patsi@frag.club' },
      { id: 'usr-2026-15', name: 'nafany_vip', email: 'nafany@frag.club' },
      { id: 'usr-2026-16', name: 'kyousuke_pro', email: 'kyousuke@frag.club' },
      { id: 'usr-2026-17', name: 'zweih_carry', email: 'zweih@frag.club' },
      { id: 'usr-2026-18', name: 'karrigan_tactics', email: 'karrigan@frag.club' },
    ];

    if (existingCount < 500) {
      const dummyHash = await hashPassword('player12345', 1000);
      DB.sqlite.exec('BEGIN');
      try {
        const insertUserStmt = DB.sqlite.prepare(
          "INSERT OR IGNORE INTO users (id,email,name,password_hash,role,created) VALUES (?,?,?,?,'client',?)"
        );
        const jan1 = Date.parse('2026-01-01T10:00:00+04:00');
        for (const p of players) {
          insertUserStmt.run(p.id, p.email, p.name, dummyHash, jan1);
        }

        const insertBookingStmt = DB.sqlite.prepare(
          'INSERT OR IGNORE INTO bookings (id,owner,name,pc,start,end,total,status,created) VALUES (?,?,?,?,?,?,?,?,?)'
        );

        const nowMs = Date.now();
        const saratovOffset = 4 * 3600000;
        const todaySaratovStr = new Date(nowMs + saratovOffset).toISOString().slice(0, 10);

        // Seasonal intensity multiplier per month (0 = Jan .. 9 = Oct)
        // Ensures realistic club revenue curve: Jan holidays peak, spring growth, summer boom, autumn LANs
        const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        const monthPcsCount = [7, 6, 7, 7, 8, 8, 9, 9, 8, 8, 2, 3];

        let seq = 1;
        for (let m = 0; m < 12; m++) {
          const monthNum = String(m + 1).padStart(2, '0');
          const daysInMonth = monthDays[m];
          const activePcsPerDay = monthPcsCount[m];

          for (let d = 1; d <= daysInMonth; d++) {
            const dayStr = String(d).padStart(2, '0');
            const dateIso = `2026-${monthNum}-${dayStr}`;

            // For future dates in Oct/Nov/Dec, only seed selected weekend bootcamp/tournament pre-bookings
            if (dateIso > todaySaratovStr) {
              if (m >= 10 && (d === 7 || d === 14 || d === 21 || d === 28)) {
                for (let slotIdx = 0; slotIdx < activePcsPerDay; slotIdx++) {
                  const pc = ((d + slotIdx * 3) % 10) + 1;
                  const player = players[(seq + slotIdx) % players.length];
                  const startHour = 14 + (slotIdx % 2) * 4;
                  const hours = 6 + (slotIdx % 3) * 2; // 6-10h tournament bootcamp
                  const startTs = Date.parse(`${dateIso}T${String(startHour).padStart(2, '0')}:00:00+04:00`);
                  const endTs = startTs + hours * 3600000;
                  const rate = pc > 6 ? 250 : 150;
                  const total = rate * hours;
                  const bId = `2026${monthNum}${dayStr}-pre-${String(seq).padStart(4, '0')}`;
                  insertBookingStmt.run(
                    bId,
                    player.id,
                    player.name,
                    pc,
                    startTs,
                    endTs,
                    total,
                    'active',
                    nowMs - 86400000 * 3
                  );
                  seq++;
                }
              }
              continue;
            }

            // Skip today in the historical loop; today is seeded with precision below
            if (dateIso === todaySaratovStr) continue;

            // Seed daily sessions for past days of 2026 (Jan 1 .. yesterday)
            const isWeekend = (d + m * 3) % 7 === 0 || (d + m * 3) % 7 === 6;
            const dailySessions = isWeekend ? Math.min(10, activePcsPerDay + 1) : activePcsPerDay;

            for (let s = 0; s < dailySessions; s++) {
              const pc = ((d + s) % 10) + 1;
              const player = players[(seq + d + s) % players.length];
              const startHour = 10 + ((s * 3 + d) % 11); // between 10:00 and 20:00
              const hours = 5 + ((d + s + m) % 6); // 5 to 10 hours
              const startTs = Date.parse(
                `${dateIso}T${String(startHour).padStart(2, '0')}:${s % 2 === 0 ? '00' : '30'}:00+04:00`
              );
              const endTs = startTs + hours * 3600000;
              const rate = pc > 6 ? 250 : 150;
              const promoMult = (seq % 9 === 0) ? 0.85 : 1;
              const total = Math.round(rate * hours * promoMult);
              const status = (seq % 29 === 0) ? 'cancelled' : 'active';
              const bId = `2026${monthNum}${dayStr}-hist-${String(seq).padStart(4, '0')}`;

              insertBookingStmt.run(
                bId,
                player.id,
                player.name,
                pc,
                startTs,
                endTs,
                total,
                status,
                startTs - 7200000
              );
              seq++;
            }
          }
        }
        DB.sqlite.exec('COMMIT');
        console.log(`[FRAG] Seeded ${seq - 1} historical 2026 club bookings (Jan–Dec 2026).`);
      } catch (seedErr) {
        DB.sqlite.exec('ROLLBACK');
        console.error('[FRAG] Error seeding 2026 history:', seedErr);
      }
    }

    // Always ensure today has realistic completed sessions + 4 live in-game sessions right now
    const nowMs = Date.now();
    const currentHalfHour = Math.floor(nowMs / 1800000) * 1800000;
    const todayStartCheck = currentHalfHour - 12 * 3600000;
    const todayEndCheck = currentHalfHour + 12 * 3600000;
    const todayCountRow = await DB.prepare(
      "SELECT COUNT(*) as cnt FROM bookings WHERE status='active' AND start >= ? AND start <= ?"
    )
      .bind(todayStartCheck, todayEndCheck)
      .first();

    if (Number(todayCountRow?.cnt || 0) < 5) {
      DB.sqlite.exec('BEGIN');
      try {
        const insertTodayStmt = DB.sqlite.prepare(
          "INSERT OR IGNORE INTO bookings (id,owner,name,pc,start,end,total,status,created) SELECT ?,?,?,?,?,?,?,'active',? WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE pc=? AND status='active' AND start < ? AND end > ?)"
        );

        // 1. Morning / earlier today completed sessions (6 sessions earlier today)
        const earlierConfigs = [
          { pc: 1, hoursAgo: 9, duration: 4, playerIdx: 0 },
          { pc: 3, hoursAgo: 8, duration: 5, playerIdx: 2 },
          { pc: 4, hoursAgo: 7, duration: 4, playerIdx: 4 },
          { pc: 7, hoursAgo: 9, duration: 5, playerIdx: 1 },
          { pc: 8, hoursAgo: 7, duration: 4, playerIdx: 3 },
          { pc: 9, hoursAgo: 6, duration: 4, playerIdx: 5 },
        ];
        for (const cfg of earlierConfigs) {
          const st = currentHalfHour - cfg.hoursAgo * 3600000;
          const en = st + cfg.duration * 3600000;
          const rate = cfg.pc > 6 ? 250 : 150;
          const p = players[cfg.playerIdx];
          const bId = `today-done-pc${cfg.pc}-${st}`;
          insertTodayStmt.run(
            bId,
            p.id,
            p.name,
            cfg.pc,
            st,
            en,
            rate * cfg.duration,
            st - 3600000,
            cfg.pc,
            en,
            st
          );
        }

        // 2. Live in-game sessions right now (4 PCs in game: PC 02, PC 05, PC 08, PC 10; 6 PCs remain free!)
        const liveConfigs = [
          { pc: 2, startedHalfHoursAgo: 2, totalHours: 3, playerIdx: 6 }, // Standard
          { pc: 5, startedHalfHoursAgo: 1, totalHours: 3, playerIdx: 7 }, // Standard
          { pc: 8, startedHalfHoursAgo: 2, totalHours: 4, playerIdx: 1 }, // VIP
          { pc: 10, startedHalfHoursAgo: 1, totalHours: 3, playerIdx: 0 }, // VIP
        ];
        for (const cfg of liveConfigs) {
          const st = currentHalfHour - cfg.startedHalfHoursAgo * 1800000;
          const en = st + cfg.totalHours * 3600000;
          const rate = cfg.pc > 6 ? 250 : 150;
          const p = players[cfg.playerIdx];
          const bId = `live-now-pc${cfg.pc}-${st}`;
          insertTodayStmt.run(
            bId,
            p.id,
            p.name,
            cfg.pc,
            st,
            en,
            rate * cfg.totalHours,
            st - 1800000,
            cfg.pc,
            en,
            st
          );
        }

        // 3. Upcoming evening sessions later today (3 sessions starting in +3h..+4h)
        const upcomingConfigs = [
          { pc: 3, startsInHours: 3, totalHours: 4, playerIdx: 8 },
          { pc: 6, startsInHours: 4, totalHours: 3, playerIdx: 9 },
          { pc: 9, startsInHours: 3, totalHours: 5, playerIdx: 10 },
        ];
        for (const cfg of upcomingConfigs) {
          const st = currentHalfHour + cfg.startsInHours * 3600000;
          const en = st + cfg.totalHours * 3600000;
          const rate = cfg.pc > 6 ? 250 : 150;
          const p = players[cfg.playerIdx];
          const bId = `upcoming-today-pc${cfg.pc}-${st}`;
          insertTodayStmt.run(
            bId,
            p.id,
            p.name,
            cfg.pc,
            st,
            en,
            rate * cfg.totalHours,
            nowMs - 900000,
            cfg.pc,
            en,
            st
          );
        }

        DB.sqlite.exec('COMMIT');
      } catch (liveErr) {
        DB.sqlite.exec('ROLLBACK');
        console.error('[FRAG] Error seeding live sessions:', liveErr);
      }
    }
  } catch (err) {
    console.error('[FRAG] Error initializing club data:', err);
  }
}
await initDefaultAdminAndSeed2026();

// Basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// Health check endpoint for launcher and monitoring
app.get('/desktop-health', (req, res) => {
  res.json({ app: 'FRAG_DESKTOP_V1', status: 'ok', time: Date.now() });
});

// API routes handled by the robust club API
app.all('/api/*', async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${port}`;
    const fullUrl = `${protocol}://${host}${req.originalUrl}`;

    // Read body buffer if POST/PUT/DELETE
    let bodyBuffer: Buffer | undefined = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      bodyBuffer = Buffer.concat(chunks);
    }

    const headers = new Headers();
    for (const [key, val] of Object.entries(req.headers)) {
      if (val !== undefined) {
        headers.set(key, Array.isArray(val) ? val.join('; ') : val);
      }
    }

    // Ensure origin is set for internal validation
    if (!headers.get('origin')) {
      headers.set('origin', `${protocol}://${host}`);
    }

    const webReq = new Request(fullUrl, {
      method: req.method,
      headers,
      ...(bodyBuffer && bodyBuffer.length ? { body: new Uint8Array(bodyBuffer) } : {}),
    });

    const webRes = await handleApi(webReq, {
      DB,
      CLIENT_IP: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
      ADMIN_PASSWORD: adminPasswordEnv,
      PASSWORD_ITERATIONS: 100000,
    });

    res.status(webRes.status);
    webRes.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const resArrayBuffer = await webRes.arrayBuffer();
    res.end(Buffer.from(resArrayBuffer));
  } catch (error: any) {
    console.error('[FRAG] API error:', error?.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Не удалось выполнить запрос к серверу' });
    }
  }
});

// In development, hook into Vite middlewares. In production, serve dist.
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(resolve(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(resolve(__dirname, 'dist', 'index.html'));
  });
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      ws: {
        server: httpServer,
      },
    },
    appType: 'spa',
  });

  // Prevent @vite/client from throwing unhandled WebSocket rejections in proxied preview environments
  app.get('/@vite/client', async (req, res, next) => {
    try {
      const result = await vite.transformRequest(req.originalUrl);
      if (result?.code) {
        const patchedCode = result.code
          .replace('console.debug("[vite] connecting...");', '')
          .replace(
            'transport.connect(createHMRHandler(handleMessage));',
            '/* HMR WebSocket connection disabled in preview environment */'
          );
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).end(patchedCode);
        return;
      }
    } catch {
      // Fallback to standard Vite middleware
    }
    next();
  });

  app.use(vite.middlewares);
}

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`[FRAG] Server running at http://localhost:${port}`);
});
