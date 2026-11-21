// تقرير تليجرام: ?kind=daily (متابعات وفواتير مستحقة) أو ?kind=weekly (ملخص الأسبوع + المتابعات).
// بيتنادى من cron-job.org:  https://<موقعك>/api/report?kind=weekly&key=CRON_SECRET
const sendPush = require('./_push');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const same = (a, b) => { a = String(a || ''); b = String(b || ''); if (a.length !== b.length || !a) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const day = d => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });

module.exports = async (req, res) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: KEY, TELEGRAM_BOT_TOKEN: TG, TELEGRAM_CHAT_ID: CHAT, DASHBOARD_URL, CRON_SECRET } = process.env;
  const given = (req.query && req.query.key) || req.headers['x-cron-secret'] || '';
  if (!CRON_SECRET || !same(given, CRON_SECRET)) return res.status(401).json({ ok: false });
  if (!SUPABASE_URL || !KEY) return res.status(500).json({ ok: false });
  const kind = (req.query && req.query.kind) === 'weekly' ? 'weekly' : 'daily';
  const H = { apikey: KEY, ...(KEY.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + KEY }), 'Content-Type': 'application/json' };
  const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H }); const j = await r.json(); return Array.isArray(j) ? j : (r.ok ? j : []); };
  try {
    const today = day(Date.now()), soon = day(Date.now() + 3 * 864e5);
    const fb = await get(`p2_bookings?select=name,phone,follow_up&follow_up=lte.${today}&stage=not.in.(won,lost)&archived=eq.false&limit=30`);
    const fr = await get(`p2_briefs?select=client_name,brand_name,phone,follow_up&follow_up=lte.${today}&stage=not.in.(won,lost)&archived=eq.false&limit=30`);
    const inv = (await get(`p2_invoices?select=number,total,paid,due,p2_clients(name)&due=lte.${soon}&order=due&limit=50`)).filter(i => +i.paid < +i.total);
    const lines = [];
    if (kind === 'weekly') {
      const st = await (await fetch(`${SUPABASE_URL}/rest/v1/rpc/p2_stats`, { method: 'POST', headers: H, body: JSON.stringify({ p_days: 7 }) })).json();
      const f = st.funnel || {}, top = (st.sources || [])[0];
      const leads = await get(`p2_leads?select=id&created_at=gte.${new Date(Date.now() - 7 * 864e5).toISOString()}`);
      lines.push('📊 <b>ملخص الأسبوع</b>', `👥 زوار: ${st.visitors || 0} · مشاهدات: ${st.pageviews || 0}`, `📅 حجوزات: ${f.book_done || 0} · 📝 بريفات: ${f.brief_done || 0} · 💬 واتساب: ${f.wa_click || 0}`, `🎁 ليدز الملف المجاني: ${leads.length}`);
      if (top) lines.push(`🔝 أكتر مصدر: ${esc(top.src)} (${top.visitors} زائر)`);
      lines.push('');
    } else lines.push('🔔 <b>متابعات النهارده</b>', '');
    if (fb.length || fr.length) { lines.push('📞 <b>محتاج تتابعهم:</b>'); fb.forEach(x => lines.push(`• ${esc(x.name)} — ${esc(x.phone)}`)); fr.forEach(x => lines.push(`• ${esc(x.brand_name || x.client_name)} — ${esc(x.phone)}`)); lines.push(''); }
    if (inv.length) { lines.push('💰 <b>فواتير مستحقة / قربت:</b>'); inv.forEach(i => lines.push(`• #${esc(i.number || '')} ${esc((i.p2_clients || {}).name || '')} — متبقي ${Math.max(0, +i.total - +i.paid)} (استحقاق ${esc(i.due)})`)); }
    if (kind === 'daily' && !fb.length && !fr.length && !inv.length) return res.status(200).json({ ok: true, empty: true });
    const text = lines.join('\n').trim() + (DASHBOARD_URL ? `\n\n🔗 ${esc(DASHBOARD_URL.replace(/\/$/, ''))}` : '');
    let ok = false;
    if (TG && CHAT) { try { ok = (await fetch(`https://api.telegram.org/bot${TG}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: CHAT, text, parse_mode: 'HTML', disable_web_page_preview: true }) })).ok; } catch (e) {} }
    let pushed = 0; try { pushed = (await sendPush({ title: kind === 'weekly' ? '📊 ملخص الأسبوع' : '🔔 متابعات النهارده', body: `${fb.length + fr.length} متابعة · ${inv.length} فاتورة`, url: DASHBOARD_URL || '/' })).sent || 0; } catch (e) {}
    return res.status(200).json({ ok: true, telegram: ok, pushed, followups: fb.length + fr.length, invoices: inv.length });
  } catch (e) { return res.status(500).json({ ok: false }); }
};
