import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar, NavItem } from './Sidebar';
import {
  LayoutDashboard,
  UserCheck,
  Users,
  CalendarDays,
  BellRing,
  CalendarOff,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems: NavItem[] = [
    { label: 'Admin Dashboard', href: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'Manage Doctors', href: '/admin/doctors', icon: UserCheck },
    { label: 'Manage Users', href: '/admin/patients', icon: Users },
    { label: 'All Appointments', href: '/admin/appointments', icon: CalendarDays },
    { label: 'Leave Oversight', href: '/admin/leaves', icon: CalendarOff },
    { label: 'Notification Logs', href: '/admin/notifications', icon: BellRing },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          items={navItems}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
