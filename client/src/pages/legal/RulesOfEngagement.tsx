import React from 'react';
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage';

const RulesOfEngagement = () => {
    return (
        <LegalDocumentPage
            title="RULES OF ENGAGEMENT"
            classification="PUBLIC // RESEARCHER_GUIDE"
            lastUpdated="2024-04-01"
            docId="#ROE-ALPHA-V2"
            intro="Operational directives for all researchers participating in BugChase programs."
            sections={[
                {
                    header: "AUTHORIZED TESTING SCOPE",
                    content: "Research activities must be strictly limited to the assets, domains, and IP addresses explicitly listed in the 'In Scope' section of the applicable program. Testing of any assets not expressly listed is unauthorized and may result in legal action.\n\nResearchers are authorized to use standard reconnaissance and scanning tools, provided they do not cause service degradation. Manual verification of automated findings is required before submission."
                },
                {
                    header: "PROHIBITED ACTIONS",
                    content: "The following activities are strictly prohibited under all circumstances:\n\n1. Denial of Service (DoS) or Distributed Denial of Service (DDoS) attacks against any asset.\n2. Social Engineering (e.g., phishing, vishing) targeting employees, customers, or contractors.\n3. Physical access attempts against offices, data centers, or infrastructure.\n4. Accessing, modifying, or deleting data belonging to other users or the platform itself.\n\nViolation of these prohibitions will result in immediate suspension and may be reported to law enforcement."
                },
                {
                    header: "VULNERABILITY DISCLOSURE",
                    content: "All discovered vulnerabilities must be reported exclusively through the BugChase platform. Public disclosure or sharing of vulnerability details with third parties without express written consent from the Program Owner is a violation of this agreement.\n\nWe aim to triage all valid reports within 48 hours. Researchers are expected to provide clear steps to reproduce the issue to facilitate rapid validation and remediation."
                }
            ]}
        />
    );
};

export default RulesOfEngagement;
