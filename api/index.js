// بيرجّع صفحة الموقع بعد حقن بيانات SEO (عنوان/وصف/صورة المشاركة) عشان واتساب وفيسبوك وجوجل يشوفوها.
// لو أي حاجة فشلت بيرجّع الصفحة زي ما هي.
const fs = require('fs');
const path = require('path');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clip = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const https = u => (/^https:\/\//i.test(u || '') ? String(u).slice(0, 500) : '');

module.exports = async (req, res) => {
  let html;
  try { html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8'); } catch (e) { return res.status(500).send('index missing'); }
  html = html.replace(/<head>/i, '<head>\n<base href="/">');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: KEY } = process.env;
    if (!SUPABASE_URL || !KEY) return res.status(200).send(html);
    const H = { apikey: KEY, ...(KEY.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + KEY }) };
    const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/p2_settings?key=in.(site,content)&select=key,value`, { headers: H })).json();
    const site = ((rows.find(r => r.key === 'site') || {}).value) || {};
    const content = ((rows.find(r => r.key === 'content') || {}).value) || {};
    const seo = site.seo || {};
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const origin = host ? 'https://' + host : '';
    let title = clip(seo.title || site.site_title, 90), desc = clip(seo.desc, 200), img = https(seo.img) || https((content.images || {}).logo);
    let url = origin + '/';
    const m = /^\/blog\/(\d+)\/?$/.exec((req.url || '').split('?')[0]) || /^\/api\/index\?post=(\d+)/.exec(req.url || '');
    const post = m || (req.query && /^\d+$/.test(req.query.post || '') ? [0, req.query.post] : null);
    if (post) {
      const A = (Array.isArray(content.articles) ? content.articles : []).filter(x => x && (x.te || x.ta));
      const a = A[+post[1] - 1];
      if (a) { title = clip((a.te || a.ta) + (site.site_title ? ' | ' + site.site_title : ''), 100); desc = clip(a.de || a.da || desc, 200); img = https(a.img) || img; url = origin + '/blog/' + post[1]; }
    }
    if (!img && origin) img = origin + '/assets/logo.png';
    const tags = [
      desc && `<meta name="description" content="${esc(desc)}">`,
      `<meta property="og:type" content="website">`,
      title && `<meta property="og:title" content="${esc(title)}">`,
      desc && `<meta property="og:description" content="${esc(desc)}">`,
      img && `<meta property="og:image" content="${esc(img)}">`,
      url && `<meta property="og:url" content="${esc(url)}">`,
      url && `<link rel="canonical" href="${esc(url)}">`,
      `<meta name="twitter:card" content="${img ? 'summary_large_image' : 'summary'}">`,
      title && `<meta name="twitter:title" content="${esc(title)}">`,
      desc && `<meta name="twitter:description" content="${esc(desc)}">`,
      img && `<meta name="twitter:image" content="${esc(img)}">`,
    ].filter(Boolean).join('\n');
    if (title) html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
    html = html.replace(/<meta name="robots"[^>]*>\s*/i, '');
    html = html.replace('</head>', tags + '\n</head>');
    return res.status(200).send(html);
  } catch (e) {
    return res.status(200).send(html);
  }
};
