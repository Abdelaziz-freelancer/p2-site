// تذكير قبل الميتينج بساعة. بيتنادى كل 5 دقايق من cron-job.org:
//   https://<موقعك>/api/remind?key=CRON_SECRET
const sendPush = require('./_push');
const wa = require('./_wa');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const same = (a, b) => { a = String(a || ''); b = String(b || ''); if (a.length !== b.length || !a) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };

module.exports = async (req, res) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: KEY, TELEGRAM_BOT_TOKEN: TG, TELEGRAM_CHAT_ID: CHAT, DASHBOARD_URL, CRON_SECRET } = process.env;
  const given = (req.query && req.query.key) || req.headers['x-cron-secret'] || (req.headers.authorization || '').replace(/^Bearer /i, '');
  if (!CRON_SECRET || !same(given, CRON_SECRET)) return res.status(401).json({ ok: false });
  if (!SUPABASE_URL || !KEY) return res.status(500).json({ ok: false, error: 'missing env' });
  const H = { apikey: KEY, ...(KEY.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + KEY }), 'Content-Type': 'application/json' };
  const now = Date.now(), from = new Date(now).toISOString(), to = new Date(now + 60 * 60 * 1000).toISOString();
  let sent = 0, skipped = 0, failed = 0;
  try {
    const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/p2_bookings?select=id,name,phone,activity,created_at,p2_slots!inner(starts_at)&reminded=eq.false&p2_slots.starts_at=gt.${from}&p2_slots.starts_at=lte.${to}&limit=50`, { headers: H })).json();
    if (!Array.isArray(rows)) return res.status(500).json({ ok: false });
    let tpl = ''; try { tpl = (((await (await fetch(`${SUPABASE_URL}/rest/v1/p2_settings?key=eq.site&select=value`, { headers: H })).json())[0] || {}).value || {}).wa_template; } catch (e) {}
    for (const b of rows) {
      const starts = b.p2_slots.starts_at;
      const claim = await fetch(`${SUPABASE_URL}/rest/v1/p2_bookings?id=eq.${b.id}&reminded=eq.false`, { method: 'PATCH', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify({ reminded: true }) });
      const c = await claim.json();
      if (!claim.ok || !c.length) continue;
      // لو الحجز اتعمل في آخر ساعة قبل الميتينج مفيش داعي للتذكير (الإشعار الأصلي لسه طازة)
      if (new Date(b.created_at).getTime() > new Date(starts).getTime() - 60 * 60 * 1000) { skipped++; continue; }
      const w = wa.when(starts), mins = Math.max(1, Math.round((new Date(starts) - now) / 60000)), l = wa.link(tpl, b, starts);
      const text = `⏰ <b>ميتينج بعد ${mins} دقيقة</b>\n\n🕒 ${esc(w.time)}\n👤 ${esc(b.name)}\n📞 ${esc(b.phone)}\n🏷 ${esc(b.activity)}` + (l ? `\n\n💬 <a href="${esc(l)}">رسالة للعميل على واتساب</a>` : '');
      let tgOk = false, tried = false, pushed = 0;
      if (TG && CHAT) { tried = true; try { tgOk = (await fetch(`https://api.telegram.org/bot${TG}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: CHAT, text, parse_mode: 'HTML', disable_web_page_preview: true }) })).ok; } catch (e) {} }
      try { pushed = (await sendPush({ title: `⏰ ميتينج بعد ${mins} دقيقة`, body: `${b.name} — ${w.time}`, url: DASHBOARD_URL || '/' })).sent || 0; } catch (e) {}
      if (tried && !tgOk && !pushed) { failed++; try { await fetch(`${SUPABASE_URL}/rest/v1/p2_bookings?id=eq.${b.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ reminded: false }) }); } catch (e) {} } else sent++;
    }
    return res.status(200).json({ ok: true, sent, skipped, failed });
  } catch (e) { return res.status(500).json({ ok: false }); }
};
