/**
 * Utility functions for sending emails (MailChannels for Cloudflare Workers + Dev Fallback)
 */

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  // Standard email regex
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(clean);
}

/**
 * Escapes HTML special chars for safe interpolation into email templates.
 * Behavior-preserving for normal Thai/ASCII text, neutralizes HTML injection.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Masks an email for safe public presentation (e.g., somchai@gmail.com -> s***i@gmail.com)
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '******';
  const [local, domain] = email.trim().split('@');
  if (local.length <= 2) {
    return `${local[0] || '*'}***@${domain}`;
  }
  const first = local[0];
  const last = local[local.length - 1];
  return `${first}${'*'.repeat(Math.min(4, local.length - 2))}${last}@${domain}`;
}

export interface SendPasswordResetOptions {
  to: string;
  resetUrl: string;
  userName?: string;
  storeName?: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
  devLink?: string;
}

/**
 * Sends a password reset email via Cloudflare Workers MailChannels API
 * with automatic fallback logging for development / staging environments.
 */
export async function sendPasswordResetEmail({
  to,
  resetUrl,
  userName = 'เจ้าของร้าน',
  storeName,
}: SendPasswordResetOptions): Promise<SendEmailResult> {
  const isDev = process.env.NODE_ENV !== 'production';
  const cleanTo = to.trim().toLowerCase();
  const fromEmail = process.env.EMAIL_FROM || 'support@orderpos.app';
  const fromName = 'Order Pos Platform';
  const subject = `🔐 คำขอกู้คืนรหัสผ่านสำหรับร้านของคุณ - Order Pos`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>กู้คืนรหัสผ่าน Order Pos</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #f8fafc; }
    .card { max-width: 540px; margin: 0 auto; background: #1e293b; border-radius: 20px; border: 1px solid #334155; padding: 36px 28px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4); }
    .logo { font-size: 24px; font-weight: 800; color: #f97316; margin-bottom: 24px; display: inline-block; }
    .title { font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .p { font-size: 15px; color: #cbd5e1; line-height: 1.6; margin-bottom: 20px; }
    .btn-wrap { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff !important; font-weight: 700; font-size: 16px; padding: 14px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 10px 15px -3px rgba(249, 115, 22, 0.3); }
    .notice { font-size: 13px; color: #94a3b8; background: #0f172a; border-radius: 12px; padding: 14px 18px; line-height: 1.5; border: 1px solid #1e293b; margin-top: 24px; }
    .footer { font-size: 12px; color: #64748b; text-align: center; margin-top: 24px; line-height: 1.5; }
    .link-alt { word-break: break-all; color: #f97316; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🍽️ Order Pos</div>
    <div class="title">คำขอกู้คืนรหัสผ่าน</div>
    <p class="p">
      เรียนคุณ <strong>${escapeHtml(userName)}</strong>${storeName ? ` (${escapeHtml(storeName)})` : ''},
    </p>
    <p class="p">
      ระบบได้รับคำขอกู้คืนรหัสผ่านสำหรับเข้าสู่ระบบ Order Pos ของคุณ กรุณาแตะที่ปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่:
    </p>
    
    <div class="btn-wrap">
      <a href="${escapeHtml(resetUrl)}" class="btn">ตั้งรหัสผ่านใหม่ (Reset Password)</a>
    </div>

    <div class="notice">
      ⏱️ <strong>ข้อควรระวัง:</strong> ลิงก์นี้จะหมดอายุภายใน <strong>30 นาที</strong> และสามารถใช้งานได้เพียงครั้งเดียว<br>
      หากคุณไม่ได้เป็นผู้ส่งคำขอนี้ คุณสามารถละเว้นอีเมลฉบับนี้ได้อย่างปลอดภัย รหัสผ่านเดิมของคุณจะไม่เปลี่ยนแปลง
    </div>

    <p class="p" style="font-size: 13px; margin-top: 24px; color: #94a3b8;">
      หากไม่สามารถคลิกปุ่มด้านบนได้ สามารถคัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:<br>
      <a href="${escapeHtml(resetUrl)}" class="link-alt">${escapeHtml(resetUrl)}</a>
    </p>
  </div>
  <div class="footer">
    Order Pos Multi-Tenant Platform &bull; ระบบจัดการร้านอาหารตามสั่ง &amp; สแกนสั่งอาหาร
  </div>
</body>
</html>
  `.trim();

  // Always log for transparency during debugging
  console.log(`=========================================
[EMAIL-RESET] 📧 To: ${cleanTo} (${userName})
[EMAIL-RESET] 🔗 Reset URL: ${resetUrl}
[EMAIL-RESET] ⏱️ Expires: 30 minutes
=========================================`);

  // 1. Try sending via Resend API if API key is provided
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const resendSender = process.env.EMAIL_FROM || 'Order Pos <onboarding@resend.dev>';
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendSender,
          to: [cleanTo],
          subject,
          html: htmlContent,
        }),
      });

      const resendData: any = await resendRes.json().catch(() => ({}));
      if (resendRes.ok && resendData.id) {
        console.log(`[Resend Success] 🚀 Email sent via Resend! ID: ${resendData.id} To: ${cleanTo}`);
        return { success: true, devLink: isDev ? resetUrl : undefined };
      }

      console.warn(`[Resend API Notice (${resendRes.status})]:`, resendData);
    } catch (resendErr: any) {
      console.error('[Resend Network Error]:', resendErr);
    }
  }

  // 2. Fallback to Cloudflare Workers MailChannels API
  try {
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: cleanTo, name: userName }],
          },
        ],
        from: {
          email: fromEmail,
          name: fromName,
        },
        subject,
        content: [
          {
            type: 'text/html',
            value: htmlContent,
          },
        ],
      }),
    });

    if (response.ok || response.status === 202) {
      return { success: true, devLink: isDev ? resetUrl : undefined };
    }

    const errText = await response.text().catch(() => '');
    console.warn(`[MailChannels Error (${response.status})]:`, errText);

    return {
      success: true,
      devLink: isDev ? resetUrl : undefined,
      error: !isDev ? `MailChannels returned status ${response.status}` : undefined,
    };
  } catch (err: any) {
    console.error('[sendPasswordResetEmail Error]:', err);
    const isDevEnv = process.env.NODE_ENV !== 'production';
    return {
      success: true,
      devLink: isDevEnv ? resetUrl : undefined,
      error: isDevEnv ? err.message : 'ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่',
    };
  }
}

export interface SendSecurityEditOptions {
  to: string;
  editUrl: string;
  userName?: string;
  storeName?: string;
}

/**
 * Sends a one-time secure security edit link to the store owner's email
 * so the owner can securely edit their bank account, promptpay, phone, or email.
 */
export async function sendStoreSecurityEditEmail({
  to,
  editUrl,
  userName = 'เจ้าของร้าน',
  storeName,
}: SendSecurityEditOptions): Promise<SendEmailResult> {
  const isDev = process.env.NODE_ENV !== 'production';
  const cleanTo = to.trim().toLowerCase();
  const fromEmail = process.env.EMAIL_FROM || 'support@orderpos.app';
  const fromName = 'Order Pos Platform';
  const subject = `🛡️ ลิงก์แก้ไขข้อมูลร้านค้าและบัญชีรับเงินของคุณ - Order Pos`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>แก้ไขข้อมูลร้านค้าและบัญชีรับเงิน</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #f8fafc; }
    .card { max-width: 560px; margin: 0 auto; background: #1e293b; border-radius: 20px; border: 1px solid #334155; padding: 36px 28px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4); }
    .logo { font-size: 24px; font-weight: 800; color: #f97316; margin-bottom: 24px; display: inline-block; }
    .title { font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .p { font-size: 15px; color: #cbd5e1; line-height: 1.6; margin-bottom: 20px; }
    .security-box { background: #0f172a; border: 1px solid #f97316/30; border-radius: 14px; padding: 16px 20px; margin-bottom: 24px; font-size: 13px; color: #fdba74; line-height: 1.6; }
    .btn-wrap { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff !important; font-weight: 800; font-size: 16px; padding: 15px 36px; border-radius: 12px; text-decoration: none; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3); }
    .notice { font-size: 13px; color: #94a3b8; background: #0f172a; border-radius: 12px; padding: 14px 18px; line-height: 1.5; border: 1px solid #1e293b; margin-top: 24px; }
    .footer { font-size: 12px; color: #64748b; text-align: center; margin-top: 24px; line-height: 1.5; }
    .link-alt { word-break: break-all; color: #10b981; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🍽️ Order Pos</div>
    <div class="title">🛡️ ลิงก์แก้ไขข้อมูลร้านค้า &amp; บัญชีรับเงิน</div>
    <p class="p">
      เรียนคุณ <strong>${escapeHtml(userName)}</strong>${storeName ? ` (${escapeHtml(storeName)})` : ''},
    </p>

    <div class="security-box">
      🔒 <strong>นโยบายความปลอดภัยสูงสุด:</strong><br>
      Admin แพลตฟอร์มไม่สามารถแก้ไขบัญชีรับเงินของร้านค้าให้ท่านได้โดยตรง เพื่อป้องกันการทุจริตและการสวมรอยบัญชี ท่านจะต้องเป็นผู้ดำเนินการตรวจสอบและระบุบัญชีรับเงินด้วยตนเองผ่านลิงก์ด้านล่างนี้
    </div>

    <p class="p">
      ท่านสามารถกดที่ปุ่มด้านล่างเพื่อเปิดหน้าแก้ไขข้อมูลความปลอดภัย (เบอร์โทรศัพท์, ข้อมูลบัญชีธนาคาร, พร้อมเพย์, และอีเมล) ด้วยตนเอง:
    </p>
    
    <div class="btn-wrap">
      <a href="${escapeHtml(editUrl)}" class="btn">เปิดหน้าแก้ไขข้อมูลร้านค้า &amp; บัญชีรับเงิน</a>
    </div>

    <div class="notice">
      ⏱️ <strong>ข้อควรระวัง:</strong> ลิงก์นี้มีความปลอดภัยสูง มีอายุใช้งาน <strong>24 ชั่วโมง</strong> และสามารถใช้งานได้เพียง <strong>1 ครั้งเท่านั้น</strong><br>
      หากท่านไม่ได้เป็นผู้ร้องขอการแก้ไขข้อมูล กรุณาอย่าส่งต่อลิงก์นี้ให้ผู้อื่น และติดต่อทีมงานทันที
    </div>

    <p class="p" style="font-size: 13px; margin-top: 24px; color: #94a3b8;">
      หากไม่สามารถคลิกปุ่มด้านบนได้ สามารถคัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:<br>
      <a href="${escapeHtml(editUrl)}" class="link-alt">${escapeHtml(editUrl)}</a>
    </p>
  </div>
  <div class="footer">
    Order Pos Multi-Tenant Platform &bull; ระบบจัดการร้านอาหารตามสั่ง &amp; สแกนสั่งอาหาร
  </div>
</body>
</html>
  `.trim();

  console.log(`=========================================
[SECURITY-EDIT-EMAIL] 📧 To: ${cleanTo} (${userName})
[SECURITY-EDIT-EMAIL] 🔗 Edit URL: ${editUrl}
[SECURITY-EDIT-EMAIL] ⏱️ Expires: 24 hours
=========================================`);

  // 1. Try sending via Resend API
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const resendSender = process.env.EMAIL_FROM || 'Order Pos <onboarding@resend.dev>';
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendSender,
          to: [cleanTo],
          subject,
          html: htmlContent,
        }),
      });

      const resendData: any = await resendRes.json().catch(() => ({}));
      if (resendRes.ok && resendData.id) {
        console.log(`[Resend Success] 🚀 Security Edit Email sent via Resend! ID: ${resendData.id} To: ${cleanTo}`);
        return { success: true, devLink: isDev ? editUrl : undefined };
      }
    } catch (resendErr: any) {
      console.error('[Resend Network Error]:', resendErr);
    }
  }

  // 2. Fallback to MailChannels
  try {
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: cleanTo, name: userName }] }],
        from: { email: fromEmail, name: fromName },
        subject,
        content: [{ type: 'text/html', value: htmlContent }],
      }),
    });

    if (response.ok || response.status === 202) {
      return { success: true, devLink: isDev ? editUrl : undefined };
    }

    return {
      success: true,
      devLink: isDev ? editUrl : undefined,
    };
  } catch (err: any) {
    const isDevEnv = process.env.NODE_ENV !== 'production';
    return {
      success: true,
      devLink: isDevEnv ? editUrl : undefined,
      error: isDevEnv ? err.message : 'ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่',
    };
  }
}

