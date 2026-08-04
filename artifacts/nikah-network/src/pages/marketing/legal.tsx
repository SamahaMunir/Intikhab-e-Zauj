import PublicLayout from '@/components/layout/PublicLayout';

/**
 * Legal / policy pages required for Safepay live-payment website verification:
 * Privacy Policy, Terms & Conditions, Refund Policy, Ownership Statement.
 *
 * Business details filled in for Safepay verification. If the registered
 * business name / address / NTN changes, update the Contact + Ownership blocks.
 */

const LAST_UPDATED = 'August 2026';
const SERVICE = 'Intikhab-e-Zauj';

// ── Shared shell ──────────────────────────────────────────────────────────────
function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <PublicLayout navAlwaysSolid>
      <main className="max-w-3xl mx-auto px-5 pt-28 pb-20">
        <h1 className="text-3xl md:text-4xl font-bold text-[#1C1917] mb-2">{title}</h1>
        <p className="text-sm text-stone-500 mb-10">Last updated: {LAST_UPDATED}</p>
        <div className="space-y-6 text-stone-600 leading-relaxed [&_h2]:text-xl [&_h2]:font-bold
                        [&_h2]:text-[#1C1917] [&_h2]:mt-8 [&_h2]:mb-2 [&_p]:leading-relaxed
                        [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_a]:text-primary [&_a]:underline">
          {children}
        </div>
      </main>
    </PublicLayout>
  );
}

// ══ Privacy Policy ════════════════════════════════════════════════════════════
export function PrivacyPolicy() {
  return (
    <LegalShell title="Privacy Policy">
      <p>
        {SERVICE} ("we", "us", "our") is a matrimonial matchmaking service. This
        policy explains what personal information we collect, why, and how we
        protect it. By using our website and services you agree to this policy.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>Account details: name, email, phone number, password.</li>
        <li>Profile details you provide for matchmaking: age, gender, city, education, profession, caste, family details, preferences, and photographs.</li>
        <li>Payment information: processed securely by our payment partner, Safepay. We do not store your card or bank details on our servers.</li>
        <li>Usage data: log information and basic device/browser data needed to run the service.</li>
      </ul>

      <h2>How we use your information</h2>
      <ul>
        <li>To create your profile and suggest compatible matches.</li>
        <li>To let our matchmaking staff review, approve, and propose matches on your behalf.</li>
        <li>To process your one-time registration payment and grant access.</li>
        <li>To contact you about proposals, matches, and service updates.</li>
      </ul>

      <h2>How we share your information</h2>
      <p>
        Your profile is shared with our authorised matchmaking staff and, when a
        match is proposed, with the prospective match and their family as part of
        the matchmaking process. We do not sell your data. We share data with
        service providers only as needed to run the service (e.g. Safepay for
        payments, our hosting and email providers).
      </p>

      <h2>Data storage & security</h2>
      <p>
        Your data is stored on secured, access-controlled databases. We apply
        reasonable technical and organisational measures to protect it. No method
        of transmission or storage is 100% secure, but we work to safeguard your
        information.
      </p>

      <h2>Your rights</h2>
      <p>
        You may request access to, correction of, or deletion of your personal
        data, and you may deactivate your profile at any time, by contacting us at{' '}
        <a href="mailto:info.fkcenter@gmail.com">info.fkcenter@gmail.com</a>.
      </p>

      <h2>Contact</h2>
      <p>
        Intikhab-e-Zauj<br />
        30-G/1, Johar Town, Lahore, Pakistan<br />
        Email: <a href="mailto:info.fkcenter@gmail.com">info.fkcenter@gmail.com</a> · Phone: 042-32488223 (Tel) · 0336-7356379 (Cell)
      </p>
    </LegalShell>
  );
}

// ══ Terms & Conditions ════════════════════════════════════════════════════════
export function TermsAndConditions() {
  return (
    <LegalShell title="Terms and Conditions">
      <p>
        These Terms govern your use of {SERVICE}. By registering or using our
        services, you agree to them. Please read them carefully.
      </p>

      <h2>Eligibility</h2>
      <p>
        You must be of legal age for marriage under Pakistani law and genuinely
        seeking marriage. You agree to provide accurate, truthful information.
        Profiles with false or misleading details may be removed without refund.
      </p>

      <h2>Our service</h2>
      <p>
        {SERVICE} is a staff-mediated matrimonial service. We help introduce and
        propose potential matches based on the information and preferences you
        provide. We facilitate introductions only — we do not guarantee a match,
        engagement, or marriage.
      </p>

      <h2>Registration fee</h2>
      <p>
        Access to full matchmaking features requires a one-time registration fee
        of <strong>Rs. 4,000 (PKR)</strong>, processed securely via Safepay.
        Payment terms are covered in our{' '}
        <a href="/refund">Cancellation/Return/Refund Policy</a>.
      </p>

      <h2>User conduct</h2>
      <ul>
        <li>Use the service respectfully and only for genuine matrimonial purposes.</li>
        <li>Do not harass, deceive, impersonate, or misuse other members' information.</li>
        <li>Do not share another member's details outside the matchmaking process.</li>
      </ul>

      <h2>Disclaimers & liability</h2>
      <p>
        The service is provided on an "as is" basis. We are not responsible for
        the conduct, claims, or decisions of members. To the extent permitted by
        law, our liability is limited to the registration fee you paid.
      </p>

      <h2>Governing law</h2>
      <p>
        These Terms are governed by the laws of Pakistan, and any disputes are
        subject to the courts of Lahore, Pakistan.
      </p>

      <h2>Contact</h2>
      <p>
        Email: <a href="mailto:info.fkcenter@gmail.com">info.fkcenter@gmail.com</a> · Phone: 042-32488223 (Tel) · 0336-7356379 (Cell)
      </p>
    </LegalShell>
  );
}

// ══ Cancellation / Return / Refund Policy ═════════════════════════════════════
export function RefundPolicy() {
  return (
    <LegalShell title="Cancellation, Return & Refund Policy">
      <p>
        {SERVICE} provides a digital matrimonial service. The one-time
        registration fee of <strong>Rs. 4,000 (PKR)</strong> covers profile
        verification and access to matchmaking. This policy explains when that fee
        can be cancelled or refunded.
      </p>

      <h2>Cancellation</h2>
      <p>
        You may cancel and request a refund of your registration fee within{' '}
        <strong>7 days</strong> of payment, provided that:
      </p>
      <ul>
        <li>your profile has not yet been approved, and</li>
        <li>no matches or proposals have been delivered to you.</li>
      </ul>

      <h2>Non-refundable cases</h2>
      <ul>
        <li>Once your profile has been approved or any matchmaking service (matches, proposals, or introductions) has been provided.</li>
        <li>After the 7-day cancellation window has passed.</li>
        <li>If your account is suspended or terminated for violating our Terms (e.g. false information or misconduct).</li>
      </ul>

      <h2>How to request a refund</h2>
      <p>
        Email <a href="mailto:info.fkcenter@gmail.com">info.fkcenter@gmail.com</a> from your
        registered email with your name and payment reference. Approved refunds are
        returned to your original payment method within{' '}
        <strong>[7–10] business days</strong>. Processing times may vary depending
        on your bank and our payment partner, Safepay.
      </p>

      <h2>Contact</h2>
      <p>
        Intikhab-e-Zauj · Email:{' '}
        <a href="mailto:info.fkcenter@gmail.com">info.fkcenter@gmail.com</a> · Phone: 042-32488223 (Tel) · 0336-7356379 (Cell)
      </p>
    </LegalShell>
  );
}

// ══ Ownership Statement ═══════════════════════════════════════════════════════
export function OwnershipStatement() {
  return (
    <LegalShell title="Ownership Statement">
      <p>
        This website and the {SERVICE} service are owned and operated by:
      </p>
      <p>
        <strong>Falah-e-Khandan Trust</strong>, operating as <strong>Intikhab-e-Zauj</strong><br />
        30-G/1, Johar Town<br />
        Lahore, Pakistan<br />
        Registration Type: Sole Proprietorship<br />
        Business Registration / NTN: In process
      </p>

      <h2>Nature of business</h2>
      <p>
        {SERVICE} is a matrimonial matchmaking service that helps individuals and
        families find compatible marriage partners in line with Islamic and
        family values. We charge a one-time registration fee and provide
        staff-mediated matchmaking.
      </p>

      <h2>Payments</h2>
      <p>
        Online payments on this website are processed securely by our payment
        partner, <strong>Safepay</strong>. Settlements are deposited to our
        registered business bank account.
      </p>

      <h2>Contact</h2>
      <p>
        Email: <a href="mailto:info.fkcenter@gmail.com">info.fkcenter@gmail.com</a> · Phone: 042-32488223 (Tel) · 0336-7356379 (Cell)
      </p>
    </LegalShell>
  );
}
