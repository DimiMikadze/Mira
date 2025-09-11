import { NextRequest, NextResponse } from 'next/server';

interface AuthUser {
  username: string;
  password: string;
}

function parseAuthUsers(): AuthUser[] {
  const raw = process.env.BASIC_AUTH_USERS || ''; // "user1:pass1,user2:pass2"
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf(':');
      if (i === -1) return null; // skip malformed instead of throwing
      return { username: pair.slice(0, i).trim(), password: pair.slice(i + 1).trim() };
    })
    .filter(Boolean) as AuthUser[];
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function validateBasicAuth(authHeader: string, users: AuthUser[]): boolean {
  if (!authHeader?.startsWith('Basic ')) return false;
  try {
    const decoded = atob(authHeader.slice(6).trim()); // "username:password"
    const sep = decoded.indexOf(':');
    if (sep === -1) return false;
    const u = decoded.slice(0, sep);
    const p = decoded.slice(sep + 1);
    return users.some(({ username, password }) => safeEqual(u, username) && safeEqual(p, password));
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const isProd = process.env.NODE_ENV === 'production';
  const users = parseAuthUsers();

  // 1) Allow CORS preflight (useful if you call /api cross-origin)
  if (request.method === 'OPTIONS') return NextResponse.next();

  // Dev: skip
  if (!isProd) return NextResponse.next();

  // Prod: fail closed if misconfigured
  if (users.length === 0) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Mira"',
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain',
      },
    });
  }

  if (!validateBasicAuth(request.headers.get('authorization') || '', users)) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Mira"',
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain',
      },
    });
  }

  return NextResponse.next();
}

// Protect everything except Next internals & common static assets.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:css|js|png|jpg|jpeg|svg|ico|webp|woff|woff2|ttf)).*)',
  ],
};
