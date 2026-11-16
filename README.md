# المشروع رقم 2: موقع Abdelaziz Tamer (موقع العميل)

ملفات الموقع: `index.html` + `config.js` + `supabase-schema.sql`.
لو `config.js` فاضي الموقع بيشتغل وضع تجريبي (الحجز والبريف بيتحفظوا في المتصفح بس).

## تشغيله بشكل حقيقي
1. في Supabase اعمل Project جديد، وبعدين SQL Editor > New query > الصق محتوى `supabase-schema.sql` كله > Run.
2. Project Settings > API: انسخ Project URL وanon public key، وحطهم في `config.js` بين علامات التنصيص.
3. ارفع محتويات الفولدر (مش الفولدر نفسه) على ريبو GitHub جديد.
4. في Vercel: Add New > Project > اختار الريبو > Deploy.

الداشبورد (إضافة المواعيد + الحجوزات + البريفات + إعدادات السرعة) هتيجي في الخطوة الجاية، بتتشغل بنفس قاعدة البيانات.
