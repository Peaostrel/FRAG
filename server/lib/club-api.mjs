// Framework-independent API: SQLite in the standalone/full-stack server.
const enc = new TextEncoder();

const json = (data, status = 200, headers = {}) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  });

const random = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');

const hex = (b) =>
  Array.from(new Uint8Array(b), (v) => v.toString(16).padStart(2, '0')).join('');

const digest = async (s) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

async function equal(a, b) {
  const x = await digest(a);
  const y = await digest(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

export async function hashPassword(password, iterations = 100000) {
  const salt = random();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations },
    key,
    256
  );
  return [iterations, salt, hex(derived)].join(':');
}

async function checkPassword(password, stored) {
  const [n, salt, expected] = stored.split(':');
  const iterations = Number(n);
  if (!iterations || !salt || !expected) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const actual = hex(
    await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations },
      key,
      256
    )
  );
  return equal(actual, expected);
}

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role });

const token = (r) => {
  const cookieToken = r.headers
    .get('cookie')
    ?.match(/(?:^|;\s*)frag_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (cookieToken) return cookieToken;
  const headerToken = r.headers.get('x-frag-token')?.trim();
  if (headerToken && /^[a-f0-9]{64}$/.test(headerToken)) return headerToken;
  return null;
};

const cookie = (r, value, age) => {
  const isHttps =
    new URL(r.url).protocol === 'https:' ||
    r.headers.get('origin')?.startsWith('https://') ||
    r.headers.get('x-forwarded-proto')?.includes('https');
  const sameSiteAttr = isHttps
    ? 'SameSite=None; Secure; Partitioned'
    : 'SameSite=Lax';
  return `frag_session=${value}; HttpOnly; ${sameSiteAttr}; Path=/; Max-Age=${age}`;
};

async function user(r, db) {
  const t = token(r);
  if (!t) return null;
  return db
    .prepare(
      'SELECT u.id,u.email,u.name,u.role FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires>?'
    )
    .bind(await digest(t), Date.now())
    .first();
}

async function session(r, db, u) {
  const t = random();
  await db.prepare('DELETE FROM sessions WHERE expires<?').bind(Date.now()).run();
  await db
    .prepare('INSERT INTO sessions (token_hash,user_id,expires) VALUES (?,?,?)')
    .bind(await digest(t), u.id, Date.now() + 7 * 86400000)
    .run();
  return json({ user: publicUser(u), token: t }, 200, {
    'Set-Cookie': cookie(r, t, 604800),
  });
}

async function isRateLimited(db, key, maxAttempts = 15) {
  const hashed = await digest(key);
  const now = Date.now();
  const row = await db
    .prepare('SELECT attempts, reset_at FROM auth_limits WHERE key=?')
    .bind(hashed)
    .first();
  if (!row || row.reset_at <= now) return false;
  return row.attempts >= maxAttempts;
}

async function recordAuthFailure(db, key) {
  const hashed = await digest(key);
  const now = Date.now();
  await db
    .prepare(
      'INSERT INTO auth_limits (key,attempts,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN reset_at<=? THEN 1 ELSE attempts+1 END, reset_at=CASE WHEN reset_at<=? THEN ? ELSE reset_at END'
    )
    .bind(hashed, now + 900000, now, now, now + 900000)
    .run();
}

async function clearAuthLimit(db, key) {
  const hashed = await digest(key);
  await db.prepare('DELETE FROM auth_limits WHERE key=?').bind(hashed).run();
}

function isOriginAllowed(r, u) {
  const originHeader = r.headers.get('origin');
  if (!originHeader) return true;
  try {
    const origUrl = new URL(originHeader);
    if (origUrl.host === u.host) return true;
    if (
      u.hostname === 'localhost' ||
      u.hostname === '127.0.0.1' ||
      u.hostname === '0.0.0.0'
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function handleApi(r, env) {
  const db = env.DB;
  const u = new URL(r.url);
  const path = u.pathname;
  const method = r.method;

  if (method !== 'GET' && !isOriginAllowed(r, u)) {
    return json({ error: 'Недопустимый источник запроса' }, 403);
  }

  try {
    if (path === '/api/auth' && method === 'GET') {
      return json({ user: await user(r, db) });
    }

    if (path === '/api/auth' && method === 'POST') {
      const text = await r.text();
      if (text.length > 16384) return json({ error: 'Слишком большой запрос' }, 413);

      let b;
      try {
        b = JSON.parse(text);
      } catch {
        return json({ error: 'Неверный запрос' }, 400);
      }
      if (!b || typeof b !== 'object') return json({ error: 'Неверный запрос' }, 400);

      if (b.action === 'logout') {
        const t = token(r);
        if (t) {
          await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(t)).run();
        }
        return json({ ok: true }, 200, { 'Set-Cookie': cookie(r, '', 0) });
      }

      const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
      const password = b.password;

      if (
        !email ||
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        typeof password !== 'string' ||
        password.length < 8 ||
        password.length > 128
      ) {
        return json({ error: 'Введите корректную почту и пароль от 8 до 128 символов' }, 400);
      }

      const ip = env.CLIENT_IP || r.headers.get('cf-connecting-ip') || 'unknown';
      if (
        (await isRateLimited(db, 'ip:' + ip, 40)) ||
        (await isRateLimited(db, 'email:' + email, 12))
      ) {
        return json(
          { error: 'Слишком много неудачных попыток. Повторите через 15 минут.' },
          429,
          { 'Retry-After': '900' }
        );
      }

      if (b.action === 'register') {
        if (typeof b.name !== 'string' || b.name.trim().length < 2 || b.name.trim().length > 40) {
          return json({ error: 'Ник должен содержать от 2 до 40 символов' }, 400);
        }
        let role = 'client';
        if (b.adminCode) {
          if (
            typeof b.adminCode !== 'string' ||
            !env.ADMIN_PASSWORD ||
            !(await equal(b.adminCode, env.ADMIN_PASSWORD))
          ) {
            await recordAuthFailure(db, 'ip:' + ip);
            return json({ error: 'Неверный код владельца клуба' }, 403);
          }
          role = 'admin';
        }
        const id = crypto.randomUUID();
        const passwordHash = await hashPassword(password, env.PASSWORD_ITERATIONS || 100000);
        try {
          await db
            .prepare(
              'INSERT INTO users (id,email,name,password_hash,role,created) VALUES (?,?,?,?,?,?)'
            )
            .bind(id, email, b.name.trim(), passwordHash, role, Date.now())
            .run();
        } catch (e) {
          if (String(e).toLowerCase().includes('unique')) {
            return json(
              { error: 'Аккаунт с этой почтой уже существует — переключитесь на вкладку «Вход»' },
              409
            );
          }
          throw e;
        }
        await clearAuthLimit(db, 'email:' + email);
        return session(r, db, { id, email, name: b.name.trim(), role });
      }

      if (b.action === 'login') {
        const account = await db.prepare('SELECT * FROM users WHERE email=?').bind(email).first();
        const stored =
          account?.password_hash ||
          '100000:0000000000000000000000000000000000000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000';
        const valid = await checkPassword(password, stored);
        if (!account || !valid) {
          await recordAuthFailure(db, 'ip:' + ip);
          await recordAuthFailure(db, 'email:' + email);
          return json({ error: 'Неверная почта или пароль' }, 401);
        }
        await clearAuthLimit(db, 'email:' + email);
        return session(r, db, account);
      }

      return json({ error: 'Неизвестное действие' }, 400);
    }

    if (path !== '/api/bookings') return json({ error: 'Страница не найдена' }, 404);

    // Public floor plan availability check (returns pc, start, end of active overlapping bookings)
    if (method === 'GET' && u.searchParams.has('availability')) {
      const start = Number(u.searchParams.get('start'));
      const end = Number(u.searchParams.get('end'));
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start >= end ||
        end - start > 12 * 3600000
      ) {
        return json({ error: 'Неверный интервал времени' }, 400);
      }
      const rows = await db
        .prepare(
          "SELECT pc, start, end FROM bookings WHERE status='active' AND start < ? AND end > ? ORDER BY start ASC"
        )
        .bind(end, start)
        .all();
      return json(rows.results);
    }

    const me = await user(r, db);
    if (!me) return json({ error: 'Войдите в аккаунт, чтобы управлять бронированиями' }, 401);
    const admin = me.role === 'admin';

    if (method === 'GET') {
      if (u.searchParams.has('admin') && !admin) {
        return json({ error: 'Доступ только для администратора' }, 403);
      }
      if (admin && u.searchParams.has('admin')) {
        const rows = await db
          .prepare(
            'SELECT b.id, b.name, b.pc, b.start, b.end, b.total, b.status, b.created, u.email as ownerEmail FROM bookings b LEFT JOIN users u ON u.id = b.owner ORDER BY b.start DESC LIMIT 5000'
          )
          .all();
        return json(rows.results);
      }
      const rows = await db
        .prepare(
          'SELECT id, name, pc, start, end, total, status, created FROM bookings WHERE owner=? ORDER BY start DESC LIMIT 200'
        )
        .bind(me.id)
        .all();
      return json(rows.results);
    }

    if (method === 'POST') {
      const text = await r.text();
      if (text.length > 16384) return json({ error: 'Слишком большой запрос' }, 413);

      let b;
      try {
        b = JSON.parse(text);
      } catch {
        return json({ error: 'Неверный запрос' }, 400);
      }
      if (!b || typeof b !== 'object') return json({ error: 'Неверный запрос' }, 400);

      const { name, pc, start, hours, promo, walkIn } = b;
      const effectiveName =
        typeof name === 'string' && name.trim().length >= 2 ? name.trim() : me.name;

      if (
        typeof effectiveName !== 'string' ||
        effectiveName.length < 2 ||
        effectiveName.length > 40
      ) {
        return json({ error: 'Укажите имя или игровой ник (от 2 до 40 символов).' }, 400);
      }
      if (!Number.isInteger(pc) || pc < 1 || pc > 10) {
        return json({ error: 'Выберите корректный компьютер (ПК 01–10).' }, 400);
      }
      if (!Number.isInteger(hours) || hours < 1 || hours > 12) {
        return json({ error: 'Длительность должна быть от 1 до 12 часов.' }, 400);
      }
      if (!Number.isSafeInteger(start) || start % 1800000 !== 0) {
        return json({ error: 'Выберите корректное время начала (шаг — 30 минут).' }, 400);
      }

      // Admin walk-in allows current 30-min block (up to 35 mins back); regular client gets 5 mins grace
      const graceMs = admin && walkIn ? 35 * 60 * 1000 : 5 * 60 * 1000;
      if (start < Date.now() - graceMs) {
        return json(
          { error: 'Выбранное время уже прошло. Выберите актуальное время начала.' },
          400
        );
      }
      if (start > Date.now() + 91 * 86400000) {
        return json({ error: 'Бронирование доступно максимум на 90 дней вперёд.' }, 400);
      }

      const end = start + hours * 3600000;
      const total = Math.round(
        (pc > 6 ? 250 : 150) *
          hours *
          (String(promo || '').trim().toLowerCase() === 'btmsh' ? 0.85 : 1)
      );
      const id = crypto.randomUUID();
      const created = Date.now();

      const result = await db
        .prepare(
          "INSERT INTO bookings (id,owner,name,pc,start,end,total,status,created) SELECT ?,?,?,?,?,?,?,'active',? WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE pc=? AND status='active' AND start < ? AND end > ?)"
        )
        .bind(id, me.id, effectiveName, pc, start, end, total, created, pc, end, start)
        .run();

      if (!result.meta.changes) {
        return json(
          {
            error:
              'Этот компьютер уже занят на выбранное время. Выберите другое место или время.',
          },
          409
        );
      }

      return json(
        {
          id,
          name: effectiveName,
          pc,
          start,
          end,
          total,
          status: 'active',
          created,
          ownerEmail: me.email,
        },
        201
      );
    }

    // Extend active booking (+1 hour or custom hours)
    if (method === 'PATCH') {
      const text = await r.text();
      if (text.length > 16384) return json({ error: 'Слишком большой запрос' }, 413);

      let b;
      try {
        b = JSON.parse(text);
      } catch {
        return json({ error: 'Неверный запрос' }, 400);
      }
      const id = b?.id;
      const addHours = Number(b?.addHours ?? 1);
      if (typeof id !== 'string' || !Number.isInteger(addHours) || addHours < 1 || addHours > 6) {
        return json({ error: 'Неверные параметры продления' }, 400);
      }

      const existing = await (admin
        ? db.prepare("SELECT * FROM bookings WHERE id=? AND status='active'").bind(id)
        : db
            .prepare("SELECT * FROM bookings WHERE id=? AND owner=? AND status='active'")
            .bind(id, me.id)
      ).first();

      if (!existing) {
        return json({ error: 'Активная бронь не найдена' }, 404);
      }

      const currentHours = Math.max(1, Math.round((existing.end - existing.start) / 3600000));
      const newHours = currentHours + addHours;
      if (newHours > 24) {
        return json({ error: 'Максимальная длительность одной сессии — 24 часа' }, 400);
      }

      const newEnd = existing.end + addHours * 3600000;
      const conflict = await db
        .prepare(
          "SELECT id, start FROM bookings WHERE pc=? AND id!=? AND status='active' AND start < ? AND end > ? LIMIT 1"
        )
        .bind(existing.pc, existing.id, newEnd, existing.start)
        .first();

      if (conflict) {
        return json(
          {
            error: `Нельзя продлить ПК ${String(existing.pc).padStart(
              2,
              '0'
            )}: следом уже стоит другая бронь.`,
          },
          409
        );
      }

      const hourlyEffective = existing.total / currentHours;
      const newTotal = Math.round(hourlyEffective * newHours);

      await db
        .prepare('UPDATE bookings SET end=?, total=? WHERE id=?')
        .bind(newEnd, newTotal, existing.id)
        .run();

      return json({
        id: existing.id,
        name: existing.name,
        pc: existing.pc,
        start: existing.start,
        end: newEnd,
        total: newTotal,
        status: existing.status,
        created: existing.created,
      });
    }

    if (method === 'DELETE') {
      const id = u.searchParams.get('id');
      const result = await (admin
        ? db.prepare("UPDATE bookings SET status='cancelled' WHERE id=? AND status='active'").bind(id)
        : db
            .prepare("UPDATE bookings SET status='cancelled' WHERE id=? AND owner=? AND status='active'")
            .bind(id, me.id)
      ).run();
      return result.meta.changes
        ? json({ ok: true })
        : json({ error: 'Запись не найдена или уже отменена' }, 404);
    }

    return json({ error: 'Метод не поддерживается' }, 405);
  } catch (e) {
    console.error('Club API error', e instanceof Error ? e.message : 'unknown');
    return json({ error: 'Не удалось выполнить запрос. Повторите позже.' }, 500);
  }
}
