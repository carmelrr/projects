import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Owl Performance',
};

export default function TermsPage() {
  const updated = 'April 18, 2026';

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>

      <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none space-y-6 text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
        <p>
          By accessing or using Owl Performance (&quot;the Service&quot;), you agree to be bound by these
          Terms of Service. If you do not agree, do not use the Service.
        </p>

        <h2 className="text-lg font-semibold text-foreground">2. Description of Service</h2>
        <p>
          Owl Performance is a coaching platform that enables fitness coaches to manage clients,
          create training programs, track compliance, and communicate — via web and mobile applications.
        </p>

        <h2 className="text-lg font-semibold text-foreground">3. User Accounts</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>You must provide accurate and complete registration information.</li>
          <li>You are responsible for maintaining the security of your account credentials.</li>
          <li>You must be at least 16 years old to use the Service.</li>
          <li>One person or legal entity may not maintain more than one account.</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Use the Service for any unlawful purpose.</li>
          <li>Upload harmful, offensive, or infringing content.</li>
          <li>Attempt to gain unauthorized access to the Service or its systems.</li>
          <li>Interfere with or disrupt the Service or servers.</li>
          <li>Scrape, crawl, or use automated means to access the Service without permission.</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">5. Intellectual Property</h2>
        <p>
          All content, trademarks, and technology comprising the Service are owned by Owl Performance.
          You retain ownership of the data you submit, but grant us a license to use it to provide the Service.
        </p>

        <h2 className="text-lg font-semibold text-foreground">6. Coach &amp; Client Relationship</h2>
        <p>
          Owl Performance facilitates the relationship between coaches and clients but is not a party
          to any coaching agreement. Coaches are solely responsible for the training advice they provide.
        </p>

        <h2 className="text-lg font-semibold text-foreground">7. Disclaimer of Warranties</h2>
        <p>
          The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind,
          either express or implied, including but not limited to fitness for a particular purpose,
          merchantability, or non-infringement.
        </p>

        <h2 className="text-lg font-semibold text-foreground">8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Owl Performance shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages arising out of your use of the Service.
        </p>

        <h2 className="text-lg font-semibold text-foreground">9. Termination</h2>
        <p>
          We reserve the right to suspend or terminate your account at any time for violation of these
          Terms. You may delete your account at any time by contacting us.
        </p>

        <h2 className="text-lg font-semibold text-foreground">10. Changes to Terms</h2>
        <p>
          We may modify these Terms at any time. Continued use of the Service after changes constitutes
          acceptance of the updated Terms.
        </p>

        <h2 className="text-lg font-semibold text-foreground">11. Contact</h2>
        <p>
          Questions about these Terms? Contact us at:{' '}
          <a href="mailto:support@owlperformance.com" className="text-primary hover:underline">
            support@owlperformance.com
          </a>
        </p>
      </div>
    </section>
  );
}
