import React from 'react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { 
    LayoutDashboard, 
    Send, 
    FileText, 
    Wallet, 
    Trophy, 
    User,
    Shield,
    LifeBuoy
} from 'lucide-react';

const navItems = [
  { label: 'Programs', path: '/researcher', icon: Shield },
  { label: 'My Reports', path: '/researcher/reports', icon: FileText },
  { label: 'Wallet', path: '/researcher/wallet', icon: Wallet },
  { label: 'Leaderboard', path: '/researcher/leaderboard', icon: Trophy },
  { label: 'Support', path: '/researcher/support', icon: LifeBuoy },
];

export default function ResearcherLayout() {
  return (
     <DashboardLayout navItems={navItems} userRole="researcher" />
  );
}
