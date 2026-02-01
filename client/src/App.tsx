import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import VerifyOtp from "./pages/VerifyOtp";
import LoginRequired from "./pages/LoginRequired";
import NotFound from "./pages/NotFound";
import SecurityRewards from "./pages/solutions/SecurityRewards";
import VDPProgram from "./pages/solutions/VDPProgram";
import PTaaS from "./pages/solutions/PTaaS";
import Contact from "./pages/company/Contact";
import AboutUs from "./pages/company/AboutUs";
import Careers from "./pages/company/Careers";
import DataSovereignty from "./pages/legal/DataSovereignty";
import RulesOfEngagement from "./pages/legal/RulesOfEngagement";
import LegalImmunity from "./pages/legal/LegalImmunity";
import LegalFramework from "./pages/legal/LegalFramework";

import PublicProfile from "./pages/PublicProfile";

// Layouts
import ResearcherLayout from "./layouts/ResearcherLayout";
import CompanyLayout from "./layouts/CompanyLayout";
import TriagerLayout from "./layouts/TriagerLayout";
import AdminLayout from "./layouts/AdminLayout";
import { PublicLayout } from "./layouts/PublicLayout";
import { AuthLayout } from "./layouts/AuthLayout";

// Researcher Pages
import ResearcherPrograms from "./pages/researcher/ResearcherPrograms";
import ResearcherSubmitReport from "./pages/researcher/ResearcherSubmitReport";
import ResearcherReports from "./pages/researcher/ResearcherReports";
import ResearcherWallet from "./pages/researcher/ResearcherWallet";
import ResearcherLeaderboard from "./pages/researcher/ResearcherLeaderboard";
import ResearcherProfile from "./pages/researcher/ResearcherProfile";
import ResearcherVerification from "./pages/researcher/ResearcherVerification";
import ProgramDetails from "./pages/researcher/ProgramDetails";
import ReportDetails from "./pages/researcher/ReportDetails";

// Company Pages
import CompanyDashboard from "./pages/company/CompanyDashboard";
import CompanyPrograms from "./pages/company/CompanyPrograms";
import CompanyAssets from "./pages/company/CompanyAssets";
import CompanyReports from "./pages/company/CompanyReports";
import CompanyReportDetails from "./pages/company/CompanyReportDetails";
import CompanyAnalytics from "./pages/company/CompanyAnalytics";
import CompanyEscrow from "./pages/company/CompanyEscrow";
import CompanySettings from "./pages/company/CompanySettings";
import CompanyProgramDetails from "./pages/company/CompanyProgramDetails";

// Triager Pages
import TriagerQueue from "./pages/triager/TriagerQueue";
import TriagerAssigned from "./pages/triager/TriagerAssigned";
import TriagerExpertise from "./pages/triager/TriagerExpertise";
import TriagerReportDetails from "./pages/triager/TriagerReportDetails";
import TriagerProfile from "./pages/triager/TriagerProfile";

// Components
import { ProtectedRoute } from "./components/ProtectedRoute";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminFinance from "./pages/admin/AdminFinance";
import AdminDisputes from "./pages/admin/AdminDisputes";
import AdminDisputeDetails from "./pages/admin/AdminDisputeDetails";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminPrograms from "./pages/admin/AdminPrograms";
import AdminProgramDetails from "./pages/admin/AdminProgramDetails";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminTriagers from "./pages/admin/AdminTriagers";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
                    <Route path="profile" element={<TriagerProfile />} />
                  </Route>
              </Route>

              {/* Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="programs" element={<AdminPrograms />} />
                    <Route path="programs/:id" element={<AdminProgramDetails />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="triagers" element={<AdminTriagers />} />
                    <Route path="finance" element={<AdminFinance />} />
                    <Route path="disputes" element={<AdminDisputes />} />
                    <Route path="disputes/:id" element={<AdminDisputeDetails />} />
                    <Route path="logs" element={<AdminLogs />} />
                    <Route path="announcements" element={<AdminAnnouncements />} />
                  </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
