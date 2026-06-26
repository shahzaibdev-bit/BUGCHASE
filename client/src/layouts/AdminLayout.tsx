import React from 'react';
import { DashboardLayout } from './DashboardLayout';

import { 
  LayoutGrid, 
  Users, 
  Layers, 
  CreditCard 
} from 'lucide-react';

const navItems = [
  { 
    label: 'SYSTEM', 
    icon: LayoutGrid,
    items: [
      { label: 'DASHBOARD', path: '/admin' },
      { label: 'ACTIVITY LOGS', path: '/admin/logs' },
      { label: 'ANNOUNCEMENTS', path: '/admin/announcements' }
    ]
  },
  { 
    label: 'USER CORP', 
    icon: Users,
    items: [
      { label: 'USER MANAGEMENT', path: '/admin/users' },
      { label: 'TRIAGERS', path: '/admin/triagers' },
      { label: 'SUPPORT TEAM', path: '/admin/support' }
    ]
  },
  { 
    label: 'OPERATIONS', 
    icon: Layers,
    items: [
      { label: 'PROGRAMS', path: '/admin/programs' }
    ]
  },
  { 
    label: 'FINANCE', 
    icon: CreditCard,
    items: [
      { label: 'OVERVIEW', path: '/admin/finance' },
      { label: 'COMPANY FUNDS', path: '/admin/finance/companies' },
      { label: 'PLATFORM ACCOUNT', path: '/admin/finance/platform' },
    ]
  }
];

export default function AdminLayout() {
  return <DashboardLayout navItems={navItems} userRole="admin" />;
}
