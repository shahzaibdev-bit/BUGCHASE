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
      { label: 'TRIAGERS', path: '/admin/triagers' }
    ]
  },
  { 
    label: 'OPERATIONS', 
    icon: Layers,
    items: [
      { label: 'PROGRAMS', path: '/admin/programs' },
      { label: 'DISPUTES', path: '/admin/disputes' }
    ]
  },
  { 
    label: 'FINANCE', 
    icon: CreditCard,
    items: [
      { label: 'FINANCIAL HEALTH', path: '/admin/finance' }
    ]
  }
];

export default function AdminLayout() {
  return <DashboardLayout navItems={navItems} userRole="admin" />;
}
