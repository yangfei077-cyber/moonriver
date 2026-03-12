'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useUserContext } from '@/contexts/UserContext';

const DASHBOARD_PATHS = ['/admin', '/creator', '/student'];

function isDashboardPath(path: string) {
  return DASHBOARD_PATHS.some((p) => path.startsWith(p));
}

const LoadingScreen = () => (
  <div className="min-h-screen bg-[#FFFCF5] flex justify-center items-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dash-primary mx-auto mb-4" />
      <p className="text-text-light text-lg">Loading...</p>
    </div>
  </div>
);

export default function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useUser();
  const { isAdmin, isCreator, loadingRoles } = useUserContext();

  const needsRedirect =
    !loadingRoles &&
    isDashboardPath(pathname || '') &&
    ((isAdmin && !pathname?.startsWith('/admin')) ||
      (isCreator && !isAdmin && !pathname?.startsWith('/creator')));

  const redirectTo =
    isAdmin && !pathname?.startsWith('/admin')
      ? '/admin/dashboard'
      : isCreator && !isAdmin && !pathname?.startsWith('/creator')
        ? '/creator/dashboard'
        : null;

  useEffect(() => {
    if (redirectTo) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router]);

  if (isLoading || !user) {
    return <>{children}</>;
  }

  if (loadingRoles && isDashboardPath(pathname || '')) {
    return <LoadingScreen />;
  }

  if (needsRedirect) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
