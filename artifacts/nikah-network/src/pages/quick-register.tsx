import LandingNew from '@/pages/marketing/landing-new';
import UserAuthModal from '@/components/UserAuthModal';

export default function QuickRegister() {
  return (
    <>
      <LandingNew />
      <UserAuthModal initialMode="signup" />
    </>
  );
}
