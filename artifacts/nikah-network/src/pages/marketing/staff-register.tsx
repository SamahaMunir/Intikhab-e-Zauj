// Staff self-signup removed — accounts are created by an administrator.
// Old links resolve to the staff login modal.
import LandingNew from "@/pages/marketing/landing-new";
import StaffAuthModal from "@/components/StaffAuthModal";

export default function StaffRegister() {
  return (
    <>
      <LandingNew />
      <StaffAuthModal />
    </>
  );
}
