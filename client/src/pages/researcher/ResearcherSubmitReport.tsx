import React from 'react';
import { SubmissionWizard } from '@/components/researcher/submission/SubmissionWizard';

export default function ResearcherSubmitReport() {
  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
         <h1 className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">SUBMIT VULNERABILITY</h1>
         <p className="text-zinc-500">Follow the wizard to classify and report your finding.</p>
      </div>
      <SubmissionWizard />
    </div>
  );
}
