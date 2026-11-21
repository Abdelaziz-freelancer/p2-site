// يبعت إشعار تليجرام لما حد يحجز ميتينج أو يبعت بريف.
// بيتأكد إن الحجز/البريف موجود فعلاً في قاعدة البيانات وإنه ماتبعتش قبل كده.
const sendPush = require('./_push');
const wa = require('./_wa');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: KEY, TELEGRAM_BOT_TOKEN: TG, TELEGRAM_CHAT_ID: CHAT, DASHBOARD_URL } = process.env;
  const { type, id } = req.body || {};
  if (!['booking', 'brief', 'lead'].includes(type) || !UUID.test(id || '')) return res.status(400).json({ ok: false });
  if (!SUPABASE_URL || !KEY) return res.status(500).json({ ok: false, error: 'missing env' });

  const H = { apikey: KEY, ...(KEY.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + KEY }), 'Content-Type': 'application/json' };
  const table = type === 'booking' ? 'p2_bookings' : type === 'lead' ? 'p2_leads' : 'p2_briefs';
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  try {
    // "نحجز" الإشعار الأول (atomic) عشان ما يتبعتش مرتين
    const claim = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}&notified=eq.false&created_at=gte.${since}`, {
      method: 'PATCH', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify({ notified: true })
    });
    const rows = await claim.json();
    if (!claim.ok || !rows.length) return res.status(200).json({ ok: true, skipped: true });
    const row = rows[0];

    let text;
    if (type === 'booking') {
      const sl = await (await fetch(`${SUPABASE_URL}/rest/v1/p2_slots?id=eq.${row.slot_id}&select=starts_at`, { headers: H })).json();
      const when = sl[0] ? new Date(sl[0].starts_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }) : '';
      let tpl = ''; try { tpl = (((await (await fetch(`${SUPABASE_URL}/rest/v1/p2_settings?key=eq.site&select=value`, { headers: H })).json())[0] || {}).value || {}).wa_template; } catch (e) {}
      const wl = wa.link(tpl, row, sl[0] && sl[0].starts_at);
      text = `📅 <b>حجز ميتينج جديد</b>\n\n🕒 ${esc(when)}\n👤 ${esc(row.name)}\n📞 ${esc(row.phone)}\n🏷 ${esc(row.activity)}` + (wl ? `\n\n✅ <a href="${esc(wl)}">ابعت تأكيد للعميل على واتساب</a>` : '');
    } else if (type === 'lead') {
      const l = wa.link('أهلاً {name} 👋 شكراً لتحميلك الملف. لو عايز نتكلم عن إعلاناتك أنا موجود.', row, null);
      text = `🎁 <b>ليد جديد من الملف المجاني</b>\n\n👤 ${esc(row.name)}\n📞 ${esc(row.phone)}` + (l ? `\n\n💬 <a href="${esc(l)}">كلمه على واتساب</a>` : '');
    } else {
      text = `📝 <b>بريف جديد وصل</b>\n\n👤 ${esc(row.client_name)}\n🏷 ${esc(row.brand_name)}\n📞 ${esc(row.phone)}` + (DASHBOARD_URL ? `\n\n🔗 ${esc(DASHBOARD_URL.replace(/\/$/, ''))}` : '');
    }
    const title = type === 'booking' ? '📅 حجز ميتينج جديد' : type === 'lead' ? '🎁 ليد جديد' : '📝 بريف جديد';
    const body = type === 'booking' ? `${row.name} — ${row.activity}` : type === 'lead' ? `${row.name} — ${row.phone}` : `${row.brand_name || row.client_name || ''}`;
    let tgOk = false, tgTried = false;
    if (TG && CHAT) {
      tgTried = true;
      try {
        const r = await fetch(`https://api.telegram.org/bot${TG}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: CHAT, text, parse_mode: 'HTML', disable_web_page_preview: true })
        });
        tgOk = r.ok;
      } catch (e) {}
    }
    let pushed = 0;
    try { pushed = (await sendPush({ title, body, url: DASHBOARD_URL || '/' })).sent || 0; } catch (e) {}
    if (tgTried && !tgOk && !pushed) throw new Error('notify failed');
    return res.status(200).json({ ok: true });
  } catch (e) {
    // لو التليجرام فشل نرجّع الإشعار "غير مرسل" عشان يتحاول تاني
    try { await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ notified: false }) }); } catch (_) {}
    return res.status(500).json({ ok: false });
  }
};
