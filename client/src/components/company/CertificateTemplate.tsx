import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';

interface CertificateProps {
  researcherUsername: string;
  reportTitle: string;
  targetCompanyName: string;
  certificateId: string;
  verifyUrl: string;
}

const styles = StyleSheet.create({
  page: { 
    flexDirection: 'column', 
    backgroundColor: '#FAFAFA', 
    fontFamily: 'Helvetica' 
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 35,
    backgroundColor: '#09090B', // zinc-950 equivalent
  },
  sidebarText: {
    color: '#71717A',
    fontSize: 10,
    fontFamily: 'Courier-Bold',
    transform: 'rotate(-90deg)',
    transformOrigin: '50% 50%',
    position: 'absolute',
    top: 300,
    left: -120,
    width: 300,
    textAlign: 'center',
    letterSpacing: 6,
  },
  topCorner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 150,
    height: 150,
    backgroundColor: '#F4F4F5',
    borderBottomLeftRadius: 150,
    zIndex: -1,
  },
  contentWrap: {
    paddingTop: 50,
    paddingBottom: 40,
    paddingLeft: 85,
    paddingRight: 60,
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2pt solid #09090B',
    paddingBottom: 15,
  },
  logoText: {
    fontSize: 22,
    fontFamily: 'Courier-Bold',
    color: '#09090B',
    letterSpacing: 2,
  },
  certIdBadge: {
    backgroundColor: '#09090B',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    fontFamily: 'Courier',
    fontSize: 10,
    letterSpacing: 1,
  },
  mainContent: {
    flex: 1,
    paddingTop: 35,
  },
  label: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: '#71717A',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  titleWrap: {
    marginBottom: 35,
  },
  awardTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#09090B',
    marginBottom: 8,
  },
  awardSubtitle: {
    fontSize: 12,
    color: '#3F3F46',
    fontFamily: 'Courier-Bold',
    letterSpacing: 1,
  },
  researcherName: {
    fontSize: 42,
    fontFamily: 'Times-BoldItalic',
    color: '#18181B', 
    marginBottom: 20,
  },
  description: {
    fontSize: 12,
    lineHeight: 1.6,
    color: '#3F3F46',
    maxWidth: '90%',
  },
  techHighlight: {
    fontFamily: 'Courier-Bold',
    color: '#09090B',
  },
  foooterBlocks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: 200,
  },
  sigLine: {
    borderBottom: '1pt solid #D4D4D8',
    paddingBottom: 8,
    marginBottom: 8,
  },
  sigName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#09090B',
  },
  sigTitle: {
    fontSize: 9,
    color: '#71717A',
    fontFamily: 'Courier-Bold',
    letterSpacing: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1pt solid #E4E4E7',
    paddingTop: 15,
    marginTop: 20,
  },
  bottomText: {
    fontSize: 9,
    color: '#A1A1AA',
    fontFamily: 'Helvetica',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  link: {
    color: '#09090B',
    textDecoration: 'underline',
    fontFamily: 'Helvetica-Bold',
  }
});

export const CertificateTemplate = ({ researcherUsername, reportTitle, targetCompanyName, certificateId, verifyUrl }: CertificateProps) => {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.sidebar}>
           <Text style={styles.sidebarText}>VERIFIED DISCLOSURE RECORD</Text>
        </View>
        <View style={styles.topCorner} />

        <View style={styles.contentWrap}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.logoText}>BUGCHASE. PLATFORM</Text>
            <Text style={styles.certIdBadge}>ID: {certificateId}</Text>
          </View>

          {/* Body */}
          <View style={styles.mainContent}>
            <View style={styles.titleWrap}>
              <Text style={styles.awardTitle}>CERTIFICATE OF EXCELLENCE</Text>
              <Text style={styles.awardSubtitle}>IN RECOGNITION OF RESPONSIBLE VULNERABILITY DISCLOSURE</Text>
            </View>

            <Text style={styles.label}>PROUDLY PRESENTED TO</Text>
            <Text style={styles.researcherName}>{researcherUsername}</Text>

            <Text style={styles.description}>
              For demonstrating exceptional offensive security skills and an unwavering commitment to ethical hacking. By identifying and responsibly disclosing a <Text style={styles.techHighlight}>{reportTitle}</Text> vulnerability within the <Text style={styles.techHighlight}>{targetCompanyName}</Text> infrastructure, you have made a vital contribution to securing the digital ecosystem.
            </Text>
          </View>

          {/* Signatures */}
          <View style={styles.foooterBlocks}>
            <View style={styles.signatureBlock}>
              <View style={styles.sigLine}>
                <Text style={styles.sigName}>{targetCompanyName}</Text>
              </View>
              <Text style={styles.sigTitle}>AUTHORIZED SECURITY TEAM</Text>
            </View>

            <View style={styles.signatureBlock}>
              <View style={styles.sigLine}>
                <Text style={styles.sigName}>BugChase Triage</Text>
              </View>
              <Text style={styles.sigTitle}>VERIFICATION AUTHORITY</Text>
            </View>
          </View>

          {/* Bottom Bar */}
          <View style={styles.bottomBar}>
            <Text style={styles.bottomText}>ISSUED ON: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
            <Text style={styles.bottomText}>
               <Link style={styles.link} src={verifyUrl}>Verify Digital Authenticity »</Link>
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default CertificateTemplate;
