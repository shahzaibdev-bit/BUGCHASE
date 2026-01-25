export type SubmissionData = {
  target: string | null;
  assetType: 'Web' | 'API' | 'Contract' | null;
  category: string | null;
  bugType: string | null;
  cwe: string | null;
  severityMode: 'manual' | 'calculator';
  severity: 'None' | 'Low' | 'Medium' | 'High' | 'Critical';
  cvssVector: Record<string, string>; // Store individual metrics
  cvssScore: number;
  title: string;
  vulnerabilityDetails: string; // Rich Text
  validationSteps: string; // Rich Text
  impact: string; // Rich Text
  files: File[];
  agreedToTerms: boolean;
};

export const STEPS = [
    { id: 1, label: 'Bug Classification' },
    { id: 2, label: 'Severity Level' },
    { id: 3, label: 'Report Details' },
    { id: 4, label: 'Review' },
];
