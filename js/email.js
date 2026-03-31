/* ── EMAILJS INTEGRATION ─────────────────────────────
   Handles two email triggers:
     1. Confirmation email → Client
     2. Notification email → Coach

   SETUP:
   1. Create a free account at https://www.emailjs.com
   2. Create a Service (Gmail, Outlook, etc.) → copy Service ID
   3. Create two Email Templates:
        - "template_client_confirm" (use variables below)
        - "template_coach_notify"   (use variables below)
   4. Copy your Public Key from Account > API Keys
   5. Replace the placeholder strings below.

   CLIENT TEMPLATE variables:  {{client_name}}, {{class_title}},
                                {{coach_name}}, {{class_datetime}}, {{spots_left}}
   COACH TEMPLATE variables:   {{coach_name}}, {{client_name}},
                                {{client_email}}, {{class_title}}, {{class_datetime}}
─────────────────────────────────────────────────────── */

const EMAILJS_CONFIG = {
  publicKey:          'YOUR_PUBLIC_KEY',       // ← replace
  serviceId:          'YOUR_SERVICE_ID',       // ← replace
  clientTemplateId:   'template_client_confirm',
  coachTemplateId:    'template_coach_notify',
};

const EmailService = {
  /** Initialise EmailJS — call once on page load */
  init() {
    if (typeof emailjs === 'undefined') {
      console.warn('EmailJS SDK not loaded. Emails will be simulated.');
      return;
    }
    emailjs.init(EMAILJS_CONFIG.publicKey);
  },

  /** Send confirmation to the client who just booked */
  async sendClientConfirmation({ clientName, clientEmail, classTitle, coachName, classDatetime, spotsLeft }) {
    const params = {
      client_name:    clientName,
      class_title:    classTitle,
      coach_name:     coachName,
      class_datetime: classDatetime,
      spots_left:     spotsLeft,
    };
    return this._send(EMAILJS_CONFIG.clientTemplateId, clientEmail, params);
  },

  /** Send booking notification to the coach */
  async sendCoachNotification({ coachName, coachEmail, clientName, clientEmail, classTitle, classDatetime }) {
    const params = {
      coach_name:    coachName,
      client_name:   clientName,
      client_email:  clientEmail,
      class_title:   classTitle,
      class_datetime: classDatetime,
    };
    return this._send(EMAILJS_CONFIG.coachTemplateId, coachEmail, params);
  },

  /** Internal send helper */
  async _send(templateId, toEmail, params) {
    if (typeof emailjs === 'undefined') {
      // Development fallback — log to console
      console.log(`[EmailService] SIMULATED email via template "${templateId}" to ${toEmail}:`, params);
      return { status: 200, text: 'simulated' };
    }
    try {
      const result = await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        templateId,
        { ...params, to_email: toEmail }
      );
      return result;
    } catch (err) {
      console.error('[EmailService] Failed to send email:', err);
      throw err;
    }
  },
};