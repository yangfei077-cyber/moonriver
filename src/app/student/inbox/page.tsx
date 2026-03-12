'use client';

import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import InboxList from '@/components/InboxList';

export default function StudentInboxPage() {
  return (
    <div className="min-h-screen bg-background-light">
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          <DashboardHeader
            title="Inbox"
            subtitle="Your notifications and updates"
          />
          <InboxList />
        </main>
      </div>
    </div>
  );
}
