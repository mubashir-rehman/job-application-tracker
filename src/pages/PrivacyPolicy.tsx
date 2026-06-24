import { useEffect } from 'react';
import { Footer } from './Footer';

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-slate-400 text-lg">
            Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-slate-300 leading-relaxed">
          
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">1. Introduction</h2>
            <p>
              This Privacy Policy ("Policy") explains how HireTrack (the "Application," "Service," "we," "us," or "our") 
              collects, uses, discloses, and processes personal information from users ("you" or "users") who access and use 
              our job application tracking dashboard and associated services.
            </p>
            <p className="mt-4">
              HireTrack is committed to protecting your privacy and ensuring a transparent relationship with our users 
              regarding data handling practices. Please read this Policy carefully. By accessing or using HireTrack, 
              you acknowledge that you have read, understood, and agree to be bound by the terms of this Privacy Policy.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-blue-300 mt-6 mb-3">2.1 Information You Provide Directly</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Account Registration:</strong> When you create an account, we collect your email address, authentication credentials, and optional profile information (name, profile picture).</li>
              <li><strong>Job Application Data:</strong> Information you enter about job applications, including company names, roles, salary ranges, contact details, interview phases, notes, and post-mortem logs.</li>
              <li><strong>Google Drive Integration:</strong> When you authorize our application to access your Google Drive, we collect information about folders and files you explicitly grant permission for us to create, read, or modify.</li>
              <li><strong>Communication:</strong> Any messages, feedback, or support requests you send to us.</li>
            </ul>

            <h3 className="text-xl font-semibold text-blue-300 mt-6 mb-3">2.2 Information Collected Automatically</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Usage Data:</strong> Information about your interactions with the Application, including pages viewed, features used, time spent, and actions performed.</li>
              <li><strong>Device Information:</strong> Browser type, operating system, device identifiers, and IP address.</li>
              <li><strong>Log Data:</strong> Server logs containing access times, request data, and error information.</li>
              <li><strong>Cookies & Similar Technologies:</strong> We use cookies and local storage to maintain your session, remember preferences, and analyze usage patterns.</li>
            </ul>

            <h3 className="text-xl font-semibold text-blue-300 mt-6 mb-3">2.3 Third-Party Information</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Google Authentication:</strong> If you sign in via Google, we receive basic profile information (email, name, profile picture) as provided by Google.</li>
              <li><strong>Google Drive Access:</strong> We collect information about files and folders you authorize us to access in your Google Drive for backup and integration purposes.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We use the information we collect for the following purposes:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Service Provision:</strong> To deliver, maintain, and improve the core functionality of HireTrack, including job application tracking, data persistence, and analytics.</li>
              <li><strong>Authentication & Account Management:</strong> To verify your identity, manage your account, and enable secure login across devices.</li>
              <li><strong>Google Drive Integration:</strong> To securely backup your job application data to your Google Drive, export reports to Google Drive, and synchronize data across authorized services.</li>
              <li><strong>Personalization:</strong> To customize your experience, remember your preferences, and display relevant features.</li>
              <li><strong>Communication:</strong> To send service updates, security alerts, and respond to your support requests or inquiries.</li>
              <li><strong>Analytics & Improvement:</strong> To analyze usage patterns, identify trends, understand user behavior, and optimize the Application's performance and design.</li>
              <li><strong>Legal Compliance:</strong> To comply with applicable laws, regulations, court orders, and to protect our legal rights.</li>
              <li><strong>Fraud Prevention:</strong> To detect, prevent, and address fraudulent activity, abuse, security incidents, and technical issues.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">4. Google Drive API Usage Disclosure</h2>
            <p className="mb-4">
              HireTrack's use and transfer of information received from Google APIs adheres to the 
              <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-cyan-400 hover:text-cyan-300 underline" target="_blank" rel="noopener noreferrer">
                {' '}Google API Services User Data Policy
              </a>, including the Limited Use requirements.
            </p>
            
            <h3 className="text-xl font-semibold text-blue-300 mt-6 mb-3">4.1 What We Access</h3>
            <p className="mb-4">
              When you authorize HireTrack to access your Google Drive, we request the following scopes:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><code className="bg-slate-800 px-2 py-1 rounded">https://www.googleapis.com/auth/drive.file</code> - Access to files created or opened by HireTrack in your Google Drive.</li>
              <li><code className="bg-slate-800 px-2 py-1 rounded">https://www.googleapis.com/auth/drive.readonly</code> - Read-only access to view file metadata (optional for import features).</li>
            </ul>

            <h3 className="text-xl font-semibold text-blue-300 mt-6 mb-3">4.2 How We Use Google Drive Data</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Store encrypted backups of your job application data in a dedicated folder within your Google Drive.</li>
              <li>Create and manage spreadsheet exports of your application pipeline for analysis and reporting.</li>
              <li>Sync job application data across devices when you authorize the integration.</li>
              <li>Restore your data from Google Drive if you reinstall the Application or switch devices.</li>
            </ul>

            <h3 className="text-xl font-semibold text-blue-300 mt-6 mb-3">4.3 Data Retention & Deletion</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Files created by HireTrack in your Google Drive remain there until you manually delete them or revoke access.</li>
              <li>If you revoke Google Drive access or delete your HireTrack account, we will cease creating new files in your Drive.</li>
              <li>Previously created files remain in your Google Drive storage and are subject to your own data retention practices.</li>
            </ul>

            <h3 className="text-xl font-semibold text-blue-300 mt-6 mb-3">4.4 Google Account Security</h3>
            <p>
              We do not store your Google credentials. Authentication is handled via OAuth 2.0, which means Google manages your login securely. 
              We only receive an access token to perform authorized operations on your behalf.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">5. Data Sharing & Disclosure</h2>
            
            <h3 className="text-xl font-semibold text-blue-300 mt-6 mb-3">5.1 Who We Share Data With</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Supabase:</strong> We share your data with Supabase, our database provider, for cloud storage and persistence. Supabase is bound by strict data processing agreements.</li>
              <li><strong>Google:</strong> Google Drive files are stored in your own Google account under your control. Only you and HireTrack (with your authorization) can access them.</li>
              <li><strong>Service Providers:</strong> We may share limited information with vendors and service providers who assist us (e.g., hosting, analytics, payment processing).</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law, government request, or court order.</li>
            </ul>

            <h3 className="text-xl font-semibold text-blue-300 mt-6 mb-3">5.2 Who We Do NOT Share Data With</h3>
            <p>
              We do not sell, rent, lease, or trade your personal information to third parties for their marketing purposes. 
              We do not share your job application data, salary information, or interview notes with recruiters, employers, or advertising networks.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">6. Data Security</h2>
            <p className="mb-4">
              We implement industry-standard technical and organizational measures to protect your personal information against unauthorized access, 
              alteration, disclosure, or destruction. These include:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Encryption in transit (HTTPS/TLS) for all communication.</li>
              <li>Encryption at rest for sensitive data stored in our database.</li>
              <li>Access controls and authentication requirements for user accounts.</li>
              <li>Regular security audits and vulnerability assessments.</li>
              <li>Secure OAuth 2.0 integration with Google Drive.</li>
            </ul>
            <p className="mt-4">
              However, no security measure is completely foolproof. While we strive to protect your data, we cannot guarantee absolute security. 
              You are responsible for maintaining the confidentiality of your login credentials.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">7. Your Privacy Rights & Choices</h2>
            
            <h3 className="text-xl font-semibold text-blue-300 mt-6 mb-3">7.1 Access & Portability</h3>
            <p>
              You have the right to request a copy of your personal data and to receive it in a portable, machine-readable format. 
              Contact us using the information in Section 11 to exercise this right.
            </p>

            <h3 className="text-xl font-semibold text-blue-300 mt-6 mb-3">7.2 Correction & Deletion</h3>
            <p>
              You can update, correct, or delete your account information and job application data directly within the Application. 
              Upon account deletion, we will remove your data from our servers, subject to legal retention requirements.
            </p>

            <h3 className="text-xl font-semibold text-blue-300 mt-6 mb-3">7.3 Google Drive Access Revocation</h3>
            <p>
              You can revoke HireTrack's access to your Google Drive at any time by:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Visiting <a href="https://myaccount.google.com/permissions" className="text-cyan-400 hover:text-cyan-300 underline" target="_blank" rel="noopener noreferrer">Google Account Permissions</a> and removing HireTrack's authorization.</li>
              <li>Using the disconnect option within the HireTrack application settings.</li>
            </ul>

            <h3 className="text-xl font-semibold text-blue-300 mt-6 mb-3">7.4 Cookie Control</h3>
            <p>
              You can manage cookies through your browser settings. However, disabling cookies may affect the functionality of the Application.
            </p>

            <h3 className="text-xl font-semibold text-blue-300 mt-6 mb-3">7.5 Communication Preferences</h3>
            <p>
              You can opt out of non-essential communications (e.g., marketing emails) by clicking the unsubscribe link in our emails 
              or adjusting your account settings.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">8. Children's Privacy</h2>
            <p>
              HireTrack is intended for users aged 18 and older. We do not knowingly collect personal information from children under 18. 
              If we learn that we have collected information from a child under 18, we will promptly delete it and request parental consent. 
              If you believe we have collected information from a minor, please contact us immediately.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">9. Data Retention</h2>
            <p className="mb-4">
              We retain your personal information for as long as necessary to provide our services, comply with legal obligations, 
              and resolve disputes. Specific retention periods include:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Active Account Data:</strong> Retained while your account is active.</li>
              <li><strong>Deleted Accounts:</strong> Permanently deleted within 30 days of account deletion, except where required by law.</li>
              <li><strong>Log Data:</strong> Typically retained for 90 days for security and analytics purposes.</li>
              <li><strong>Backup Data:</strong> Retained according to our backup retention policy (typically 6 months).</li>
            </ul>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">10. International Data Transfer</h2>
            <p className="mb-4">
              HireTrack is hosted on servers located in multiple jurisdictions. If you access HireTrack from outside your country of residence, 
              you consent to the transfer of your personal information to countries that may have different data protection laws than your home country.
            </p>
            <p>
              For users in the European Economic Area (EEA), by using HireTrack, you acknowledge that your data may be transferred to and processed 
              in jurisdictions outside the EEA. We implement appropriate safeguards, including standard contractual clauses and adequacy decisions, 
              where applicable.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">11. Contact Us</h2>
            <p className="mb-4">
              If you have questions about this Privacy Policy, wish to exercise your rights, or have privacy concerns, 
              please contact us:
            </p>
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 space-y-3">
              <p><strong>Email:</strong> privacy@hiretrack.dev</p>
              <p><strong>Website:</strong> <a href="https://job-application-tracker-sigma-liard.vercel.app" className="text-cyan-400 hover:text-cyan-300 underline" target="_blank" rel="noopener noreferrer">HireTrack</a></p>
              <p className="text-sm text-slate-400">
                We will respond to your request within 30 days (or as required by applicable law).
              </p>
            </div>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">12. Changes to This Privacy Policy</h2>
            <p className="mb-4">
              We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, 
              or other factors. We will notify you of material changes by posting the updated policy on this page and updating the "Last Updated" date.
            </p>
            <p>
              Your continued use of HireTrack after changes to this Privacy Policy constitutes your acceptance of the updated terms. 
              We encourage you to review this Policy periodically to stay informed about how we protect your information.
            </p>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">13. Regional Privacy Rights</h2>
            
            <h3 className="text-xl font-semibold text-blue-300 mt-6 mb-3">13.1 GDPR (European Users)</h3>
            <p>
              If you are located in the EEA, you have specific rights under the General Data Protection Regulation (GDPR), including:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Right to access, rectification, and erasure of your personal data.</li>
              <li>Right to restrict or object to processing.</li>
              <li>Right to data portability.</li>
              <li>Right to lodge a complaint with your local data protection authority.</li>
            </ul>

            <h3 className="text-xl font-semibold text-blue-300 mt-6 mb-3">13.2 CCPA (California Users)</h3>
            <p>
              If you are a California resident, you have rights under the California Consumer Privacy Act (CCPA), including:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Right to know what data is collected.</li>
              <li>Right to delete your personal information.</li>
              <li>Right to opt-out of data sales (we do not sell data).</li>
              <li>Right to non-discrimination for exercising your privacy rights.</li>
            </ul>
          </section>

          {/* Final Section */}
          <section>
            <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 p-6 rounded-lg border border-cyan-700/30 mt-8">
              <p className="text-slate-300">
                By using HireTrack, you acknowledge that you have read and understood this Privacy Policy and consent to our collection, 
                use, and disclosure of your personal information as described herein.
              </p>
            </div>
          </section>

        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
