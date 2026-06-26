export interface ReportVrtFields {
  vrtParent?: string | null;
  vrtCategory?: string | null;
  vrtVariant?: string | null;
  vulnerabilityCategory?: string | null;
}

export function formatReportVrt(report: ReportVrtFields): {
  label: string;
  breadcrumb?: string;
} {
  const label = (report.vrtVariant || report.vulnerabilityCategory || '').trim() || 'N/A';
  const breadcrumb = [report.vrtParent, report.vrtCategory].filter(Boolean).join(' → ');
  return { label, breadcrumb: breadcrumb || undefined };
}
