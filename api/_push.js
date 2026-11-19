// إرسال إشعارات الموبايل (Web Push). لو المكتبة أو المفاتيح مش موجودة بيتخطى من غير ما يوقّع أي حاجة.
let webpush = null;
try { webpush = require('web-push'); } catch (e) {}

module.exports = async function sendPush(payload, onlyEmail) {
  const { SUPABASE_URL: U, SUPABASE_SERVICE_ROLE_KEY: K, VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, VAPID_SUBJECT: subj } = process.env;
  if (!webpush || !U || !K || !pub || !priv) return { sent: 0, skipped: true };
  const H = { apikey: K, ...(K.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + K }), 'Content-Type': 'application/json' };
  webpush.setVapidDetails(subj || 'mailto:admin@example.com', pub, priv);
  const q = onlyEmail ? `&email=eq.${encodeURIComponent(onlyEmail)}` : '';
  const rows = await (await fetch(`${U}/rest/v1/p2_push_subs?select=endpoint,sub${q}`, { headers: H })).json();
  let sent = 0;
  await Promise.all((Array.isArray(rows) ? rows : []).map(async r => {
    try { await webpush.sendNotification(r.sub, JSON.stringify(payload), { TTL: 3600 }); sent++; }
    catch (e) {
      if (e && (e.statusCode === 404 || e.statusCode === 410))
        await fetch(`${U}/rest/v1/p2_push_subs?endpoint=eq.${encodeURIComponent(r.endpoint)}`, { method: 'DELETE', headers: H });
    }
  }));
  return { sent };
};
