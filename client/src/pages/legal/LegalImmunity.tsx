import React from 'react';
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage';

const LegalImmunity = () => {
    return (
        <LegalDocumentPage
            title="LEGAL IMMUNITY"
            classification="PUBLIC // SAFE_HARBOR"
            lastUpdated="2024-02-10"
            docId="#IMMUNITY-SHIELD"
            intro="Safe Harbor framework ensuring protection for ethical researchers acting in good faith."
            sections={[
                {
                    header: "SAFE HARBOR AUTHORIZATION",
                    content: "BugChase considers security research to be a vital activity for the safety of the internet ecosystem. If you conduct research in good faith and in compliance with our Rules of Engagement, we consider your actions authorized.\n\nWe will not pursue civil or criminal legal action against you or initiate a complaint to law enforcement for accidental, good-faith violations of this policy. We support the distinction between malicious hacking and ethical security research."
                },
                {
                    header: "THIRD-PARTY IMMUNITY",
                    content: "If a third party brings legal action against you for research activities that were conducted in accordance with our policy, BugChase will provide written authorization and evidence of your compliance.\n\nWe will take reasonable steps to make it known that your actions were authorized by us and were performed to improve the security of the affected systems. However, we cannot guarantee immunity from third parties who have not explicitly adopted this Safe Harbor policy."
                },
                {
                    header: "RESPONSIBLE DISCLOSURE",
                    content: "Immunity is contingent upon responsible disclosure. You must give us reasonable time to remediate vulnerabilities before any public release. You must not exploit a security issue to compromise data, cause system instability, or pivot to other systems. \n\nVulnerabilities must be reported solely through the BugChase platform to ensure the chain of custody and verification of your findings."
                }
            ]}
        />
    );
};

export default LegalImmunity;
