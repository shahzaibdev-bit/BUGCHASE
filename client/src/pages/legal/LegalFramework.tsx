import React from 'react';
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage';

const LegalFramework = () => {
    return (
        <LegalDocumentPage
            title="LEGAL FRAMEWORK"
            classification="SAFE_HARBOR_POLICY //"
            lastUpdated="2024-03-15"
            docId="#FRAMEWORK-SH-2024"
            intro="BugChase ensures that all researchers acting in good faith and within program scope are protected from legal action. We act as the authorized intermediary..."
            sections={[
                {
                    header: "SECTION 1.1 - DATA RETENTION",
                    content: "Data is retained for 365 days in cold storage. Access logs are immutable."
                },
                {
                    header: "SECTION 1.2 - THIRD PARTY SHARING",
                    content: "We do not sell data. We only share vulnerability details with the specific Program Owner."
                },
                {
                    header: "SECTION 1.3 - COOKIES",
                    content: "Session tokens only. No tracking pixels."
                }
            ]}
        />
    );
};

export default LegalFramework;
