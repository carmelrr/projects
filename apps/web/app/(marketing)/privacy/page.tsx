import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Owl Performance',
};

export default function PrivacyPolicyPage() {
  const updated = 'April 18, 2026';

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>

      <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none space-y-6 text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">1. Introduction</h2>
        <p>
          Owl Performance (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the Owl Performance
          web application and mobile application (together, the &quot;Service&quot;). This Privacy Policy
          explains how we collect, use, disclose, and safeguard your information when you use our Service.
        </p>

        <h2 className="text-lg font-semibold text-foreground">2. Information We Collect</h2>
        <p>We may collect the following types of information:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Account information:</strong> name, email address, and password when you register.</li>
          <li><strong>Profile data:</strong> profile photo, role (coach or client), and organization details.</li>
          <li><strong>Workout &amp; training data:</strong> programs, workout logs, exercise history, and compliance metrics.</li>
          <li><strong>Body metrics:</strong> weight, body measurements, and progress photos you choose to submit.</li>
          <li><strong>Messages:</strong> content of messages exchanged between coaches and clients within the Service.</li>
          <li><strong>Device information:</strong> device type, operating system, push notification tokens, and app version.</li>
          <li><strong>Usage data:</strong> pages visited, features used, and interaction timestamps.</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">3. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Provide, operate, and maintain the Service.</li>
          <li>Enable coaches to manage and track their clients&apos; progress.</li>
          <li>Send push notifications and in-app messages.</li>
          <li>Improve and personalize the Service.</li>
          <li>Respond to support requests.</li>
          <li>Comply with legal obligations.</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">4. Data Sharing</h2>
        <p>
          We do not sell your personal data. We may share information with:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Your coach or clients:</strong> training data, metrics, and messages are shared between coaches and their assigned clients as part of the core Service functionality.</li>
          <li><strong>Service providers:</strong> trusted third parties that help us operate the Service (e.g., hosting, analytics, push notification delivery).</li>
          <li><strong>Legal requirements:</strong> when required by law, regulation, or legal process.</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">5. Data Storage &amp; Security</h2>
        <p>
          Your data is stored on secure cloud infrastructure. We use encryption in transit (TLS) and
          implement industry-standard security practices to protect your information. However, no method
          of electronic storage is 100% secure.
        </p>

        <h2 className="text-lg font-semibold text-foreground">6. Data Retention</h2>
        <p>
          We retain your data for as long as your account is active or as needed to provide the Service.
          You may request deletion of your account and associated data at any time by contacting us.
        </p>

        <h2 className="text-lg font-semibold text-foreground">7. Your Rights</h2>
        <p>Depending on your jurisdiction, you may have the right to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Access and receive a copy of your personal data.</li>
          <li>Correct inaccurate data.</li>
          <li>Request deletion of your data.</li>
          <li>Object to or restrict processing.</li>
          <li>Data portability.</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">8. Children&apos;s Privacy</h2>
        <p>
          The Service is not intended for users under the age of 16. We do not knowingly collect
          personal information from children under 16.
        </p>

        <h2 className="text-lg font-semibold text-foreground">9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any changes by
          updating the &quot;Last updated&quot; date at the top of this page.
        </p>

        <h2 className="text-lg font-semibold text-foreground">10. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, please contact us at:{' '}
          <a href="mailto:support@owlperformance.com" className="text-primary hover:underline">
            support@owlperformance.com
          </a>
        </p>
      </div>
    </section>
  );
}
