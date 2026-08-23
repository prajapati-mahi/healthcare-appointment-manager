import React from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, Menu } from 'lucide-react';
import { NotificationBell } from '../common/NotificationBell';
import { ProfileDropdown } from '../common/ProfileDropdown';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="flex items-center justify-between px-4 sm:px-6 h-16">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
              <Stethoscope className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-base sm:text-lg bg-gradient-to-r from-blue-700 to-teal-600 bg-clip-text text-transparent">
              HealthCare App
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <NotificationBell />
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
};
