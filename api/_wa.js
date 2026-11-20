// أدوات رسالة تأكيد الواتساب للعميل (مش route — الملف بيبدأ بـ _)
const DEFTPL = 'أهلاً {name} 👋\nتم تأكيد الميتينج معاك يوم {date} الساعة {time} (بتوقيت القاهرة).\nلو في أي تغيير كلمني هنا. 🙏';
const phone = p => { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); else if (d.startsWith('0')) d = '20' + d.slice(1); return d; };
const when = iso => ({
  date: new Date(iso).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'long' }),
  time: new Date(iso).toLocaleTimeString('ar-EG', { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit' }),
});
const fill = (tpl, b, iso) => { const w = iso ? when(iso) : { date: '', time: '' }; const m = { name: b.name || '', date: w.date, time: w.time, activity: b.activity || '' }; return String(tpl || DEFTPL).replace(/\{(name|date|time|activity)\}/g, (_, k) => m[k]); };
const link = (tpl, b, iso) => { const p = phone(b.phone); return p.length >= 8 ? `https://wa.me/${p}?text=${encodeURIComponent(fill(tpl, b, iso))}` : ''; };
module.exports = { DEFTPL, phone, when, fill, link };
