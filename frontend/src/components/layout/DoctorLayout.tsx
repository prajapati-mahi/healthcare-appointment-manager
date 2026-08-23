import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar, NavItem } from './Sidebar';
import {
  LayoutDashboard,
  CalendarCheck,
  Clock,
  User,
} from 'lucide-react';

export const DoctorLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems: NavItem[] = [
    { label: 'Overview', href: '/doctor', icon: LayoutDashboard, exact: true },
    { label: 'Appointments', href: '/doctor/appointments', icon: CalendarCheck },
    { label: 'Schedule & Leaves', href: '/doctor/availability', icon: Clock },
    { label: 'Doctor Profile', href: '/doctor/profile', icon: User },
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
