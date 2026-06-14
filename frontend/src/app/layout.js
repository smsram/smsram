import './globals.css';

export const metadata = {
  title: {
    default: 'Meher Siva Ram Sorampudi | Portfolio',
    template: '%s | Meher Siva Ram'
  },
  description: 'Professional engineering portfolio of Meher Siva Ram Sorampudi. Specializing in high-performance full-stack architectures, Next.js development, and machine learning solutions.',
  keywords: [
    'Meher Siva Ram Sorampudi',
    'SMSRam',
    'Full-Stack Developer Portfolio',
    'Machine Learning Engineer',
    'Next.js Portfolio',
    'Software Engineer Andhra Pradesh',
    'AI Web Applications'
  ],
  authors: [{ name: 'Meher Siva Ram Sorampudi' }],
  creator: 'Meher Siva Ram Sorampudi',
  robots: {
    index: true,
    follow: true,
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Instant Theme Initialization Script - prevents color flashing on reload */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var storedTheme = localStorage.getItem('theme');
                  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
                  if (storedTheme === 'dark' || (!storedTheme && darkQuery.matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}