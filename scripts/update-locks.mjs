import fs from 'fs';

const files = [
  'public/prompts/clue-less-prompt/whistle-podu/index.html',
  'public/prompts/clue-less-prompt/only-ww/index.html',
  'public/prompts/clue-less-prompt/the-image-that-isnt-an-image/index.html',
  'public/prompts/clue-less-prompt/the-bearer/index.html',
  'public/prompts/clue-less-prompt/a-comedy-of-accuracy/index.html',
  'public/prompts/clue-less-prompt/the-third-tung/index.html',
  'public/prompts/clue-less-prompt/redline-echo/index.html',
  'public/prompts/clue-less-prompt/the-hollow-chime/index.html',
];

const newLockBlock = `<!-- LOCK:START -->
<div id="lock-overlay" style="position:fixed;inset:0;background:#08080b;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;">
  <div style="font-family:'Consolas',monospace;font-size:10px;letter-spacing:0.18em;color:rgba(255,255,255,0.25);text-transform:uppercase;">Cyfernode 5.0 · Clue-Less</div>
  <div style="font-family:'Satoshi',system-ui,sans-serif;font-size:clamp(1.8rem,5vw,2.6rem);font-weight:900;color:#fff;letter-spacing:-0.03em;line-height:1.1;text-align:center;">WAVE 1 CONCLUDED</div>
  <div style="font-family:'Consolas',monospace;font-size:12px;color:rgba(255,255,255,0.45);text-align:center;margin-top:4px;">Wave 2 Opens at 6:00 PM &nbsp;·&nbsp; 27 Sep 2026</div>
  <div id="lock-countdown" style="font-family:'Consolas',monospace;font-size:clamp(1.4rem,4vw,2rem);font-weight:700;color:#d24500;letter-spacing:0.08em;margin-top:12px;">--:--:--</div>
  <div style="font-family:'Consolas',monospace;font-size:10px;color:rgba(255,255,255,0.2);margin-top:4px;letter-spacing:0.08em;">HH &nbsp; MM &nbsp; SS</div>
  <a href="/prompts/clue-less-prompt" style="font-family:'Satoshi',sans-serif;font-size:13px;font-weight:700;color:#fff;background:rgba(255,255,255,0.1);padding:8px 18px;border-radius:6px;text-decoration:none;margin-top:16px;display:inline-flex;align-items:center;gap:6px;">
    <i class="fa-solid fa-arrow-left"></i>
    <span>Return to Leaderboard</span>
  </a>
</div>
<script>
(function(){
  var UNLOCK = new Date('2026-09-27T18:00:00+05:30').getTime();
  var overlay = document.getElementById('lock-overlay');
  var cd = document.getElementById('lock-countdown');
  if (!overlay) return;
  function tick() {
    var now = Date.now();
    var diff = UNLOCK - now;
    if (diff <= 0) { overlay.remove(); return; }
    var h = Math.floor(diff / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var s = Math.floor((diff % 60000) / 1000);
    cd.textContent = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }
  tick();
  var iv = setInterval(function(){ tick(); if (Date.now() >= UNLOCK) clearInterval(iv); }, 1000);
})();
</script>
<!-- LOCK:END -->`;

for (const f of files) {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/<!-- LOCK:START -->[\s\S]*?<!-- LOCK:END -->/, newLockBlock);
    fs.writeFileSync(f, content, 'utf8');
    console.log('Successfully updated lock for:', f);
  } else {
    console.warn('File not found:', f);
  }
}
