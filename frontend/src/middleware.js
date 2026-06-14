import { NextResponse } from 'next/server';

export function middleware(req) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';

  const isLocalhost = hostname.includes('localhost');

  // ==========================
  // SUBDOMAIN DETECTION
  // ==========================
  const isHubSubdomain =
    hostname === 'hub.example.com' ||
    hostname.startsWith('hub.localhost');

  const isAdminSubdomain =
    hostname === 'admin.example.com' ||
    hostname.startsWith('admin.localhost');

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

    newUrl.pathname =
      url.pathname.replace(/^\/hub/, '') || '/';

    newUrl.host = isLocalhost
      ? `hub.${hostname}`
      : 'hub.example.com';

    return NextResponse.redirect(newUrl);
  }

  // ==========================
  // ADMIN REDIRECTS
  // ==========================

  if (isAdminSubdomain && url.pathname.startsWith('/admin')) {
    const newUrl = new URL(req.url);

    newUrl.pathname =
      url.pathname.replace(/^\/admin/, '') || '/';

    return NextResponse.redirect(newUrl);
  }

  if (!isAdminSubdomain && url.pathname.startsWith('/admin')) {
    const newUrl = new URL(req.url);

    newUrl.pathname =
      url.pathname.replace(/^\/admin/, '') || '/';

    newUrl.host = isLocalhost
      ? `admin.${hostname}`
      : 'admin.example.com';

    return NextResponse.redirect(newUrl);
  }

  // ==========================
  // INTERNAL REWRITES
  // ==========================

  if (isHubSubdomain) {
    const targetPath =
      url.pathname === '/' ? '' : url.pathname;

    return NextResponse.rewrite(
      new URL(`/hub${targetPath}${url.search}`, req.url)
    );
  }

  if (isAdminSubdomain) {
    const targetPath =
      url.pathname === '/' ? '' : url.pathname;

    return NextResponse.rewrite(
      new URL(`/admin${targetPath}${url.search}`, req.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|smsram.jpg).*)',
  ],
};