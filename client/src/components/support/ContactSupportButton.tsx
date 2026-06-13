import { useState, type ReactNode } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { LifeBuoy } from 'lucide-react';
import ContactSupportDialog, { type SupportReportContext } from './ContactSupportDialog';
import { cn } from '@/lib/utils';

interface ContactSupportButtonProps {
    /** When provided, the support request is linked to this report. */
    report?: SupportReportContext;
    variant?: ButtonProps['variant'];
    size?: ButtonProps['size'];
    className?: string;
    label?: ReactNode;
    /** Hide the leading icon. */
    hideIcon?: boolean;
}

/**
 * Self-contained "Contact Support" trigger: renders a button that opens the
 * support dialog. Safe to drop into any dashboard, layout, or report page.
 */
export default function ContactSupportButton({
    report,
    variant = 'outline',
    size = 'sm',
    className,
    label = 'Contact Support',
    hideIcon = false,
}: ContactSupportButtonProps) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button
                type="button"
                variant={variant}
                size={size}
                className={cn(className)}
                onClick={() => setOpen(true)}
            >
                {!hideIcon && <LifeBuoy className="w-4 h-4 mr-2" />}
                {label}
            </Button>
            <ContactSupportDialog open={open} onOpenChange={setOpen} report={report} />
        </>
    );
}
