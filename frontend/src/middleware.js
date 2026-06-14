import { NextResponse } from 'next/server';

export function middleware(req) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  
  // Directly pull your apex root domain from the systemic environment (e.g., 'smsram.me')
  const baseDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

  if (!baseDomain) {
    console.error('[Middleware Warning] NEXT_PUBLIC_ROOT_DOMAIN variable missing from env configuration grid.');
    return NextResponse.next();
  }

  // ==========================
  // SUBDOMAIN DETECTION
  // ==========================
  const isHubSubdomain = hostname === `hub.${baseDomain}`;
  const isAdminSubdomain = hostname === `admin.${baseDomain}`;

  // ==========================
  // HUB REDIRECTS
  // ==========================
  if (isHubSubdomain && url.pathname.startsWith('/hub')) {
    const newUrl = new URL(req.url);
    newUrl.pathname = url.pathname.replace(/^\/hub/, '') || '/';
    return NextResponse.redirect(newUrl);
  }

  if (!isHubSubdomain && url.pathname.startsWith('/hub')) {
    const newUrl = new URL(req.url);
    newUrl.pathname = url.pathname.replace(/^\/hub/, '') || '/';
    newUrl.host = `hub.${baseDomain}`;
    return NextResponse.redirect(newUrl);
  }

  // ==========================
  // ADMIN REDIRECTS
  // ==========================
  if (isAdminSubdomain && url.pathname.startsWith('/admin')) {
    const newUrl = new URL(req.url);
    newUrl.pathname = url.pathname.replace(/^\/admin/, '') || '/';
    return NextResponse.redirect(newUrl);
  }

  if (!isAdminSubdomain && url.pathname.startsWith('/admin')) {
    const newUrl = new URL(req.url);
    newUrl.pathname = url.pathname.replace(/^\/admin/, '') || '/';
    newUrl.host = `admin.${baseDomain}`;
    return NextResponse.redirect(newUrl);
  }

  // ==========================
  // INTERNAL REWRITES
  // ==========================
  if (isHubSubdomain) {
    const targetPath = url.pathname === '/' ? '' : url.pathname;
    return NextResponse.rewrite(new URL(`/hub${targetPath}${url.search}`, req.url));
  }

  if (isAdminSubdomain) {
    const targetPath = url.pathname === '/' ? '' : url.pathname;
    return NextResponse.rewrite(new URL(`/admin${targetPath}${url.search}`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon.jpg|smsram.jpg).*)',
  ],
};