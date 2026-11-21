// sitemap.xml و robots.txt
module.exports = async (req, res) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: KEY } = process.env;
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const origin = 'https://' + host;
  if (req.query && req.query.robots) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  }
  let n = 0;
  try {
    const H = { apikey: KEY, ...(KEY.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + KEY }) };
    const r = await (await fetch(`${SUPABASE_URL}/rest/v1/p2_settings?key=eq.content&select=value`, { headers: H })).json();
    const A = (((r[0] || {}).value || {}).articles || []).filter(x => x && (x.te || x.ta));
    n = A.length;
  } catch (e) {}
  const urls = [origin + '/'];
  for (let i = 1; i <= n; i++) urls.push(`${origin}/blog/${i}`);
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=600');
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${u}</loc></url>`).join('\n')}\n</urlset>`);
};
