import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import { useScrollRestore } from "@/hooks/useScrollRestore";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

// Pages
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const VerifyOtp = lazy(() => import("./pages/VerifyOtp"));
const LoginRequired = lazy(() => import("./pages/LoginRequired"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SecurityRewards = lazy(() => import("./pages/solutions/SecurityRewards"));
const VDPProgram = lazy(() => import("./pages/solutions/VDPProgram"));
const PTaaS = lazy(() => import("./pages/solutions/PTaaS"));
const Contact = lazy(() => import("./pages/company/Contact"));
const AboutUs = lazy(() => import("./pages/company/AboutUs"));
const Careers = lazy(() => import("./pages/company/Careers"));
const DataSovereignty = lazy(() => import("./pages/legal/DataSovereignty"));
const RulesOfEngagement = lazy(() => import("./pages/legal/RulesOfEngagement"));
const LegalImmunity = lazy(() => import("./pages/legal/LegalImmunity"));
const LegalFramework = lazy(() => import("./pages/legal/LegalFramework"));

const VerifyCert = lazy(() => import("./pages/public/VerifyCert"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));

// Layouts
import ResearcherLayout from "./layouts/ResearcherLayout";
import CompanyLayout from "./layouts/CompanyLayout";
import TriagerLayout from "./layouts/TriagerLayout";
import AdminLayout from "./layouts/AdminLayout";
import { PublicLayout } from "./layouts/PublicLayout";
import { AuthLayout } from "./layouts/AuthLayout";

// Researcher Pages
const ResearcherPrograms = lazy(() => import("./pages/researcher/ResearcherPrograms"));
const ResearcherSubmitReport = lazy(() => import("./pages/researcher/ResearcherSubmitReport"));
const ResearcherReports = lazy(() => import("./pages/researcher/ResearcherReports"));
const ResearcherWallet = lazy(() => import("./pages/researcher/ResearcherWallet"));
const ResearcherLeaderboard = lazy(() => import("./pages/researcher/ResearcherLeaderboard"));
const ResearcherProfile = lazy(() => import("./pages/researcher/ResearcherProfile"));
const ResearcherVerification = lazy(() => import("./pages/researcher/ResearcherVerification"));
const ProgramDetails = lazy(() => import("./pages/researcher/ProgramDetails"));
const ReportDetails = lazy(() => import("./pages/researcher/ReportDetails"));

// Company Pages
const CompanyDashboard = lazy(() => import("./pages/company/CompanyDashboard"));
const CompanyPrograms = lazy(() => import("./pages/company/CompanyPrograms"));
const CompanyAssets = lazy(() => import("./pages/company/CompanyAssets"));
const CompanyReports = lazy(() => import("./pages/company/CompanyReports"));
const CompanyReportDetails = lazy(() => import("./pages/company/CompanyReportDetails"));
const CompanyAnalytics = lazy(() => import("./pages/company/CompanyAnalytics"));
const CompanyEscrow = lazy(() => import("./pages/company/CompanyEscrow"));
const CompanySettings = lazy(() => import("./pages/company/CompanySettings"));
const CompanyProgramDetails = lazy(() => import("./pages/company/CompanyProgramDetails"));

// Triager Pages
const TriagerQueue = lazy(() => import("./pages/triager/TriagerQueue"));
const TriagerAssigned = lazy(() => import("./pages/triager/TriagerAssigned"));
const TriagerExpertise = lazy(() => import("./pages/triager/TriagerExpertise"));
const TriagerReportDetails = lazy(() => import("./pages/triager/TriagerReportDetails"));
const TriagerReportPeek = lazy(() => import("./pages/triager/TriagerReportPeek"));
const TriagerProfile = lazy(() => import("./pages/triager/TriagerProfile"));

// Support Pages
const SupportDashboard = lazy(() => import("./pages/support/SupportDashboard"));

// Components
import { ProtectedRoute } from "./components/ProtectedRoute";

// Admin Pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminFinance = lazy(() => import("./pages/admin/AdminFinance"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs"));
const AdminPrograms = lazy(() => import("./pages/admin/AdminPrograms"));
const AdminProgramDetails = lazy(() => import("./pages/admin/AdminProgramDetails"));
const AdminAnnouncements = lazy(() => import("./pages/admin/AdminAnnouncements"));
const AdminTriagers = lazy(() => import("./pages/admin/AdminTriagers"));
const AdminTriagerDetails = lazy(() => import("./pages/admin/AdminTriagerDetails"));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport"));
const AdminSupportDetails = lazy(() => import("./pages/admin/AdminSupportDetails"));
const AdminUserDetails = lazy(() => import("./pages/admin/AdminUserDetails"));
const AdminReportDetails = lazy(() => import("./pages/admin/AdminReportDetails"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
    <div className="text-sm text-muted-foreground">Loading...</div>
  </div>
);

// Must live inside BrowserRouter so useLocation() works
const ScrollRestoreWrapper = () => {
  useScrollRestore();
  return null;
};

const App = () => (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <ScrollRestoreWrapper />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                {/* Public Routes */}
                {/* Public Routes with Global Background */}
                <Route element={<PublicLayout />}>
                    <Route path="/" element={<LandingPage />} />
                    
                    {/* Auth Routes with Shared Layout & Transitions */}
                    <Route element={<AuthLayout />}>
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/signup" element={<SignupPage />} />
                    </Route>
                    
                    {/* Solutions Routes */}
                    <Route path="/solutions/rewards" element={<SecurityRewards />} />
                    <Route path="/solutions/vdp" element={<VDPProgram />} />
                    <Route path="/solutions/ptaas" element={<PTaaS />} />
                    <Route path="/company/contact" element={<Contact />} />
                    <Route path="/company/about" element={<AboutUs />} />
                    <Route path="/company/careers" element={<Careers />} />
                    
                    {/* Legal Routes */}
                    <Route path="/legal/sovereignty" element={<DataSovereignty />} />
                    <Route path="/legal/rules" element={<RulesOfEngagement />} />
                    <Route path="/legal/immunity" element={<LegalImmunity />} />
                    <Route path="/legal/framework" element={<LegalFramework />} />
                </Route>
                
                {/* Standalone Route (No Navbar) */}
                <Route path="/verify-otp" element={<VerifyOtp />} />
                <Route path="/login-required" element={<LoginRequired />} />
                <Route path="/verify-cert" element={<VerifyCert />} />
                <Route path="/verify-cert/:id" element={<VerifyCert />} />

                {/* Public Profile (Simplified Navbar) */}
                <Route element={<PublicLayout simpleNavbar={true} />}>
                    <Route path="/h/:username" element={<PublicProfile />} />
                </Route>

                {/* Researcher Routes */}
                <Route element={<ProtectedRoute allowedRoles={['researcher']} />}>
                  <Route path="/researcher" element={<ResearcherLayout />}>
                      <Route index element={<ResearcherPrograms />} />
                      <Route path="programs/:id" element={<ProgramDetails />} />
                      <Route path="submit" element={<ResearcherSubmitReport />} />
                      <Route path="reports" element={<ResearcherReports />} />
                      <Route path="reports/:id" element={<ReportDetails />} />
                      <Route path="wallet" element={<ResearcherWallet />} />
                      <Route path="leaderboard" element={<ResearcherLeaderboard />} />
                      <Route path="profile" element={<ResearcherProfile />} />
                      <Route path="verify" element={<ResearcherVerification />} />
                  </Route>
              </Route>

                {/* Company Routes */}
                <Route element={<ProtectedRoute allowedRoles={['company']} />}>
                  <Route path="/company" element={<CompanyLayout />}>
                      <Route index element={<CompanyDashboard />} />
                      <Route path="programs" element={<CompanyPrograms />} />
                      <Route path="programs/:id" element={<CompanyProgramDetails />} />
                      <Route path="assets" element={<CompanyAssets />} />
                      <Route path="reports" element={<CompanyReports />} />
                      <Route path="reports/:id" element={<CompanyReportDetails />} />
                      <Route path="analytics" element={<CompanyAnalytics />} />
                      <Route path="escrow" element={<CompanyEscrow />} />
                      <Route path="settings" element={<CompanySettings />} />
                  </Route>
                </Route>

                {/* Triager Routes */}
                <Route element={<ProtectedRoute allowedRoles={['triager']} />}>
                    <Route path="/triager" element={<TriagerLayout />}>
                      <Route index element={<TriagerQueue />} />
                      <Route path="assigned" element={<TriagerAssigned />} />
                      <Route path="settings" element={<TriagerExpertise />} />
                      <Route path="reports/:id" element={<TriagerReportDetails />} />
                      <Route path="peek/:id" element={<TriagerReportPeek />} />
                      <Route path="profile" element={<TriagerProfile />} />
                    </Route>
                </Route>

                {/* Support Routes */}
                <Route element={<ProtectedRoute allowedRoles={['support']} />}>
                    <Route path="/support" element={<SupportDashboard />} />
                </Route>

                {/* Admin Routes */}
                <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                    <Route path="/admin" element={<AdminLayout />}>
                      <Route index element={<AdminDashboard />} />
                      <Route path="programs" element={<AdminPrograms />} />
                      <Route path="programs/:id" element={<AdminProgramDetails />} />
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="users/:id" element={<AdminUserDetails />} />
                      <Route path="triagers" element={<AdminTriagers />} />
                      <Route path="triagers/:id" element={<AdminTriagerDetails />} />
                      <Route path="support" element={<AdminSupport />} />
                      <Route path="support/:id" element={<AdminSupportDetails />} />
                      <Route path="reports/:id" element={<AdminReportDetails />} />
                      <Route path="finance" element={<AdminFinance />} />
                      <Route path="logs" element={<AdminLogs />} />
                      <Route path="announcements" element={<AdminAnnouncements />} />
                    </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
