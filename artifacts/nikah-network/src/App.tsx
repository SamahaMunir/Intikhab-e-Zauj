import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DemoSwitcher } from "@/components/DemoSwitcher";

// Marketing
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import Home from "@/pages/marketing/home";
import About from "@/pages/marketing/about";
import HowItWorks from "@/pages/marketing/how-it-works";
import Counselling from "@/pages/marketing/counselling";
import Pricing from "@/pages/marketing/pricing";
import Login from "@/pages/marketing/login";
import Register from "@/pages/marketing/register";
import StaffLogin from "@/pages/marketing/staff-login";
import StaffRegister from "@/pages/marketing/staff-register";
import SuccessStories from "@/pages/marketing/success-stories";
import Contact from "@/pages/marketing/contact";

// App Portal
import AppLayout from "@/components/layout/AppLayout";
import AppDashboard from "@/pages/app/dashboard";
import AppMatches from "@/pages/app/matches";
import AppMatchDetail from "@/pages/app/match-detail";
import AppProposals from "@/pages/app/proposals";
import AppProposalDetail from "@/pages/app/proposal-detail";
import AppProfile from "@/pages/app/profile";
import AppCounselling from "@/pages/app/counselling";
import AppSettings from "@/pages/app/settings";

// Staff Portal
import StaffLayout from "@/components/layout/StaffLayout";
import StaffDashboard from "@/pages/staff/dashboard";
import StaffProfiles from "@/pages/staff/profiles";
import StaffProfileDetail from "@/pages/staff/profile-detail";
import StaffMatches from "@/pages/staff/matches";
import StaffProposals from "@/pages/staff/proposals";
import StaffMessages from "@/pages/staff/messages";
import StaffCounselling from "@/pages/staff/counselling";
import StaffAudit from "@/pages/staff/audit";
import StaffConfig from "@/pages/staff/config";

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function MarketingRouter() {
  return (
    <MarketingLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/how-it-works" component={HowItWorks} />
        <Route path="/counselling" component={Counselling} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/success-stories" component={SuccessStories} />
        <Route path="/contact" component={Contact} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/staff-login" component={StaffLogin} />
        <Route path="/staff-register" component={StaffRegister} />
        <Route component={NotFound} />
      </Switch>
    </MarketingLayout>
  );
}

function AppPortalRouter() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/app/dashboard" component={AppDashboard} />
        <Route path="/app/matches" component={AppMatches} />
        <Route path="/app/match/:id" component={AppMatchDetail} />
        <Route path="/app/proposals" component={AppProposals} />
        <Route path="/app/proposals/:id" component={AppProposalDetail} />
        <Route path="/app/profile" component={AppProfile} />
        <Route path="/app/counselling" component={AppCounselling} />
        <Route path="/app/settings" component={AppSettings} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function StaffPortalRouter() {
  return (
    <StaffLayout>
      <Switch>
        <Route path="/staff/dashboard" component={StaffDashboard} />
        <Route path="/staff/profiles" component={StaffProfiles} />
        <Route path="/staff/profiles/:id" component={StaffProfileDetail} />
        <Route path="/staff/matches" component={StaffMatches} />
        <Route path="/staff/proposals" component={StaffProposals} />
        <Route path="/staff/messages" component={StaffMessages} />
        <Route path="/staff/counselling" component={StaffCounselling} />
        <Route path="/staff/audit" component={StaffAudit} />
        <Route path="/staff/config" component={StaffConfig} />
        <Route component={NotFound} />
      </Switch>
    </StaffLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/app/*" component={AppPortalRouter} />
      <Route path="/staff/*" component={StaffPortalRouter} />
      <Route path="/*" component={MarketingRouter} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
        <DemoSwitcher />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
