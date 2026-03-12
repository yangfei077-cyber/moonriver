'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUserContext } from '@/contexts/UserContext';
import {
  LayoutDashboard, Music, Calendar, Users, Bot, LogOut, GraduationCap,
  Search, BookOpen, BarChart3, MessageSquare, Settings, Heart, Inbox
} from 'lucide-react';

const studentLinks = [
  { href: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/student/matches', label: 'Find Instructors', icon: Heart },
  { href: '/student/courses', label: 'My Courses', icon: Music },
  { href: '/student/appointments', label: 'Schedule', icon: Calendar },
  { href: '/student/inbox', label: 'Inbox', icon: Inbox },
  { href: '/student/progress', label: 'Progress', icon: BarChart3 },
];

const creatorLinks = [
  { href: '/creator/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/creator/matches', label: 'Find Students', icon: Heart },
  { href: '/creator/courses', label: 'My Courses', icon: BookOpen },
  { href: '/creator/schedule', label: 'Schedule', icon: Calendar },
  { href: '/creator/inbox', label: 'Inbox', icon: Inbox },
  { href: '/creator/students', label: 'My Students', icon: GraduationCap },
];

const adminLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/dashboard', label: 'RAG Search', icon: Search },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isAdmin, isCreator, isStudent } = useUserContext();

  const links = isAdmin ? adminLinks : isCreator ? creatorLinks : studentLinks;

  return (
    <aside className="w-64 bg-white flex-shrink-0 p-6 hidden lg:flex flex-col justify-between border-r border-gray-100">
      <div>
        <Link className="text-3xl font-display mb-10 block" href="/">
          <span className="logo-m text-dash-primary">M</span>
          <span className="text-text-light">oonriver</span>
        </Link>
        <nav className="space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href + link.label}
                href={link.href}
                className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'text-dash-primary bg-orange-50 font-semibold'
                    : 'text-gray-500 hover:text-dash-primary hover:bg-orange-50/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <button
        onClick={() => (window.location.href = '/auth/logout')}
        className="flex items-center space-x-3 text-gray-500 hover:text-dash-primary hover:bg-orange-50/50 px-4 py-2.5 rounded-lg transition-colors w-full"
      >
        <LogOut className="w-5 h-5" />
        <span>Logout</span>
      </button>
    </aside>
  );
}
