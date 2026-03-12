'use client';

import Link from 'next/link';
import { useUserContext } from '@/contexts/UserContext';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

export default function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  const { user, isAdmin, isCreator, isStudent, displayName } = useUserContext();

  const editProfileHref = isCreator ? '/creator/onboarding' : '/student/onboarding';

  return (
    <header className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold text-text-light">{title}</h1>
        {subtitle && <p className="text-amber-800/70 mt-1">{subtitle}</p>}
        <div className="flex space-x-2 mt-2">
          {isAdmin && (
            <span className="bg-red-100 text-red-800 px-3 py-0.5 rounded-full text-xs font-semibold">
              ADMIN
            </span>
          )}
          {isCreator && (
            <span className="bg-blue-100 text-blue-800 px-3 py-0.5 rounded-full text-xs font-semibold">
              CREATOR
            </span>
          )}
          {isStudent && (
            <span className="bg-green-100 text-green-800 px-3 py-0.5 rounded-full text-xs font-semibold">
              STUDENT
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <Link
          href={editProfileHref}
          title="Edit your interests"
          className="w-11 h-11 rounded-full bg-dash-primary flex items-center justify-center text-white font-semibold text-lg hover:bg-orange-600 transition-colors"
        >
          {(displayName || user?.name || user?.email || 'U').charAt(0).toUpperCase()}
        </Link>
      </div>
    </header>
  );
}
