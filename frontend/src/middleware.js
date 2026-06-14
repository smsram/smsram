import { NextResponse } from 'next/server';

export function middleware(req) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';

  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');

  // ======================================================================
  // DYNAMIC ROOT DOMAIN EXTRACTION
  // ======================================================================
  // If request is 'admin.smsram.me' or 'hub.smsram.me', baseDomain becomes 'smsram.me'
  // If it's just 'smsram.me', baseDomain remains 'smsram.me'
  const baseDomain = hostname.replace(/^(admin\.|hub\.)/, '');

  // ==========================
  // SUBDOMAIN DETECTION
  // ==========================
  const isHubSubdomain = isLocalhost 
    ? hostname.startsWith('hub.localhost') 
    : hostname.startsWith(`hub.${baseDomain}`);

  const isAdminSubdomain = isLocalhost 
    ? hostname.startsWith('admin.localhost') 
    : hostname.startsWith(`admin.${baseDomain}`);

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
    
    // Dynamically preserve localhost ports or swap production hosts safely
    newUrl.host = isLocalhost ? `hub.localhost:${url.port || 3000}` : `hub.${baseDomain}`;
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
    
    // Dynamically preserve localhost ports or swap production hosts safely
    newUrl.host = isLocalhost ? `admin.localhost:${url.port || 3000}` : `admin.${baseDomain}`;
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