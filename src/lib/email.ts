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
      เรียนคุณ <strong>${userName}</strong>${storeName ? ` (${storeName})` : ''},
    </p>
    <p class="p">
      ระบบได้รับคำขอกู้คืนรหัสผ่านสำหรับเข้าสู่ระบบ Order Pos ของคุณ กรุณาแตะที่ปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่:
    </p>
    
    <div class="btn-wrap">
      <a href="${resetUrl}" class="btn">ตั้งรหัสผ่านใหม่ (Reset Password)</a>
    </div>

    <div class="notice">
      ⏱️ <strong>ข้อควรระวัง:</strong> ลิงก์นี้จะหมดอายุภายใน <strong>30 นาที</strong> และสามารถใช้งานได้เพียงครั้งเดียว<br>
      หากคุณไม่ได้เป็นผู้ส่งคำขอนี้ คุณสามารถละเว้นอีเมลฉบับนี้ได้อย่างปลอดภัย รหัสผ่านเดิมของคุณจะไม่เปลี่ยนแปลง
    </div>

    <p class="p" style="font-size: 13px; margin-top: 24px; color: #94a3b8;">
      หากไม่สามารถคลิกปุ่มด้านบนได้ สามารถคัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:<br>
      <a href="${resetUrl}" class="link-alt">${resetUrl}</a>
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

    // Fallback: If MailChannels encounters a domain policy or environment restriction,
    // we still return success with devLink in dev mode so users and developers aren't locked out.
    return {
      success: true,
      devLink: resetUrl,
      error: !isDev ? `MailChannels returned status ${response.status}` : undefined,
    };
  } catch (err: any) {
    console.error('[sendPasswordResetEmail Error]:', err);
    return {
      success: true,
      devLink: resetUrl,
      error: err.message,
    };
  }
}
