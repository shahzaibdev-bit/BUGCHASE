import React from 'react';
import { DashboardLayout } from './DashboardLayout';

const navItems = [
  { label: 'Dashboard', path: '/company' },
  { label: 'Programs', path: '/company/programs' },
  { label: 'Assets', path: '/company/assets' },
  { label: 'Reports', path: '/company/reports' },
  { label: 'Analytics', path: '/company/analytics' },
  { label: 'Escrow', path: '/company/escrow' },
  { label: 'Settings', path: '/company/settings' },
];

export default function CompanyLayout() {
  return <DashboardLayout navItems={navItems} userRole="company" />;
}
