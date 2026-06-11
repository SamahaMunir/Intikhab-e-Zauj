import LandingNew from '@/pages/marketing/landing-new';
import UserAuthModal from '@/components/UserAuthModal';

export default function UserLogin() {
  return (
    <>
      <LandingNew />
      <UserAuthModal initialMode="login" />
    </>
  );
}
