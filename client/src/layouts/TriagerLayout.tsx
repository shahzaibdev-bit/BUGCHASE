import React from 'react';
import { DashboardLayout } from './DashboardLayout';

const navItems = [
  { label: 'Triage Queue', path: '/triager' },
  { label: 'Assigned Reports', path: '/triager/assigned' },
  { label: 'Expertise Settings', path: '/triager/settings' },
];

export default function TriagerLayout() {
  return <DashboardLayout navItems={navItems} userRole="triager" />;
}
