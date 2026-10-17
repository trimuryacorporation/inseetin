import { lazy, Suspense, useState } from 'react'
import { Navigate, createBrowserRouter, RouterProvider, useNavigate } from 'react-router-dom'
import { CookieConsent } from './components/CookieConsent'
import { AuthModal } from './components/AuthModal'
import { ApplyModal, Toast } from './components/PortalUI'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { ProtectedRoute, RoleRedirect } from './routes/ProtectedRoute'

const FAQPage = lazy(() => import('./components/FAQSection').then((module) => ({ default: module.FAQPage })))
const AdminLayout = lazy(() => import('./admin/components/AdminLayout').then((module) => ({ default: module.AdminLayout })))
const AdminBulkHiringPage = lazy(() => import('./admin/pages/AdminHiringPages').then((module) => ({ default: module.AdminBulkHiringPage })))
const AdminHiringPage = lazy(() => import('./admin/pages/AdminHiringPages').then((module) => ({ default: module.AdminHiringPage })))
const AdminSingleHiringPage = lazy(() => import('./admin/pages/AdminHiringPages').then((module) => ({ default: module.AdminSingleHiringPage })))
const AdminHiringTeamPage = lazy(() => import('./admin/pages/AdminHiringTeamPage').then((module) => ({ default: module.AdminHiringTeamPage })))
const AdminProfilePage = lazy(() => import('./admin/pages/AdminProfilePage').then((module) => ({ default: module.AdminProfilePage })))
const AdminDiscountCouponPage = lazy(() => import('./admin/pages/AdminManagementPage').then((module) => ({ default: module.AdminDiscountCouponPage })))
const AdminGoogleAuthPage = lazy(() => import('./admin/pages/AdminManagementPage').then((module) => ({ default: module.AdminGoogleAuthPage })))
const AdminManagementPage = lazy(() => import('./admin/pages/AdminManagementPage').then((module) => ({ default: module.AdminManagementPage })))
const AdminNewsletterSendPage = lazy(() => import('./admin/pages/AdminManagementPage').then((module) => ({ default: module.AdminNewsletterSendPage })))
const AdminPaymentDetailPage = lazy(() => import('./admin/pages/AdminManagementPage').then((module) => ({ default: module.AdminPaymentDetailPage })))
const AdminPricingPage = lazy(() => import('./admin/pages/AdminManagementPage').then((module) => ({ default: module.AdminPricingPage })))
const AdminSEOBrandingPage = lazy(() => import('./admin/pages/AdminManagementPage').then((module) => ({ default: module.AdminSEOBrandingPage })))
const AdminSettingsPage = lazy(() => import('./admin/pages/AdminManagementPage').then((module) => ({ default: module.AdminSettingsPage })))
const AdminSupaCloudPage = lazy(() => import('./admin/pages/AdminManagementPage').then((module) => ({ default: module.AdminSupaCloudPage })))
const RecruiterDetailPage = lazy(() => import('./admin/pages/AdminManagementPage').then((module) => ({ default: module.RecruiterDetailPage })))
const RecruiterDocumentDetailPage = lazy(() => import('./admin/pages/AdminManagementPage').then((module) => ({ default: module.RecruiterDocumentDetailPage })))
const SupportMessageDetailPage = lazy(() => import('./admin/pages/AdminManagementPage').then((module) => ({ default: module.SupportMessageDetailPage })))
const AdminWhatsAppApiPage = lazy(() => import('./admin/pages/AdminWhatsAppApiPage').then((module) => ({ default: module.AdminWhatsAppApiPage })))
const AdminEmailApiPage = lazy(() => import('./admin/pages/AdminEmailApiPage').then((module) => ({ default: module.AdminEmailApiPage })))
const AdminAddPluginsPage = lazy(() => import('./admin/pages/AdminPluginsPage').then((module) => ({ default: module.AdminAddPluginsPage })))
const AdminInstalledPluginsPage = lazy(() => import('./admin/pages/AdminPluginsPage').then((module) => ({ default: module.AdminInstalledPluginsPage })))
const AdminRazorpayPage = lazy(() => import('./admin/pages/AdminRazorpayPage').then((module) => ({ default: module.AdminRazorpayPage })))
const AdminSocialMediaPage = lazy(() => import('./admin/pages/AdminSocialMediaPage').then((module) => ({ default: module.AdminSocialMediaPage })))
const AdminRoleDashboard = lazy(() => import('./admin/pages/AdminRoleDashboard').then((module) => ({ default: module.AdminRoleDashboard })))
const AdminRolePermissionPage = lazy(() => import('./admin/pages/AdminRolePermissionPage').then((module) => ({ default: module.AdminRolePermissionPage })))
const AdminCampaignsPage = lazy(() => import('./admin/pages/AdminCampaignsPage').then((module) => ({ default: module.AdminCampaignsPage })))
const FreelancerLayout = lazy(() => import('./components/FreelancerLayout').then((module) => ({ default: module.FreelancerLayout })))
const EmployerLayout = lazy(() => import('./employer/components/EmployerLayout').then((module) => ({ default: module.EmployerLayout })))
const EmployerLoginPage = lazy(() => import('./employer/pages/EmployerAuthPages').then((module) => ({ default: module.EmployerLoginPage })))
const EmployerRegisterPage = lazy(() => import('./employer/pages/EmployerAuthPages').then((module) => ({ default: module.EmployerRegisterPage })))
const EmployerLandingPage = lazy(() => import('./employer/pages/EmployerLandingPage').then((module) => ({ default: module.EmployerLandingPage })))
const RecruiterTestimonialsPage = lazy(() => import('./employer/pages/RecruiterTestimonialsPage').then((module) => ({ default: module.RecruiterTestimonialsPage })))
const RecruiterDocumentReviewPage = lazy(() => import('./employer/pages/RecruiterVerificationPages').then((module) => ({ default: module.RecruiterDocumentReviewPage })))
const RecruiterDocumentsPage = lazy(() => import('./employer/pages/RecruiterVerificationPages').then((module) => ({ default: module.RecruiterDocumentsPage })))
const RecruiterVerificationPage = lazy(() => import('./employer/pages/RecruiterVerificationPages').then((module) => ({ default: module.RecruiterVerificationPage })))
const AuthPage = lazy(() => import('./pages/AuthPage').then((module) => ({ default: module.AuthPage })))
const AuthModalPage = lazy(() => import('./pages/AuthModalPage').then((module) => ({ default: module.AuthModalPage })))
const AboutPage = lazy(() => import('./pages/AboutPage').then((module) => ({ default: module.AboutPage })))
const CandidateAppliedJobsPage = lazy(() => import('./pages/CandidateDashboard').then((module) => ({ default: module.CandidateAppliedJobsPage })))
const CandidateDashboard = lazy(() => import('./pages/CandidateDashboard').then((module) => ({ default: module.CandidateDashboard })))
const CandidateInterviewInvitesPage = lazy(() => import('./pages/CandidateDashboard').then((module) => ({ default: module.CandidateInterviewInvitesPage })))
const CandidateJobAlertsPage = lazy(() => import('./pages/CandidateDashboard').then((module) => ({ default: module.CandidateJobAlertsPage })))
const CandidateSavedJobsPage = lazy(() => import('./pages/CandidateDashboard').then((module) => ({ default: module.CandidateSavedJobsPage })))
const CandidateProfilePage = lazy(() => import('./pages/CandidateProfilePage').then((module) => ({ default: module.CandidateProfilePage })))
const CandidateReviewsPage = lazy(() => import('./pages/CandidateReviewsPage').then((module) => ({ default: module.CandidateReviewsPage })))
const CareerResourcesPage = lazy(() => import('./pages/CareerResourcesPage').then((module) => ({ default: module.CareerResourcesPage })))
const CategoryJobsPage = lazy(() => import('./pages/CategoryJobsPage').then((module) => ({ default: module.CategoryJobsPage })))
const CompaniesPage = lazy(() => import('./pages/CompaniesPage').then((module) => ({ default: module.CompaniesPage })))
const CompanyDetailsPage = lazy(() => import('./pages/CompaniesPage').then((module) => ({ default: module.CompanyDetailsPage })))
const ContactPage = lazy(() => import('./pages/ContactPage').then((module) => ({ default: module.ContactPage })))
const ContentPage = lazy(() => import('./pages/ContentPage').then((module) => ({ default: module.ContentPage })))
const EmployerDashboard = lazy(() => import('./pages/EmployerDashboard').then((module) => ({ default: module.EmployerDashboard })))
const FreelancerPage = lazy(() => import('./pages/FreelancerPage').then((module) => ({ default: module.FreelancerPage })))
const FreelancerRegisterPage = lazy(() => import('./pages/FreelancerPage').then((module) => ({ default: module.FreelancerRegisterPage })))
const FreelancerProjectDetailsPage = lazy(() => import('./pages/FreelancerProjectsPage').then((module) => ({ default: module.FreelancerProjectDetailsPage })))
const FreelancerProjectsPage = lazy(() => import('./pages/FreelancerProjectsPage').then((module) => ({ default: module.FreelancerProjectsPage })))
const IndustriesPage = lazy(() => import('./pages/IndustriesPage').then((module) => ({ default: module.IndustriesPage })))
const JobDetailsPage = lazy(() => import('./pages/JobDetailsPage').then((module) => ({ default: module.JobDetailsPage })))
const JobsPage = lazy(() => import('./pages/JobsPage').then((module) => ({ default: module.JobsPage })))
const PostJobPage = lazy(() => import('./pages/PostJobPage').then((module) => ({ default: module.PostJobPage })))
const PressNewsPage = lazy(() => import('./pages/PressNewsPage').then((module) => ({ default: module.PressNewsPage })))
const RecruiterProfilePage = lazy(() => import('./pages/RecruiterProfilePage').then((module) => ({ default: module.RecruiterProfilePage })))
const RecruiterFindResumePage = lazy(() => import('./pages/RecruiterFindResumePage').then((module) => ({ default: module.RecruiterFindResumePage })))
const RecruiterJobsPage = lazy(() => import('./pages/RecruiterJobsPage').then((module) => ({ default: module.RecruiterJobsPage })))
const RecruiterPricingPage = lazy(() => import('./pages/RecruiterPricingPage').then((module) => ({ default: module.RecruiterPricingPage })))
const RecruiterResourcesPage = lazy(() => import('./pages/RecruiterResourcesPage').then((module) => ({ default: module.RecruiterResourcesPage })))
const RecruiterTalentPoolPage = lazy(() => import('./pages/RecruiterTalentPoolPage').then((module) => ({ default: module.RecruiterTalentPoolPage })))
const RecruiterAnalyticsPage = lazy(() => import('./pages/RecruiterWorkspacePages').then((module) => ({ default: module.RecruiterAnalyticsPage })))
const RecruiterApplicationsPage = lazy(() => import('./pages/RecruiterWorkspacePages').then((module) => ({ default: module.RecruiterApplicationsPage })))
const RecruiterCandidateApplicationsPage = lazy(() => import('./pages/RecruiterWorkspacePages').then((module) => ({ default: module.RecruiterCandidateApplicationsPage })))
const RecruiterInterviewsPage = lazy(() => import('./pages/RecruiterWorkspacePages').then((module) => ({ default: module.RecruiterInterviewsPage })))
const RecruiterTeamPage = lazy(() => import('./pages/RecruiterWorkspacePages').then((module) => ({ default: module.RecruiterTeamPage })))
const InternshipCoursePage = lazy(() => import('./pages/InternshipCoursePage').then((module) => ({ default: module.InternshipCoursePage })))

const AdminApiDeveloperPage = lazy(() => import('./admin/pages/AdminApiDeveloperPage').then(module => ({ default: module.AdminApiDeveloperPage })))

function App() {
  const [selectedJob, setSelectedJob] = useState(null)

  const [router] = useState(() => createBrowserRouter([
    {
      element: <Layout />,
      children: [
        { path: '/', element: <HomePage onApply={setSelectedJob} /> },
        { path: '/jobs', element: <JobsPage onApply={setSelectedJob} /> },
        { path: '/industries', element: <IndustriesPage /> },
        { path: '/internship-course', element: <InternshipCoursePage /> },
        { path: '/jobs-in-:categorySlug', element: <CategoryJobsPage onApply={setSelectedJob} /> },
        { path: '/categories/:categorySlug', element: <CategoryJobsPage onApply={setSelectedJob} /> },
        { path: '/companies', element: <CompaniesPage /> },
        { path: '/company-jobs-:companySlug', element: <CompanyDetailsPage onApply={setSelectedJob} /> },
        { path: '/companies/:companySlug', element: <CompanyDetailsPage onApply={setSelectedJob} /> },
        { path: '/jobs/:jobId', element: <JobDetailsPage onApply={setSelectedJob} /> },
        { path: '/about', element: <AboutPage /> },
        { path: '/press-news', element: <PressNewsPage /> },
        { path: '/career-resources', element: <CareerResourcesPage /> },
        { path: '/:jobSlug', element: <JobDetailsPage onApply={setSelectedJob} /> },
        { path: '/auth', element: <AuthModalPage /> },
        {
          path: '/candidate-dashboard',
          element: (
            <ProtectedRoute allowedRoles={['Candidate']}>
              <CandidateDashboard onApply={setSelectedJob} />
            </ProtectedRoute>
          ),
        },
        {
          path: '/candidate-profile',
          element: (
            <ProtectedRoute allowedRoles={['Candidate']}>
              <CandidateProfilePage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/candidate-applied-jobs',
          element: (
            <ProtectedRoute allowedRoles={['Candidate']}>
              <CandidateAppliedJobsPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/candidate-saved-jobs',
          element: (
            <ProtectedRoute allowedRoles={['Candidate']}>
              <CandidateSavedJobsPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/candidate-interview-invites',
          element: (
            <ProtectedRoute allowedRoles={['Candidate']}>
              <CandidateInterviewInvitesPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/candidate-job-alerts',
          element: (
            <ProtectedRoute allowedRoles={['Candidate']}>
              <CandidateJobAlertsPage />
            </ProtectedRoute>
          ),
        },
        { path: '/candidate-dashoard', element: <RoleRedirect /> },
        { path: '/employer-dashoard', element: <RoleRedirect /> },
        { path: '/post-job', element: <PostJobPage /> },
        { path: '/candidate-reviews', element: <CandidateReviewsPage /> },
        { path: '/contact', element: <ContactPage /> },
        { path: '/faqs', element: <FAQPage /> },
        { path: '/privacy', element: <ContentPage slug="privacy" /> },
        { path: '/terms', element: <ContentPage slug="terms" /> },
        { path: '/support', element: <ContentPage slug="support" /> },
        { path: '/policies/:pageSlug', element: <ContentPage /> },
      ],
    },
    {
      path: '/admin',
      element: (
        <ProtectedRoute allowedRoles={['Admin', 'staff', 'recruiter', 'users', 'hiring', 'account team', 'freelancer']}>
          <AdminLayout />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <RoleRedirect /> },
        { path: 'profile', element: <AdminProfilePage /> },
        { path: 'users', element: <AdminManagementPage type="users" /> },
        { path: 'jobs', element: <AdminManagementPage type="jobs" /> },
        { path: 'companies', element: <AdminManagementPage type="companies" /> },
        { path: 'employers', element: <AdminManagementPage type="employers" /> },
        { path: 'recruiters/:recruiterId', element: <RecruiterDetailPage /> },
        { path: 'recruiter-documents', element: <AdminManagementPage type="recruiterDocuments" /> },
        { path: 'recruiter-documents/:documentId', element: <RecruiterDocumentDetailPage /> },
        { path: 'candidates', element: <AdminManagementPage type="candidates" /> },
        { path: 'hiring-team', element: <AdminHiringTeamPage /> },
        { path: 'applications', element: <AdminManagementPage type="applications" /> },
        { path: 'campaigns', element: <AdminCampaignsPage /> },
        { path: 'projects', element: <FreelancerProjectsPage /> },
        { path: 'crm/hiring', element: <AdminHiringPage /> },
        { path: 'crm/hiring/bulk', element: <AdminBulkHiringPage /> },
        { path: 'crm/hiring/single', element: <AdminSingleHiringPage /> },
        { path: 'resumes', element: <AdminManagementPage type="resumes" /> },
        { path: 'categories', element: <AdminManagementPage type="categories" /> },
        { path: 'locations', element: <AdminManagementPage type="locations" /> },
        { path: 'career-jobs', element: <AdminManagementPage type="careerJobs" /> },
        { path: 'press-news', element: <AdminManagementPage type="pressNews" /> },
        { path: 'testimonials', element: <AdminManagementPage type="testimonials" /> },
        { path: 'video-testimonials', element: <AdminManagementPage type="videoTestimonials" /> },
        { path: 'faqs', element: <AdminManagementPage type="faqs" /> },
        { path: 'hiring-insights', element: <AdminManagementPage type="newsletterSubscribers" /> },
        { path: 'hiring-insights/send', element: <AdminNewsletterSendPage /> },
        { path: 'support-messages', element: <AdminManagementPage type="supportMessages" /> },
        { path: 'support-messages/:messageId', element: <SupportMessageDetailPage /> },
        { path: 'policy', element: <AdminManagementPage type="contentPages" /> },
        { path: 'policy/users', element: <AdminManagementPage fixedFilters={{ frontendPlacement: 'Users Frontend' }} type="contentPages" /> },
        { path: 'policy/recruiter', element: <AdminManagementPage fixedFilters={{ frontendPlacement: 'Recruiter Frontend' }} type="contentPages" /> },
        { path: 'policy/freelancer', element: <AdminManagementPage fixedFilters={{ frontendPlacement: 'Freelancer Frontend' }} type="contentPages" /> },
        { path: 'seo-branding', element: <AdminSEOBrandingPage /> },
        { path: 'social-media', element: <AdminSocialMediaPage /> },
        { path: 'payments', element: <Navigate replace to="/admin/payments/transactions" /> },
        { path: 'payments/transactions', element: <AdminManagementPage type="payments" /> },
        { path: 'payments/transactions/:paymentId', element: <AdminPaymentDetailPage /> },
        { path: 'payments/logs', element: <AdminManagementPage type="paymentLogs" /> },
        { path: 'payments/methods', element: <AdminRazorpayPage /> },
        { path: 'discount-coupons', element: <Navigate replace to="/admin/package/discount-coupons" /> },
        { path: 'package/pricing', element: <AdminPricingPage /> },
        { path: 'package/discount-coupons', element: <AdminDiscountCouponPage /> },
        { path: 'package/google-auth', element: <Navigate replace to="/admin/settings/google-auth" /> },
        { path: 'reports', element: <AdminManagementPage type="reports" /> },
        { path: 'api-developer', element: <AdminApiDeveloperPage /> },
        { path: 'settings', element: <AdminSettingsPage /> },
        { path: 'settings/google-auth', element: <AdminGoogleAuthPage /> },
        { path: 'settings/whatsapp-api', element: <AdminWhatsAppApiPage /> },
        { path: 'settings/email-api', element: <AdminEmailApiPage /> },
        { path: 'settings/razorpay', element: <AdminRazorpayPage /> },
        { path: 'settings/supa-cloud', element: <AdminSupaCloudPage /> },
        { path: 'settings/role-permission', element: <AdminRolePermissionPage /> },
        { path: 'plugins/add-new', element: <AdminAddPluginsPage /> },
        { path: 'plugins/installed', element: <AdminInstalledPluginsPage /> },
      ],
    },
    {
      element: <AdminLayout />,
      children: [
        {
          path: '/recruiter/recruiter-dashboard',
          element: (
            <ProtectedRoute allowedRoles={['recruiter']}>
              <EmployerDashboard />
            </ProtectedRoute>
          ),
        },
        {
          path: '/recruiter-dashboard',
          element: (
            <ProtectedRoute allowedRoles={['recruiter']}>
              <EmployerDashboard />
            </ProtectedRoute>
          ),
        },
        {
          path: '/recruiter-jobs',
          element: (
            <ProtectedRoute allowedRoles={['recruiter']}>
              <RecruiterJobsPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/recruiter-profile',
          element: (
            <ProtectedRoute allowedRoles={['recruiter']}>
              <RecruiterProfilePage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/recruiter-applications',
          element: (
            <ProtectedRoute allowedRoles={['recruiter']}>
              <RecruiterApplicationsPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/recruiter-applications/candidate/:candidateEmail',
          element: (
            <ProtectedRoute allowedRoles={['recruiter']}>
              <RecruiterCandidateApplicationsPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/recruiter-pricing',
          element: (
            <ProtectedRoute allowedRoles={['recruiter']}>
              <RecruiterPricingPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/recruiter-interviews',
          element: (
            <ProtectedRoute allowedRoles={['recruiter']}>
              <RecruiterInterviewsPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/recruiter-analytics',
          element: (
            <ProtectedRoute allowedRoles={['recruiter']}>
              <RecruiterAnalyticsPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/recruiter-team',
          element: (
            <ProtectedRoute allowedRoles={['recruiter']}>
              <RecruiterTeamPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/recruiter-talent',
          element: (
            <ProtectedRoute allowedRoles={['recruiter']}>
              <RecruiterTalentPoolPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/recruiter-find-resume',
          element: (
            <ProtectedRoute allowedRoles={['recruiter']}>
              <RecruiterFindResumePage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/recruiter-resources',
          element: (
            <ProtectedRoute allowedRoles={['recruiter']}>
              <RecruiterResourcesPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/employers-dashboard',
          element: (
            <ProtectedRoute allowedRoles={['recruiter']}>
              <EmployerDashboard />
            </ProtectedRoute>
          ),
        },
        {
          path: '/employer-dashboard',
          element: (
            <ProtectedRoute allowedRoles={['recruiter']}>
              <EmployerDashboard />
            </ProtectedRoute>
          ),
        },
        {
          path: '/admin-dashboard',
          element: (
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminRoleDashboard role="Admin" />
            </ProtectedRoute>
          ),
        },
        {
          path: '/staff-dashboard',
          element: (
            <ProtectedRoute allowedRoles={['staff']}>
              <AdminRoleDashboard role="staff" />
            </ProtectedRoute>
          ),
        },
        {
          path: '/recruiter-role-dashboard',
          element: (
            <ProtectedRoute allowedRoles={['recruiter']}>
              <AdminRoleDashboard role="recruiter" />
            </ProtectedRoute>
          ),
        },
        {
          path: '/users-dashboard',
          element: (
            <ProtectedRoute allowedRoles={['users']}>
              <AdminRoleDashboard role="users" />
            </ProtectedRoute>
          ),
        },
        {
          path: '/hiring-dashboard',
          element: (
            <ProtectedRoute allowedRoles={['hiring']}>
              <Navigate replace to="/admin/hiring-team" />
            </ProtectedRoute>
          ),
        },
        {
          path: '/account-team-dashboard',
          element: (
            <ProtectedRoute allowedRoles={['account team']}>
              <Navigate replace to="/admin/employers" />
            </ProtectedRoute>
          ),
        },
        { path: '/admin-dashoard', element: <RoleRedirect /> },
        { path: '/employers-dashoard', element: <RoleRedirect /> },
        { path: '/recruiter-dashoard', element: <RoleRedirect /> },
        { path: '/staff-dashoard', element: <RoleRedirect /> },
        { path: '/company-dashoard', element: <RoleRedirect /> },
        { path: '/recruiter-role-dashoard', element: <RoleRedirect /> },
        { path: '/users-dashoard', element: <RoleRedirect /> },
      ],
    },
    {
      element: <FreelancerLayout />,
      children: [
        { path: '/freelancer', element: <FreelancerPage /> },
        { path: '/freelancer/projects', element: <FreelancerProjectsPage /> },
        { path: '/freelance-project-listings-:projectSlug', element: <FreelancerProjectDetailsPage /> },
        { path: '/freelancer/projects/:projectSlug', element: <FreelancerProjectDetailsPage /> },
        { path: '/freelancer-login', element: <AuthPage defaultRole="freelancer" lockRole /> },
        { path: '/freelancer-register', element: <FreelancerRegisterPage /> },
        { path: '/freelancer/privacy', element: <ContentPage placement="Freelancer Frontend" slug="freelancer-privacy" /> },
        { path: '/freelancer/terms', element: <ContentPage placement="Freelancer Frontend" slug="freelancer-terms" /> },
        { path: '/freelancer/support', element: <ContentPage placement="Freelancer Frontend" slug="freelancer-support" /> },
        { path: '/freelancer/policies/:pageSlug', element: <ContentPage placement="Freelancer Frontend" /> },
      ],
    },
    {
      element: <EmployerLayout />,
      children: [
        { path: '/recruiter', element: <EmployerLandingPage /> },
        { path: '/employers', element: <EmployerLandingPage /> },
        { path: '/recruiter-solutions', element: <EmployerLandingPage /> },
        { path: '/recruiter-testimonials', element: <RecruiterTestimonialsPage /> },
        { path: '/recruiter/privacy', element: <ContentPage placement="Recruiter Frontend" slug="recruiter-privacy" /> },
        { path: '/recruiter/terms', element: <ContentPage placement="Recruiter Frontend" slug="recruiter-terms" /> },
        { path: '/recruiter/support', element: <ContentPage placement="Recruiter Frontend" slug="recruiter-support" /> },
        { path: '/recruiter/policies/:pageSlug', element: <ContentPage placement="Recruiter Frontend" /> },
        { path: '/recruiter-login', element: <RecruiterAuthModalPage mode="recruiter-login" /> },
        { path: '/employer-login', element: <EmployerLoginPage /> },
        { path: '/recruiter-register', element: <RecruiterAuthModalPage mode="recruiter-register" /> },
        { path: '/employer-register', element: <EmployerRegisterPage /> },
        { path: '/recruiter-verification', element: <RecruiterVerificationPage /> },
        { path: '/recruiter-documents', element: <RecruiterDocumentsPage /> },
        { path: '/recruiter-document-review', element: <RecruiterDocumentReviewPage /> },
      ],
    },
  ]))

  return (
    <>
      <Suspense fallback={<div role="status" className="grid min-h-[50dvh] place-items-center px-4 text-sm font-semibold text-slate-500">Loading page...</div>}>
        <RouterProvider router={router} />
      </Suspense>
      <ApplyModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      <Toast />
      <CookieConsent />
    </>
  )
}

function RecruiterAuthModalPage({ mode }) {
  const navigate = useNavigate()

  return (
    <>
      <EmployerLandingPage />
      <AuthModal
        initialMode={mode}
        onClose={() => navigate('/recruiter')}
        open
      />
    </>
  )
}

export default App
