import React from "react";
import { Link } from "react-router-dom";
import LegalPageLayout, { LegalSection } from "../components/LegalPageLayout";

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="August 2026"
      meta={
        <>
          <p>Company: Prospect Legends</p>
          <p>
            Contact:{" "}
            <a href="mailto:support@prospectlegends.com">support@prospectlegends.com</a>
          </p>
        </>
      }
    >
      <LegalSection title="Introduction">
        <p>
          Prospect Legends (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy.
          This Privacy Policy explains how we collect, use, and share information about you when you use our
          platform.
        </p>
      </LegalSection>

      <LegalSection title="Information We Collect">
        <ul>
          <li>Account information (name, email, password)</li>
          <li>Player information (name, photos, stats)</li>
          <li>Payment information (processed securely by Stripe — we do not store card details)</li>
          <li>Usage data (how you interact with the app)</li>
        </ul>
      </LegalSection>

      <LegalSection title="How We Use Your Information">
        <ul>
          <li>To provide and improve our services</li>
          <li>To process payments and transactions</li>
          <li>To send transactional emails</li>
          <li>To communicate platform updates</li>
        </ul>
      </LegalSection>

      <LegalSection title="Information Sharing">
        <p>We do not sell your personal information. We share information only with:</p>
        <ul>
          <li>Stripe (payment processing)</li>
          <li>Resend (email delivery)</li>
          <li>Cloudflare (media storage)</li>
          <li>OpenAI (AI card generation)</li>
          <li>Pika API (AI video generation)</li>
        </ul>
      </LegalSection>

      <LegalSection title="Children's Privacy">
        <p>
          Prospect Legends is designed for use by youth athletes and their families. We comply with the
          Children&apos;s Online Privacy Protection Act (COPPA). Users under 13 must have parental consent to use
          the platform. Parents may contact us to review or delete their child&apos;s information.
        </p>
      </LegalSection>

      <LegalSection title="Data Security">
        <p>
          We use industry-standard security measures to protect your information. All data is transmitted over
          HTTPS and stored securely.
        </p>
      </LegalSection>

      <LegalSection title="Your Rights">
        <p>
          You may request to access, update, or delete your account information at any time by contacting us at{" "}
          <a href="mailto:support@prospectlegends.com">support@prospectlegends.com</a> or through the Settings
          page in the app.
        </p>
      </LegalSection>

      <LegalSection title="Changes to This Policy">
        <p>
          We may update this policy from time to time. We will notify you of significant changes via email.
        </p>
      </LegalSection>

      <LegalSection title="Contact Us">
        <p>If you have questions about this Privacy Policy, contact us at:</p>
        <p>
          <a href="mailto:support@prospectlegends.com">support@prospectlegends.com</a>
          <br />
          <Link to="/contact">prospectlegends.com/contact</Link>
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
