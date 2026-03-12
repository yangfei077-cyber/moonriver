import { Auth0Provider } from '@auth0/nextjs-auth0/client';
import './globals.css';
import { Poppins } from 'next/font/google';
import { UserProvider } from '../contexts/UserContext';
import RoleGuard from '../components/RoleGuard';

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
});

export const metadata = {
  title: 'Moonriver Music Education Platform',
  description: 'Learn music from world-class creators. Personalized lessons, smart scheduling, and AI-powered learning.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={poppins.className} style={{ backgroundColor: '#FFFBEB' }}>
        <Auth0Provider>
          <UserProvider>
            <RoleGuard>{children}</RoleGuard>
          </UserProvider>
        </Auth0Provider>
      </body>
    </html>
  );
}
