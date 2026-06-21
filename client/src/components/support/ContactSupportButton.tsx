import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, type ButtonProps } from '@/components/ui/button';
import { LifeBuoy, ExternalLink } from 'lucide-react';
import ContactSupportDialog, { type SupportReportContext } from './ContactSupportDialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetchJson } from '@/lib/api';

type ActiveDispute = {
  _id: string;
  disputeId: string;
  status: string;
  subject: string;
};

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
 * When linked to a report, blocks a second open ticket until the first is resolved.
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
  const [activeDispute, setActiveDispute] = useState<ActiveDispute | null>(null);
  const [checking, setChecking] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const supportBase = `/${user?.role || 'researcher'}/support`;

  const checkActiveTicket = useCallback(async () => {
    if (!report?.id) {
      setActiveDispute(null);
      return;
    }
    setChecking(true);
    try {
      const res = await apiFetchJson<{ data: { activeDispute: ActiveDispute | null } }>(
        `/disputes/mine/active-for-report/${encodeURIComponent(report.id)}`,
      );
      setActiveDispute(res.data.activeDispute);
    } catch {
      setActiveDispute(null);
    } finally {
      setChecking(false);
    }
  }, [report?.id]);

  useEffect(() => {
    void checkActiveTicket();
  }, [checkActiveTicket]);

  const handleClick = () => {
    if (activeDispute) {
      navigate(`${supportBase}/${activeDispute._id}`);
      return;
    }
    setOpen(true);
  };

  const handleDialogClose = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) void checkActiveTicket();
  };

  const buttonLabel = activeDispute
    ? `Open ticket (${activeDispute.disputeId})`
    : label;

  return (
    <>
      <Button
        type="button"
        variant={activeDispute ? 'secondary' : variant}
        size={size}
        className={cn(className)}
        onClick={handleClick}
        disabled={checking && Boolean(report?.id)}
        title={
          activeDispute
            ? 'You already have an open support ticket for this report. View it or wait until it is resolved.'
            : undefined
        }
      >
        {!hideIcon &&
          (activeDispute ? (
            <ExternalLink className="w-4 h-4 mr-2" />
          ) : (
            <LifeBuoy className="w-4 h-4 mr-2" />
          ))}
        {buttonLabel}
      </Button>
      <ContactSupportDialog
        open={open}
        onOpenChange={handleDialogClose}
        report={report}
        activeDispute={activeDispute}
      />
    </>
  );
}
