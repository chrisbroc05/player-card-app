import React from "react";
import { Link } from "react-router-dom";
import LegalPageLayout, { LegalSection } from "../components/LegalPageLayout";

export default function TermsOfService() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated="August 2026">
      <LegalSection title="Acceptance of Terms">
        <p>
          By using Prospect Legends you agree to these Terms of Service. If you do not agree, please do not use
          the platform.
        </p>
      </LegalSection>

      <LegalSection title="Description of Service">
        <p>
          Prospect Legends is a digital trading card platform for youth athletes. Users can create AI-generated
          cards, collect, trade, and sell cards on our marketplace.
        </p>
      </LegalSection>

      <LegalSection title="User Accounts">
        <ul>
          <li>You must provide accurate information</li>
          <li>You are responsible for your account security</li>
          <li>You must be 13 or older to use the platform</li>
          <li>Parents are responsible for minors&apos; use</li>
        </ul>
      </LegalSection>

      <LegalSection title="Credits and Payments">
        <ul>
          <li>Credits are purchased in USD</li>
          <li>Credits are non-refundable except as required by law or our refund policy</li>
          <li>Card generation fees are charged upon generation</li>
          <li>Platform takes 8% royalty on marketplace sales</li>
        </ul>
      </LegalSection>

      <LegalSection title="User Content">
        <ul>
          <li>You retain ownership of photos you upload</li>
          <li>You grant us license to use uploaded content to provide the service</li>
          <li>You must have rights to any photos uploaded</li>
          <li>No inappropriate or harmful content</li>
        </ul>
      </LegalSection>

      <LegalSection title="Marketplace Rules">
        <ul>
          <li>All sales are final once completed</li>
          <li>We reserve the right to remove listings that violate our policies</li>
          <li>Prices are set by sellers</li>
        </ul>
      </LegalSection>

      <LegalSection title="Prohibited Activities">
        <ul>
          <li>No fraudulent transactions</li>
          <li>No uploading content you don&apos;t own</li>
          <li>No attempting to manipulate the rarity system</li>
          <li>No creating accounts to abuse the platform</li>
        </ul>
      </LegalSection>

      <LegalSection title="Limitation of Liability">
        <p>
          Prospect Legends is provided as-is. We are not liable for any indirect, incidental, or consequential
          damages arising from use of the platform.
        </p>
      </LegalSection>

      <LegalSection title="Changes to Terms">
        <p>
          We may update these terms at any time. Continued use of the platform constitutes acceptance of new
          terms.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>For questions about these terms:</p>
        <p>
          <a href="mailto:support@prospectlegends.com">support@prospectlegends.com</a>
          <br />
          <Link to="/contact">prospectlegends.com/contact</Link>
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
