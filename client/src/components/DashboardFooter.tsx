import { Link } from 'react-router-dom';
import ContactSupportButton from '@/components/support/ContactSupportButton';

interface FooterLink {
    label: string;
    to: string;
}

const ROLE_LINKS: Record<string, FooterLink[]> = {
    researcher: [
        { label: 'Programs', to: '/researcher' },
        { label: 'My Reports', to: '/researcher/reports' },
        { label: 'Wallet', to: '/researcher/wallet' },
        { label: 'Leaderboard', to: '/researcher/leaderboard' },
    ],
    company: [
        { label: 'Dashboard', to: '/company' },
        { label: 'Programs', to: '/company/programs' },
        { label: 'Reports', to: '/company/reports' },
        { label: 'Analytics', to: '/company/analytics' },
        { label: 'Escrow', to: '/company/escrow' },
    ],
    triager: [
        { label: 'Triage Queue', to: '/triager' },
        { label: 'Assigned Reports', to: '/triager/assigned' },
        { label: 'Expertise Settings', to: '/triager/settings' },
    ],
};

const RESOURCE_LINKS: FooterLink[] = [
    { label: 'About Us', to: '/company/about' },
    { label: 'Contact', to: '/company/contact' },
    { label: 'Careers', to: '/company/careers' },
];

const LEGAL_LINKS: FooterLink[] = [
    { label: 'Rules of Engagement', to: '/legal/rules' },
    { label: 'Legal Immunity', to: '/legal/immunity' },
    { label: 'Legal Framework', to: '/legal/framework' },
    { label: 'Data Sovereignty', to: '/legal/sovereignty' },
];

const linkClass =
    'text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors';

const FooterColumn = ({ title, links }: { title: string; links: FooterLink[] }) => (
    <div className="space-y-3">
        <h4 className="text-xs font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-500 font-bold">
            {title}
        </h4>
        <ul className="space-y-2">
            {links.map((l) => (
                <li key={l.to + l.label}>
                    <Link to={l.to} className={linkClass}>
                        {l.label}
                    </Link>
                </li>
            ))}
        </ul>
    </div>
);

interface DashboardFooterProps {
    userRole: string;
}

export default function DashboardFooter({ userRole }: DashboardFooterProps) {
    const roleLinks = ROLE_LINKS[userRole] || [];
    const year = new Date().getFullYear();

    return (
        <footer className="relative z-10 mt-16 border-t border-black/15 dark:border-white/10 bg-gray-100 dark:bg-black/60 backdrop-blur-md">
            <div className="container mx-auto px-4 py-12 max-w-7xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
                    {/* Brand + support */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-zinc-300 dark:bg-white/20 flex items-center justify-center rounded-sm">
                                <span className="text-xs font-bold text-black dark:text-white">B</span>
                            </div>
                            <span className="font-display font-bold tracking-wider text-zinc-900 dark:text-white">
                                BUGCHASE
                            </span>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-xs">
                            Have a problem or a question? Our support team is here to help.
                        </p>
                        <ContactSupportButton variant="outline" size="sm" />
                    </div>

                    {roleLinks.length > 0 && (
                        <FooterColumn title="Dashboard" links={roleLinks} />
                    )}
                    <FooterColumn title="Resources" links={RESOURCE_LINKS} />
                    <FooterColumn title="Legal" links={LEGAL_LINKS} />
                </div>

                <div className="mt-12 pt-6 border-t border-black/10 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-zinc-500 dark:text-zinc-500 font-mono">
                        &copy; {year} BUGCHASE PLATFORM. ALL RIGHTS RESERVED.
                    </div>
                    <div className="flex items-center gap-6">
                        <Link to="/legal/rules" className="text-xs text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-mono uppercase tracking-wider transition-colors">
                            Terms
                        </Link>
                        <Link to="/legal/sovereignty" className="text-xs text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-mono uppercase tracking-wider transition-colors">
                            Privacy
                        </Link>
                        <Link to="/company/contact" className="text-xs text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-mono uppercase tracking-wider transition-colors">
                            Contact
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
