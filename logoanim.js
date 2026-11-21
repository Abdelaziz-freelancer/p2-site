/* حركات اللوجو — ملف مشترك بين الموقع والداشبورد (للمعاينة). لو عدلته انسخه للمشروعين. */
(function(){
var ENT=[["none","بدون"],["pop","Pop (تكبير خفيف)"],["fade","ظهور تدريجي"],["up","طلوع من تحت"],["zoom","تكبير من صغير"],["spin","لفة وظهور"],["blur","من تشويش لوضوح"],["drop","نزول وارتداد"]],
MOT=[["none","ثابت"],["float","طفو"],["swing","تأرجح"],["bounce","نط"]],
SCL=[["none","ثابت"],["pulse","نبض"],["spin","دوران بطيء"],["flip","قلب 3D"]],
EXT=[["glow","توهّج"],["shine","لمعان بيعدّي"]];
var CSS="@keyframes la-e-pop{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:none}}@keyframes la-e-fade{from{opacity:0}to{opacity:1}}@keyframes la-e-up{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}@keyframes la-e-zoom{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:none}}@keyframes la-e-spin{from{opacity:0;transform:rotate(-180deg) scale(.4)}to{opacity:1;transform:none}}@keyframes la-e-blur{from{opacity:0;filter:blur(16px)}to{opacity:1;filter:blur(0)}}@keyframes la-e-drop{0%{opacity:0;transform:translateY(-120px)}60%{opacity:1;transform:translateY(12px)}80%{transform:translateY(-6px)}100%{transform:none}}"+
"@keyframes la-m-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes la-m-swing{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}@keyframes la-m-bounce{0%,100%{transform:translateY(0)}40%{transform:translateY(-12px)}60%{transform:translateY(0)}70%{transform:translateY(-4px)}}"+
"@keyframes la-s-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}@keyframes la-s-spin{to{transform:rotate(360deg)}}@keyframes la-s-flip{0%,55%,100%{transform:rotateY(0)}80%{transform:rotateY(180deg)}}"+
"@keyframes la-x-glow{0%,100%{filter:drop-shadow(0 0 0 transparent)}50%{filter:drop-shadow(0 0 12px currentColor)}}@keyframes la-x-shine{from{background-position:150% 0}to{background-position:-150% 0}}"+
".la{display:inline-block;position:relative;perspective:600px;line-height:0}.la-m{display:block}.la-m img,.la img{display:block;width:100%;height:auto}.la-shine::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.9) 50%,transparent 65%) 150% 0/250% 100% no-repeat;-webkit-mask:var(--m) center/contain no-repeat;mask:var(--m) center/contain no-repeat;animation:la-x-shine calc(3s / var(--sp,1)) linear infinite}@media(prefers-reduced-motion:reduce){.la,.la-m,.la img{animation:none!important}.la-shine::after{display:none}}";
var DEF={ent:"pop",mot:"none",scl:"none",glow:0,shine:0,speed:1,nav:1};
function ids(L){return L.map(function(x){return x[0]})}
function norm(c){c=c&&typeof c=="object"?c:{};var o={};
 o.ent=ids(ENT).indexOf(c.ent)>-1?c.ent:DEF.ent;o.mot=ids(MOT).indexOf(c.mot)>-1?c.mot:"none";o.scl=ids(SCL).indexOf(c.scl)>-1?c.scl:"none";
 o.glow=+c.glow?1:0;o.shine=+c.shine?1:0;var sp=parseFloat(c.speed);o.speed=isFinite(sp)?Math.min(3,Math.max(.3,sp)):1;o.nav=c.nav===0||c.nav==="0"?0:1;return o}
function css(){if(document.getElementById("la-css"))return;var s=document.createElement("style");s.id="la-css";s.textContent=CSS;document.head.appendChild(s)}
// kind: "splash" (دخول + حركات مستمرة) | "nav" (حركات مستمرة بس) | "preview" (زي splash)
function apply(img,cfg,kind){css();var c=norm(cfg),sp=c.speed,o=img.parentNode&&img.parentNode.classList&&img.parentNode.classList.contains("la-m")?img.parentNode.parentNode:null;
 if(!o){o=document.createElement("span");o.className="la";var m=document.createElement("span");m.className="la-m";img.parentNode.insertBefore(o,img);o.appendChild(m);m.appendChild(img)}
 var m=o.firstChild;o.style.setProperty("--sp",sp);o.style.setProperty("--m","url('"+String(img.currentSrc||img.src).replace(/'/g,"%27")+"')");
 var loops=kind!="nav"||c.nav;
 var ea=kind!="nav"&&c.ent!="none"?"la-e-"+c.ent+" "+(1/sp).toFixed(2)+"s ease both":"none";o.dataset.an=ea;o.style.animation=ea;
 var ma=[];if(loops&&c.mot!="none")ma.push("la-m-"+c.mot+" "+(3/sp).toFixed(2)+"s ease-in-out infinite");if(loops&&c.glow)ma.push("la-x-glow "+(2.4/sp).toFixed(2)+"s ease-in-out infinite");m.style.animation=ma.join(",")||"none";
 var sa="none";if(loops&&c.scl!="none")sa="la-s-"+c.scl+" "+({pulse:2.4,spin:8,flip:4}[c.scl]/sp).toFixed(2)+"s "+(c.scl=="spin"?"linear":"ease-in-out")+" infinite";img.style.animation=sa;
 o.classList.toggle("la-shine",!!(loops&&c.shine));return o}
window.P2_LA={ENT:ENT,MOT:MOT,SCL:SCL,EXT:EXT,DEF:DEF,norm:norm,apply:apply};
})();
