import React from 'react';
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage';

const DataSovereignty = () => {
    return (
        <LegalDocumentPage
            title="DATA SOVEREIGNTY"
            classification="CONFIDENTIAL // INTERNAL"
            lastUpdated="2024-03-20"
            docId="#DS-99X-RESIDENCY"
            intro="BugChase complies with strict national residency standards. All sensitive vulnerability data remains within physical national borders."
            sections={[
                {
                    header: "NATIONAL DATA RESIDENCY",
                    content: "BugChase guarantees complete data sovereignty by ensuring that all sensitive vulnerability data, user profiles, and platform logs remain physically stored within designated national borders. We utilize local cloud infrastructure providers that are fully compliant with national data protection laws.\n\nNo Cross-Border transfer of critical data occurs at any stage of the lifecycle. This architecture is designed to meet the rigorous standards of government and defense sector clients who require absolute control over their information assets."
                },
                {
                    header: "ENCRYPTION STANDARDS",
                    content: "We employ defense-grade encryption strategies to protect data both in transit and at rest. \n\nData at Rest: All database volumes and object storage buckets are encrypted using AES-256-GCM (Galois/Counter Mode). Encryption keys are managed via a hardware-backed Key Management Service (KMS) with strict access controls.\n\nData in Transit: All network communications are secured using TLS 1.3 with Perfect Forward Secrecy (PFS). We enforce HSTS (HTTP Strict Transport Security) to prevent protocol downgrade attacks."
                },
                {
                    header: "ACCESS CONTROL",
                    content: "Access to sovereign data is restricted to personnel who have undergone rigorous background checks and security clearance procedures. We implement a Zero Trust architecture where every access request is authenticated, authorized, and encrypted. \n\nMulti-Factor Authentication (MFA) is mandatory for all administrative access, and detailed audit logs are maintained for forensic accountability."
                }
            ]}
        />
    );
};

export default DataSovereignty;
