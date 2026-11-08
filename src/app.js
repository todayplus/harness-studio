"use strict";
/* ============================================================
   Harness Studio — app logic
   ============================================================ */
const KEY = "hs_v2";
const DEFAULTS = {
  idx:0, done:[], checks:{}, answers:{size:"solo",auto:"chat",risk:"low",asset:"none"},
  diag:{}, quiz:{}, cards:{}, scn:{}, view:"learn", practice:"cards",
  theme:"light", lastVisit:"", streak:0, gen:["claude","settings","limits"]
};
let S = loadState();

function loadState(){
  try{
    const raw = localStorage.getItem(KEY);
    const d = raw ? JSON.parse(raw) : {};
    return Object.assign({}, DEFAULTS, d, {answers:Object.assign({},DEFAULTS.answers,d.answers||{})});
  }catch(e){ return JSON.parse(JSON.stringify(DEFAULTS)); }
}
function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){}
}
function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'),1800);
}
const $ = (sel,root)=> (root||document).querySelector(sel);
const $$ = (sel,root)=> Array.from((root||document).querySelectorAll(sel));
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const todayKey = ()=>{ const d=new Date(); return d.toISOString().slice(0,10); };

/* ---------------- streak ---------------- */
(function streak(){
  const t = todayKey();
  if(S.lastVisit !== t){
    const y = new Date(Date.now()-864e5).toISOString().slice(0,10);
    S.streak = (S.lastVisit === y) ? (S.streak||0)+1 : 1;
    S.lastVisit = t; save();
  }
  if(!S.streak){ S.streak = 1; save(); }
})();

/* ---------------- theme ---------------- */
function applyTheme(){
  document.documentElement.dataset.theme = S.theme;
}

/* ---------------- nav ---------------- */
function renderNav(){
  const q = ($('#search')?.value || "").trim().toLowerCase();
  let html = "";
  PARTS.forEach(p=>{
    const items = CHAPTERS.filter(c=>c.part===p.id).filter(c=>{
      if(!q) return true;
      return (c.title+" "+c.lede+" "+c.blocks.map(b=>b.tag+" "+b.title+" "+b.body).join(" ")).toLowerCase().includes(q);
    });
    if(!items.length) return;
    html += `<div class="part-group"><div class="part-label"><span>${p.no}</span><span>${p.name}</span></div>`;
    items.forEach(c=>{
      const i = CHAPTERS.indexOf(c);
      const done = S.done.includes(c.id);
      html += `<button class="mod-link ${done?'done':''}" data-i="${i}" aria-current="${S.view==='learn' && i===S.idx}">
        <span class="mod-num">${String(i+1).padStart(2,'0')}</span>
        <span style="flex:1">${esc(c.short)}</span><span class="tick"></span></button>`;
    });
    html += `</div>`;
  });
  html += `<div class="part-group"><div class="part-label"><span>APPENDIX</span><span>참고자료</span></div>
    <button class="mod-link" data-view="reference" aria-current="${S.view==='reference'}">
      <span class="mod-num">A</span><span style="flex:1">실패 사례 · 치트시트</span><span class="tick"></span></button></div>`;
  $('#navList').innerHTML = html || `<div class="empty" style="padding:30px 8px">일치하는 챕터가 없습니다</div>`;
  $$('#navList .mod-link').forEach(b=>{
    b.addEventListener('click',()=>{
      if(b.dataset.view){ setView(b.dataset.view); return; }
      S.idx = +b.dataset.i;
      if(S.view!=='learn'){ S.view='learn'; paintView(); }
      save(); renderArticle(); renderNav(); window.scrollTo({top:0,behavior:'smooth'});
    });
  });
  const doneCount = CHAPTERS.filter(c=>S.done.includes(c.id)).length;
  $('#railCount').textContent = `${doneCount} / ${CHAPTERS.length}`;
  const pct = Math.round(doneCount/CHAPTERS.length*100);
  $('#ringPct').textContent = pct+"%";
  $('#ringSub').textContent = `${doneCount} / ${CHAPTERS.length} 챕터`;
  const circ = 2*Math.PI*28;
  $('#ringFg').style.strokeDashoffset = String(circ - (pct/100)*circ);
  $('#streakBox').innerHTML = `<b>${S.streak}</b>일 연속`;
}

/* ---------------- article ---------------- */
function renderArticle(){
  const c = CHAPTERS[S.idx];
  const p = PARTS.find(x=>x.id===c.part);
  const num = String(S.idx+1).padStart(2,'0');
  const chk = S.checks[c.id] || {};
  const quizState = S.quiz[c.id] || {};
  const answered = Object.keys(quizState).length;
  const correct = Object.entries(quizState).filter(([qi,a])=>c.quiz[+qi].answer===a).length;
  const isDone = S.done.includes(c.id);

  const blocks = c.blocks.map(b=>`
    <div class="block">
      <div class="block-tag"><span>${b.tag}</span><i>${b.sub}</i></div>
      <div><h3>${esc(b.title)}</h3><p>${esc(b.body)}</p></div>
    </div>`).join("");

  const checks = c.checks.map((t,i)=>`
    <li><label><input type="checkbox" data-c="${i}" ${chk[i]?"checked":""}><span>${esc(t)}</span></label></li>`).join("");

  const quiz = c.quiz.map((q,qi)=>{
    const chosen = quizState[qi];
    return `<div class="q-item">
      <p class="q-stem"><b>Q${qi+1}</b>${esc(q.q)}</p>
      <div class="q-choices">${q.choices.map((ch,ci)=>{
        let cls="";
        if(chosen!==undefined){
          if(ci===q.answer) cls="correct";
          else if(ci===chosen) cls="wrong";
        }
        return `<button class="q-choice ${cls}" data-q="${qi}" data-c="${ci}" ${chosen!==undefined?"disabled":""}>
          <span class="mk">${String.fromCharCode(65+ci)}</span><span>${esc(ch)}</span></button>`;
      }).join("")}</div>
      ${chosen!==undefined?`<p class="q-explain"><b>해설</b>${esc(q.explain)}</p>`:""}
    </div>`;
  }).join("");

  const prev = S.idx>0 ? CHAPTERS[S.idx-1] : null;
  const next = S.idx<CHAPTERS.length-1 ? CHAPTERS[S.idx+1] : null;

  $('#article').innerHTML = `
    <div class="article-head">
      <div class="eyebrow"><span class="sep"></span>${p.no} · Chapter ${num}</div>
      <h1>${esc(c.title)}</h1>
      <p class="lede">${esc(c.lede)}</p>
    </div>
    <div class="listen-card">
      <button class="lc-play" id="listenBtn" aria-label="오디오 요약 재생"><svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z"/></svg></button>
      <div><div class="lc-k">Audio summary</div><div class="lc-t">${esc(c.short)} — ${AUDIO_VOICE} 내레이션 · 끝나면 다음 챕터로 이어집니다</div></div>
      <div class="lc-d"><b>${fmtT(aSec(c.id)||0)}</b>15편 중 ${String(S.idx+1).padStart(2,'0')}</div>
    </div>
    ${blocks}
    <div class="analogy"><span class="k">일상 비유</span><p>${esc(c.analogy)}</p></div>
    <div class="subhead">실무 체크</div>
    <ul class="checklist">${checks}</ul>
    <div class="done-row">
      <button class="btn ${isDone?"ghost":""}" id="doneBtn">${isDone?"✓ 완료됨 — 되돌리기":"이 챕터 완료 표시"}</button>
      <button class="btn ghost" id="presentThis">이 챕터 발표하기</button>
      <button class="btn ghost" id="quizReset">퀴즈 다시 풀기</button>
      <span class="hint">← / → 이동 · ⌘K 검색</span>
    </div>
    <div class="quiz">
      <div class="quiz-head"><span class="t">Check yourself</span><span class="n">${answered}/${c.quiz.length} 응답 · 정답 ${correct}</span></div>
      <div class="quiz-body">${quiz}</div>
    </div>
    <div class="pager">
      <button ${prev?"":"disabled"} id="prevBtn"><span class="dir">← 이전</span><b>${prev?esc(prev.short):"—"}</b></button>
      <button class="nx" ${next?"":"disabled"} id="nextBtn"><span class="dir">다음 →</span><b>${next?esc(next.short):"—"}</b></button>
    </div>`;

  $('#artifacts').innerHTML = c.artifacts.map(a=>`<a class="artifact" href="#" onclick="return false">${esc(a)}</a>`).join("");
  const cardCount = c.cards.length;
  $('#railNote').innerHTML = `<strong>${esc(c.short)}</strong><br>개념 ${c.blocks.length} · 카드 ${cardCount} · 체크 ${Object.values(chk).filter(Boolean).length}/${c.checks.length}`;

  $$('#article input[type=checkbox]').forEach(cb=>{
    cb.addEventListener('change',()=>{
      const arr = S.checks[c.id] || (S.checks[c.id]={});
      arr[cb.dataset.c] = cb.checked; save(); renderNav();
    });
  });
  $('#doneBtn').addEventListener('click',()=>{
    if(S.done.includes(c.id)) S.done = S.done.filter(x=>x!==c.id);
    else { S.done.push(c.id); toast("완료 · "+Math.round(S.done.length/CHAPTERS.length*100)+"%"); }
    save(); renderArticle(); renderNav();
  });
  $('#presentThis').addEventListener('click',()=>openPresenter("chapter", S.idx));
  $('#quizReset').addEventListener('click',()=>{ delete S.quiz[c.id]; save(); renderArticle(); });
  $$('#article .q-choice').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(!S.quiz[c.id]) S.quiz[c.id]={};
      S.quiz[c.id][btn.dataset.q] = +btn.dataset.c;
      save(); renderArticle(); renderNav();
    });
  });
  $('#prevBtn').addEventListener('click',()=>go(-1));
  $('#nextBtn').addEventListener('click',()=>go(1));
}
function go(d){
  const n = S.idx+d;
  if(n<0||n>=CHAPTERS.length) return;
  S.idx = n; save(); renderArticle(); renderNav(); window.scrollTo({top:0,behavior:"smooth"});
}

/* ---------------- practice : flashcards ---------------- */
function allCards(){
  return CHAPTERS.flatMap(c=>c.cards.map(k=>({key:c.id+":"+k.term, term:k.term, def:k.def, ch:c.short})));
}
function renderCards(){
  const deck = allCards();
  const known = deck.filter(c=>S.cards[c.key]===1).length;
  $('#cardsPane').innerHTML = `
    <div class="card-stage">
      <div class="deck-bar">${deck.map(c=>`<i class="${S.cards[c.key]===1?'pass':(S.cards[c.key]===0?'learn':'')}"></i>`).join("")}</div>
      <div id="cardBox"></div>
      <div class="fc-stat"><span>암기 ${known} / ${deck.length}</span><span id="fcPos"></span></div>
    </div>`;
  let pos = 0;
  const order = deck.slice().sort((a,b)=> (S.cards[a.key]===1?1:0)-(S.cards[b.key]===1?1:0));
  function paint(){
    const c = order[pos];
    $('#cardBox').innerHTML = `
      <div class="flash" id="flash" tabindex="0" role="button" aria-label="뒤집기">
        <div class="fc-meta"><span>${esc(c.ch)}</span><span>${pos+1} / ${order.length}</span></div>
        <div class="fc-term">${esc(c.term)}</div>
        <div class="fc-def">${esc(c.def)}</div>
        <div class="fc-hint">클릭 또는 Space 로 뒤집기</div>
      </div>
      <div class="fc-actions">
        <button class="btn ghost" id="againBtn">다시 보기</button>
        <button class="btn" id="knowBtn">알고 있음</button>
      </div>`;
    $('#fcPos').textContent = `${pos+1} / ${order.length}`;
    const flash = $('#flash');
    flash.addEventListener('click',()=>flash.classList.toggle('revealed'));
    flash.addEventListener('keydown',e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); flash.classList.toggle('revealed'); }});
    $('#againBtn').addEventListener('click',()=>{ S.cards[c.key]=0; save(); next(); });
    $('#knowBtn').addEventListener('click',()=>{ S.cards[c.key]=1; save(); next(); });
  }
  function next(){
    if(pos<order.length-1){ pos++; paint(); }
    else { toast("덱을 모두 확인했습니다"); renderCards(); }
  }
  paint();
}

/* ---------------- practice : scenarios ---------------- */
function renderScn(){
  $('#scnPane').innerHTML = `
    <div class="scn" id="scnCard"></div>
    <div class="scn-foot"><span class="scn-dots">${SCENARIOS.map((s,i)=>`<i class="${S.scn[s.id]!==undefined?'on':''}"></i>`).join("")}</span>
    <span class="hint">${SCENARIOS.filter(s=>S.scn[s.id]!==undefined).length} / ${SCENARIOS.length} 판정 완료</span></div>`;
  const doneIds = SCENARIOS.filter(s=>S.scn[s.id]!==undefined);
  const current = SCENARIOS.find(s=>S.scn[s.id]===undefined) || SCENARIOS[SCENARIOS.length-1];
  const chosen = S.scn[current.id];
  const bestIdx = current.choices.findIndex(c=>c.best);
  $('#scnCard').innerHTML = `
    <div class="scn-kicker">Scenario · ${String(SCENARIOS.indexOf(current)+1).padStart(2,'0')} / ${String(SCENARIOS.length).padStart(2,'0')}</div>
    <h3 class="scn-title">${esc(current.title)}</h3>
    <p class="scn-body">${esc(current.body)}</p>
    <div class="scn-choices">${current.choices.map((c,i)=>{
      let cls="";
      if(chosen!==undefined){ if(i===bestIdx) cls="best"; else if(i===chosen) cls="poor"; }
      return `<button class="scn-choice ${cls}" data-i="${i}" ${chosen!==undefined?"disabled":""}>${esc(c.t)}</button>`;
    }).join("")}</div>
    ${chosen!==undefined?`<div class="scn-verdict"><b>판정 · ${chosen===bestIdx?"적절한 선택":"보완이 필요한 선택"}</b>${esc(current.choices[chosen].v)}
      <br><br><span style="color:var(--muted);font-size:12.5px">원칙: ${esc(current.lesson)}</span></div>`:""}
    <div class="scn-foot">
      <button class="btn ghost sm" id="scnReset">처음부터</button>
      <button class="btn sm" id="scnNext" ${chosen===undefined?"disabled":""}>다음 시나리오 →</button>
    </div>`;
  $$('#scnCard .scn-choice').forEach(b=>{
    b.addEventListener('click',()=>{ S.scn[current.id]=+b.dataset.i; save(); renderScn(); });
  });
  $('#scnReset').addEventListener('click',()=>{ S.scn={}; save(); renderScn(); });
  $('#scnNext').addEventListener('click',()=>{
    const remainder = SCENARIOS.filter(s=>S.scn[s.id]===undefined);
    if(remainder.length){ renderScn(); }
    else { toast("모든 시나리오를 판정했습니다"); }
  });
  $('#scnStat') && ($('#scnStat').textContent = `${doneIds.length}/${SCENARIOS.length}`);
}

/* ---------------- build ---------------- */
const SIZE_LABEL={solo:"개인 (1인)",team:"팀 (5–20명)",org:"조직 (20–100명)",enterprise:"대규모 (100명+)"};
const AUTO_LABEL={chat:"대화형만",pr:"PR · 이슈 자동화",ci:"무인 CI 실행"};
const RISK_LABEL={low:"낮음",mid:"중간",high:"높음 (금융·의료·공공)"};
const ASSET_LABEL={none:"없음",md:"CLAUDE.md 한 장",skill:"스킬 · 서브에이전트 보유"};

function blueprint(){
  const a = S.answers;
  const org = a.size==="enterprise" ? "full" : a.size==="org" ? "mid" : "light";
  const level = a.size==="solo" ? "L1 · 개인" : a.size==="team" ? "L2 · 팀" : "L3 · 조직";
  const orgChips=[]; 
  if(org!=="light" || a.risk==="high") orgChips.push(["관리형 설정",1]);
  if(org!=="light") orgChips.push(["마켓플레이스",1]);
  if(a.risk!=="low") orgChips.push(["샌드박스 정책",1]);
  if(a.risk==="high") orgChips.push(["감사 로그",1]);
  if(!orgChips.length) orgChips.push(["최소 공통 규칙",0]);
  const projChips=[["CLAUDE.md",1]];
  if(a.auto!=="chat") projChips.push(["테스트 게이트",1]);
  if(a.asset!=="none") projChips.push(["스킬",1]);
  if(a.auto==="ci") projChips.push(["훅 · 중단 조건",1]);
  if(a.auto!=="ci") projChips.push(["훅",0]);
  const perChips=[["개인 설정",1]];
  if(a.asset==="skill") perChips.push(["개인 스킬",1]);
  if(a.auto!=="chat") perChips.push(["승인 습관",1]);
  return {org, level, orgChips, projChips, perChips};
}
function nextActions(){
  return {
    solo:["CLAUDE.md에 빌드·테스트·금지사항을 적는다","반복 작업 하나를 스킬로 만든다","버그마다 재현 테스트를 먼저 추가한다"],
    team:["테스트 게이트를 PR에 연결한다","스킬과 서브에이전트를 저장소에 커밋한다","훅으로 포매터·검사를 강제한다"],
    org:["관리형 설정으로 정책을 고정한다","사내 마켓플레이스에 플러그인을 배포한다","세션 감사 로그와 준수율을 측정한다"],
    enterprise:["관리형 설정·샌드박스·감사를 3종 세트로 배포한다","플러그인 카탈로그와 버전 잠금을 운영한다","단계별 확대 지표와 롤백 절차를 문서화한다"]
  }[S.answers.size];
}
function treeLines(){
  const a=S.answers, b=blueprint(), L=[];
  L.push(["# 조직 공통","c"]);
  if(b.org!=="light"){ L.push(["managed-settings.json","f"],["  허용 도구 · 금지 경로 · 네트워크","mute"]); }
  else L.push(["(없음 — 개인/프로젝트만)","mute"]);
  L.push([""],["# 프로젝트 하네스","c"],["repo/","f"],
    ["├─ CLAUDE.md","f"],["  빌드 · 테스트 · 금지사항","mute"],["├─ .claude/","f"],
    ["│  ├─ settings.json","f"],["  권한 · 훅 연결","mute"]);
  if(a.asset!=="none") L.push(["│  ├─ skills/","f"],["│  │  └─ release/SKILL.md","mute"]);
  if(a.auto!=="chat") L.push(["│  ├─ agents/","f"],["│  │  └─ explorer.md","mute"]);
  if(a.auto==="ci") L.push(["│  └─ hooks/pre-commit-guard.sh","f"]);
  L.push(["├─ tests/","f"],["  완료 판정의 근거","mute"]);
  if(a.auto!=="chat") L.push(["└─ .github/workflows/agent.yml","f"]);
  L.push([""],["# 개인","c"],["~/.claude/","f"],["└─ settings.json","f"],["  취향 · 단축 명령 (정책은 못 덮음)","mute"]);
  return L;
}
function renderBuild(){
  const b = blueprint();
  const paint=(el,chips)=>el.innerHTML=chips.map(([t,on])=>`<span class="chip ${on?"":"dim"}">${t}</span>`).join("");
  paint($('#chips-org'), b.orgChips); paint($('#chips-project'), b.projChips); paint($('#chips-personal'), b.perChips);
  $$('.slab').forEach(s=>{
    const on = s.dataset.layer==="org" ? b.org!=="light" : true;
    s.classList.toggle('off',!on); s.classList.toggle('on',on);
  });
  $('#stackLevel').textContent = b.level;
  $('#stackMeta').textContent = {
    light:"조직 계층은 최소 규칙만. 지금은 프로젝트 하네스를 두껍게 만드는 것이 우선입니다.",
    mid:"조직 계층이 켜졌습니다. 관리형 설정과 마켓플레이스로 배포 경로를 만드세요.",
    full:"세 계층이 모두 활성. 이제 측정(감사·준수율)이 없으면 확대할 수 없습니다."
  }[b.org];
  $('#tree').innerHTML = treeLines().map(([t,k]) => k==="mute"?`<span class="mute">${esc(t)}</span>` : k==="c"?`<span class="c">${esc(t)}</span>` : `<span class="f">${esc(t)}</span>`).join("\n");
  $('#outNext').innerHTML = nextActions().map(t=>`<li>${esc(t)}</li>`).join("") +
    `<div class="warn">${S.answers.auto==="ci"?"무인 실행을 선택했습니다. 예산 상한과 변경 금지 경로를 먼저 정하지 않으면 확대하지 마세요.":"지금 단계에서는 검증 수단을 먼저 갖추는 것이 배포보다 우선입니다."}</div>`;
  $$('.q-step').forEach(step=>{
    $$('.opt',step).forEach(o=>o.setAttribute('aria-pressed',String(S.answers[step.dataset.q]===o.dataset.val)));
  });
  renderGen();
}
function renderGen(){
  if(!S.gen || !S.gen.length) S.gen=["claude"];
  $('#genList').innerHTML = TEMPLATES.map(t=>`
    <label class="gen-item"><input type="checkbox" data-id="${t.id}" ${S.gen.includes(t.id)?"checked":""}>
      <span><span class="gi-t">${esc(t.label)}</span><span class="gi-d">${esc(t.desc)}</span></span></label>`).join("");
  $$('#genList input').forEach(cb=>{
    cb.addEventListener('change',()=>{
      if(cb.checked){ if(!S.gen.includes(cb.dataset.id)) S.gen.push(cb.dataset.id); }
      else S.gen = S.gen.filter(x=>x!==cb.dataset.id);
      save(); renderGen();
    });
  });
  const current = S.gen[0] || "claude";
  const tpl = TEMPLATES.find(t=>t.id===current) || TEMPLATES[0];
  $('#genFile').textContent = tpl.file;
  $('#genCode').textContent = TPL_BUILD[tpl.id]();
  $('#genCount').textContent = `${S.gen.length}개 선택`;
}
function blueprintMd(){
  const a=S.answers, b=blueprint();
  return `# 하네스 청사진

생성일: ${todayKey()}
대상: ${SIZE_LABEL[a.size]} · 자동화 ${AUTO_LABEL[a.auto]} · 보안 ${RISK_LABEL[a.risk]} · 기존 자산 ${ASSET_LABEL[a.asset]}
목표 수준: ${b.level}

## 1. 계층 구성
- 조직 공통: ${b.orgChips.map(c=>c[0]).join(", ")}
- 프로젝트: ${b.projChips.map(c=>c[0]).join(", ")}
- 개인: ${b.perChips.map(c=>c[0]).join(", ")}

## 2. 파일 구조
${treeLines().filter(l=>l[0]!=="").map(l=>l[0]).join("\n")}

## 3. 다음 할 일
${nextActions().map((n,i)=>`${i+1}. ${n}`).join("\n")}

## 4. 이번 주에 정할 것
- 완료의 정의(검사 명령 한 줄)
- 사람이 승인할 행동 목록
- 무인 실행 예산 상한
`;
}

/* ---------------- templates content ---------------- */
const TPL_BUILD = {
  claude(){ const a=S.answers; return `# 프로젝트 규칙

## 스택
- (여기에 언어 · 프레임워크 · 패키지 매니저를 적으세요)

## 자주 쓰는 명령
- 설치: \`(명령)\`
- 개발: \`(명령)\`
- 검사: \`(명령)\`   ← 완료의 정의

## 완료 기준
1. 검사 명령이 통과한다.
2. 새 동작에는 테스트가 있다.
3. 실패한 테스트를 수정해서 통과시키지 않는다.

## 금지
- .env, secrets/, 프로덕션 자격증명 읽기
- 마이그레이션 · 배포 설정 수정 (사람 승인 필요)
- 테스트 삭제 또는 skip 추가

## 작업 방식
- 큰 변경은 계획을 먼저 쓰고 승인받는다.
- 같은 실패가 두 번 반복되면 멈추고 상태를 보고한다.
- 세션을 마칠 때 docs/handoff.md 를 갱신한다.
${a.auto!=="chat"?"- 검증 없이 '완료'라고 말하지 않는다.\n":""}`; },

  settings(){ const a=S.answers; const risk=a.risk;
  return JSON.stringify({
    "$schema":"https://json.schemastore.org/claude-code-settings.json",
    permissions:{
      allow:["Bash(npm run test:*)","Bash(npm run lint:*)","Read(**)","Edit(src/**)","Edit(tests/**)"],
      ask:["Bash(git push:*)","Bash(npm publish:*)","Edit(.github/**)","Bash(gh pr merge:*)"],
      deny: risk==="low"
        ? ["Read(.env*)","Read(secrets/**)"]
        : ["Read(.env*)","Read(secrets/**)","Read(**/*.pem)","Bash(curl:*)","Edit(infra/**)","Edit(.github/workflows/**)"]
    },
    hooks:{
      PostToolUse:[{matcher:"Edit|Write",hooks:[{type:"command",command:"npm run format --silent || true"}]}],
      PreToolUse:[{matcher:"Bash",hooks:[{type:"command",command:"bash hooks/pre-commit-guard.sh"}]}]
    }
  },null,2); },

  skill(){ return `---
name: release
description: 릴리스 준비·검증·노트 작성을 순서대로 수행한다. 버전 태그나 배포 요청 시 사용.
---

# 릴리스 절차

## 1. 사전 확인
- 기본 브랜치가 최신인지 확인: \`git fetch && git log --oneline -5 origin/main\`
- 작업 트리가 깨끗한지 확인: \`git status --short\`

## 2. 버전 결정
- 변경 로그에서 breaking change 여부를 확인한다.
- major / minor / patch 중 하나를 고르고 근거를 한 줄로 남긴다.

## 3. 검증
- [ ] \`npm ci\`
- [ ] \`npm run lint\`
- [ ] \`npm test\`
- [ ] \`npm run build\`
하나라도 실패하면 **중단**하고 실패 로그를 그대로 보고한다.

## 4. 노트 작성
- 사용자 관점의 변경만 적는다. 내부 리팩터링은 제외.
- 각 항목에 이슈 번호를 붙인다.

## 5. 배포
- 태그 생성과 푸시는 **사람 승인 후** 실행한다.
- 배포 후 스모크 테스트 결과를 기록한다.

## 하지 말 것
- 실패한 검사를 통과시키기 위해 테스트를 수정하지 않는다.
- 버전을 임의로 올리지 않는다.
`; },

  agent(){ return `---
name: explorer
description: 저장소를 넓게 탐색해 관련 파일과 호출 경로를 요약한다. 구현은 하지 않는다.
tools: Read, Grep, Glob
model: inherit
---

당신은 탐색 전담 에이전트입니다. **코드를 수정하지 않습니다.**

## 임무
주어진 질문에 답하기 위해 저장소를 훑고, 다음 형식으로만 보고합니다.

## 출력 형식
1. 관련 파일 (경로 · 역할 · 핵심 라인 범위)
2. 호출 경로 (진입점 → 처리 → 저장)
3. 재사용 가능한 기존 패턴
4. 확인이 필요한 불확실한 지점 (추측과 사실을 구분)

## 규칙
- 파일 전체를 인용하지 않는다. 필요한 줄만 인용한다.
- 추측한 내용은 "추정"으로 표시한다.
- 20개 파일을 넘게 읽어야 한다면, 먼저 범위를 좁힐 것을 제안한다.
`; },

  hook(){ return `#!/usr/bin/env bash
# 커밋 전 위험 명령 차단 훅 (결정론적 규칙)
set -euo pipefail

CMD="$(cat <<'JSON'
$(printf '%s' "$CLAUDE_TOOL_INPUT" 2>/dev/null || true)
JSON
)"

block() { echo "[harness] 차단: $1" >&2; exit 2; }

case "$CMD" in
  *"git push --force"*|*"git push -f"*) block "force push 금지 — 작업 브랜치를 사용하세요" ;;
  *"rm -rf /"*|*"rm -rf ~"*)            block "루트 삭제 명령 금지" ;;
  *"cat .env"*|*"cat secrets/"*)        block "시크릿 파일 읽기 금지" ;;
  *"DROP TABLE"*|*"truncate table"*)    block "파괴적 DB 명령 금지" ;;
esac

# 검사는 훅에서 강제한다 (모델 판단에 맡기지 않음)
if [ -d .git ] && command -v npm >/dev/null 2>&1; then
  npm run lint --silent >/dev/null 2>&1 || block "lint 실패 — 커밋 중단"
fi

exit 0
`; },

  ci(){ const a=S.answers; return `name: agent

on:
  pull_request:
    types: [opened, synchronize]
  workflow_dispatch:

permissions:
  contents: read
  pull-requests: write

concurrency:
  group: agent-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  run:
    runs-on: ubuntu-latest
    timeout-minutes: ${a.auto==="ci"?30:20}
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }

      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }

      - run: npm ci

      - name: Agent task
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
          # 시크릿은 최소 권한 토큰만 주입한다
        run: |
          npx claude-code run --print "저장소 규칙(CLAUDE.md)에 따라 lint와 test를 통과시키세요.
          테스트 파일은 수정하지 마세요. 실패하면 원인만 보고하고 종료하세요."

      - name: Verify (게이트)
        run: |
          npm run lint
          npm test -- --ci

      - name: Report
        if: always()
        run: echo "결과는 워크플로 로그와 아티팩트로 남깁니다."
`; },

  limits(){ const a=S.answers; return `# 무인 실행 상한
budget:
  wall_clock_minutes: ${a.auto==="ci"?30:15}
  max_tokens: ${a.size==="enterprise"?400000:200000}
  max_tool_calls: 120
  max_retries_per_error: 2

scope:
  writable:
    - src/**
    - tests/**
    - docs/**
  readonly:
    - infra/**
    - .github/workflows/**
    - migrations/**
  forbidden:
    - .env*
    - secrets/**
    - "**/*.pem"

stop_when:
  - repeated_failure: 2
  - tests_modified_by_agent: true
  - diff_lines_over: 800
  - forbidden_path_touched: true

escalate_to_human:
  - 정책 적합성 판단이 필요한 변경
  - 데이터 마이그레이션 포함
  - 외부 시스템에 쓰기 발생
`; },

  handoff(){ return `# 세션 인수인계

- 날짜: ${todayKey()}
- 담당: (이름)
- 브랜치: (브랜치명)

## 지금 상태
(한 문단. 무엇이 동작하고 무엇이 동작하지 않는지)

## 시도한 것
| 시도 | 결과 | 이유 |
|---|---|---|
|  |  |  |

## 실패한 이유
(다시 시도하지 말아야 할 접근과 그 근거)

## 다음 사람이 할 일
1.
2.

## 열린 질문
- 
`; },

  managed(){ const a=S.answers; const high=a.risk==="high";
  return JSON.stringify({
    "//":"조직 관리형 설정 — 사용자·프로젝트가 덮어쓸 수 없음",
    permissions:{
      deny:[
        "Read(.env*)","Read(secrets/**)","Read(**/*.pem)","Read(**/id_rsa*)",
        "Edit(infra/**)","Edit(.github/workflows/**)","Bash(curl:*)","Bash(wget:*)"
      ],
      allowedMcpServers: high?["issue-tracker","docs"]:["issue-tracker","docs","browser"]
    },
    sandbox:{ enabled:true, network: high?"allowlist":"restricted", allowedHosts:["registry.npmjs.org","api.github.com"] },
    audit:{ enabled:true, retentionDays: high?365:90, includeToolInputs:true },
    update:{ channel:"stable", requireSignedPlugins:true }
  },null,2); },

  owners(){ return `# 민감 경로 소유자 — 에이전트 변경은 반드시 리뷰
*                               @your-org/platform

/infra/                         @your-org/sre
/.github/workflows/             @your-org/sre
/migrations/                    @your-org/data
/managed-settings.json          @your-org/security
/harness/                       @your-org/platform
`; }
};

/* ---------------- diagnose ---------------- */
function renderDiag(){
  const wrap = $('#diagList');
  wrap.innerHTML = DIAG_ITEMS.map((it,i)=>{
    const v = S.diag[i] ?? 0;
    return `<div class="diag-row"><p><span class="n">${String(i+1).padStart(2,"0")}</span>${esc(it.q)}</p>
      <div class="seg" data-i="${i}">
        <button data-v="0" aria-pressed="${v===0}">없음</button>
        <button data-v="1" aria-pressed="${v===1}">부분</button>
        <button data-v="2" aria-pressed="${v===2}">있음</button>
      </div></div>`;
  }).join("");
  $$('#diagList .seg button').forEach(b=>{
    b.addEventListener('click',()=>{ S.diag[b.parentElement.dataset.i]=+b.dataset.v; save(); renderDiag(); });
  });
  const total = DIAG_ITEMS.reduce((s,_,i)=>s+(S.diag[i]||0),0);
  const levels=[[0,"L0 · 대화형 사용"],[4,"L1 · 개인 하네스"],[9,"L2 · 팀 표준"],[14,"L3 · 조직 거버넌스"],[18,"L4 · 무인 운영"]];
  let lv=levels[0]; levels.forEach(l=>{ if(total>=l[0]) lv=l; });
  $('#score').textContent = total;
  $('#level').textContent = lv[1];
  $('#meterFill').style.width = (total/20*100)+"%";
  const answered = Object.keys(S.diag).length;
  $('#diagSummary').innerHTML = answered===0
    ? "아직 진단 전입니다. 각 항목을 0–2로 표시하세요."
    : `<strong>${answered}/10</strong> 문항 응답. 현재 ${lv[1]} 수준입니다. 낮은 항목부터 하나씩 올리면 다음 단계로 넘어갑니다.`;
  const weak = DIAG_ITEMS.map((it,i)=>({v:S.diag[i]??0,it})).filter(x=>x.v<2).sort((a,b)=>a.v-b.v).slice(0,3);
  $('#diagNext').innerHTML = answered===0
    ? "<li>문항을 표시하면 여기에 우선순위가 나타납니다.</li>"
    : weak.map(w=>`<li>${esc(w.it.next)}</li>`).join("");
}

/* ---------------- reference ---------------- */
function renderRef(){
  $('#refBody').innerHTML = `
    <div class="subhead">실패 사례 — 먼저 피해야 할 것</div>
    <div class="ref-grid">${APPENDIX.failures.map(f=>`<div class="ref-card"><h4>${esc(f.t)}</h4><p>${esc(f.d)}</p></div>`).join("")}</div>

    <div class="subhead">직군별 적용</div>
    <table class="cheat"><thead><tr><th>직군</th><th>가장 먼저 붙일 하네스</th></tr></thead>
      <tbody>${APPENDIX.roles.map(r=>`<tr><td>${esc(r.r)}</td><td>${esc(r.h)}</td></tr>`).join("")}</tbody></table>

    <div class="subhead">90분 워크숍 진행안</div>
    <table class="cheat"><thead><tr><th>구간</th><th>내용</th></tr></thead>
      <tbody>${APPENDIX.workshop.map(w=>`<tr><td>${esc(w.t)}</td><td>${esc(w.d)}</td></tr>`).join("")}</tbody></table>

    <div class="subhead">한 장 치트시트</div>
    <table class="cheat"><thead><tr><th>주제</th><th>원칙</th></tr></thead>
      <tbody>${APPENDIX.cheat.map(([a,b])=>`<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</tbody></table>

    <div class="subhead">오디오 라이브러리 <span class="al-d">${CHAPTERS.length}편 · ${fmtT(audioTotal())}</span></div>
    <div class="audio-lib">${CHAPTERS.map((c,i)=>`<div class="al-row">
      <span class="al-n">${String(i+1).padStart(2,"0")}</span>
      <span class="al-t">${esc(c.short)}</span>
      <span class="al-d">${fmtT(aSec(c.id))}</span>
      <button class="al-play" data-audio="${c.id}" aria-label="${esc(c.short)} 재생"><svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z"/></svg></button>
    </div>`).join("")}</div>

    <div class="subhead">발표 자료</div>
    ${launchPane()}

    <div class="subhead">데이터</div>
    <div class="ref-card" style="margin-top:8px">
      <h4>학습 기록 내보내기 / 가져오기</h4>
      <p>진도·퀴즈·카드·진단 결과를 JSON으로 저장합니다. 다른 기기나 브라우저로 옮길 때 사용하세요.</p>
      <div class="gen-actions">
        <button class="btn sm" id="expBtn">JSON 내보내기</button>
        <button class="btn ghost sm" id="impBtn">가져오기</button>
        <button class="btn ghost sm" id="printBtn">인쇄 · PDF</button>
        <button class="btn ghost sm" id="resetBtn">전체 초기화</button>
      </div>
      <input type="file" id="impFile" accept="application/json" hidden>
    </div>`;
  $$("[data-audio]").forEach(b=>b.addEventListener("click",()=>openAudio(b.dataset.audio,true)));
  $('#expBtn').addEventListener('click',()=>{
    const blob = new Blob([JSON.stringify(S,null,2)],{type:"application/json"});
    download("harness-studio-progress.json", blob);
  });
  $('#impBtn').addEventListener('click',()=>$('#impFile').click());
  $('#impFile').addEventListener('change',async e=>{
    const f = e.target.files[0]; if(!f) return;
    try{ const d = JSON.parse(await f.text()); S = Object.assign({},DEFAULTS,d); save(); boot(); toast("학습 기록을 가져왔습니다"); }
    catch(err){ toast("가져오기 실패 — JSON 형식을 확인하세요"); }
  });
  $('#printBtn').addEventListener('click',()=>window.print());
  $('#resetBtn').addEventListener('click',()=>{
    if(confirm("진도·퀴즈·카드·진단 기록을 모두 지울까요?")){ S = JSON.parse(JSON.stringify(DEFAULTS)); save(); boot(); toast("초기화했습니다"); }
  });
}

/* ---------------- views ---------------- */
function setView(v){
  S.view = v; save(); paintView();
  window.scrollTo({top:0,behavior:"instant"});
}
function paintView(){
  const v = S.view;
  document.body.dataset.view = v;
  $$('.view').forEach(s=>s.classList.toggle('active', s.id==="view-"+v));
  $$('.mode-btn').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.view===v)));
  $$('.mobile-nav button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.view===v)));
  if(v==="learn") renderArticle();
  if(v==="practice"){ renderPractice(); }
  if(v==="build") renderBuild();
  if(v==="diagnose") renderDiag();
  if(v==="reference") renderRef();
  if(v==="learn"||v==="practice") renderNav();
}
function renderPractice(){
  const tab = S.practice || "cards";
  $$('#practiceSwitch button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));
  $('#cardsPane').style.display = tab==="cards" ? "" : "none";
  $('#scnPane').style.display = tab==="scn" ? "" : "none";
  $('#presentPane').innerHTML = launchPane();
  if(tab==="cards") renderCards(); else renderScn();
}

/* ---------------- downloads / zip ---------------- */
function download(name, blob){
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(u), 2000);
}
const CRC_TABLE = (()=>{
  const t = new Uint32Array(256);
  for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c = c&1 ? 0xEDB88320 ^ (c>>>1) : c>>>1; t[n]=c>>>0; }
  return t;
})();
function crc32(bytes){
  let c = 0xFFFFFFFF;
  for(let i=0;i<bytes.length;i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c>>>8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function zipStore(files){
  const enc = new TextEncoder();
  const parts=[]; const central=[]; let offset=0;
  const now = new Date();
  const time = ((now.getHours()<<11) | (now.getMinutes()<<5) | (now.getSeconds()/2)) & 0xFFFF;
  const date = (((now.getFullYear()-1980)<<9) | ((now.getMonth()+1)<<5) | now.getDate()) & 0xFFFF;
  files.forEach(f=>{
    const nameB = enc.encode(f.name);
    const data = enc.encode(f.text);
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameB.length);
    const dv = new DataView(local.buffer);
    dv.setUint32(0,0x04034b50,true); dv.setUint16(4,20,true); dv.setUint16(6,0x0800,true);
    dv.setUint16(8,0,true); dv.setUint16(10,time,true); dv.setUint16(12,date,true);
    dv.setUint32(14,crc,true); dv.setUint32(18,data.length,true); dv.setUint32(22,data.length,true);
    dv.setUint16(26,nameB.length,true); dv.setUint16(28,0,true);
    local.set(nameB,30);
    parts.push(local, data);
    const cd = new Uint8Array(46 + nameB.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0,0x02014b50,true); cv.setUint16(4,20,true); cv.setUint16(6,20,true);
    cv.setUint16(8,0x0800,true); cv.setUint16(10,0,true); cv.setUint16(12,time,true); cv.setUint16(14,date,true);
    cv.setUint32(16,crc,true); cv.setUint32(20,data.length,true); cv.setUint32(24,data.length,true);
    cv.setUint16(28,nameB.length,true); cv.setUint16(30,0,true); cv.setUint16(32,0,true);
    cv.setUint16(34,0,true); cv.setUint16(36,0,true); cv.setUint32(38,0,true); cv.setUint32(42,offset,true);
    cd.set(nameB,46);
    central.push(cd);
    offset += local.length + data.length;
  });
  const cdSize = central.reduce((s,c)=>s+c.length,0);
  const eocd = new Uint8Array(22); const ev = new DataView(eocd.buffer);
  ev.setUint32(0,0x06054b50,true); ev.setUint16(4,0,true); ev.setUint16(6,0,true);
  ev.setUint16(8,files.length,true); ev.setUint16(10,files.length,true);
  ev.setUint32(12,cdSize,true); ev.setUint32(16,offset,true); ev.setUint16(20,0,true);
  return new Blob([...parts, ...central, eocd], {type:"application/zip"});
}

/* ---------------- palette ---------------- */
let paletteSel = 0;
function paletteItems(){
  const items = CHAPTERS.map((c,i)=>({k:"챕터", label:`${String(i+1).padStart(2,"0")} ${c.title}`, run:()=>{ S.idx=i; setView("learn"); }}));
  return items.concat([
    {k:"보기", label:"연습 — 플래시카드", run:()=>{ S.practice="cards"; setView("practice"); }},
    {k:"보기", label:"연습 — 시나리오 랩", run:()=>{ S.practice="scn"; setView("practice"); }},
    {k:"보기", label:"빌더 — 하네스 청사진", run:()=>setView("build")},
    {k:"보기", label:"진단 — 성숙도 체크", run:()=>setView("diagnose")},
    {k:"보기", label:"참고자료 · 치트시트", run:()=>setView("reference")},
    {k:"동작", label:"테마 전환", run:()=>{ S.theme = S.theme==="dark"?"light":"dark"; applyTheme(); save(); }},
    {k:"동작", label:"산출물 ZIP 내려받기", run:()=>downloadZip()},
    {k:"동작", label:"학습 기록 내보내기", run:()=>$('#expBtn')?.click() || setView("reference")}
  ]);
}
function openPalette(){
  $('#paletteBack').classList.add('open');
  $('#paletteInput').value=""; paletteSel=0; paintPalette();
  setTimeout(()=>$('#paletteInput').focus(),30);
}
function closePalette(){ $('#paletteBack').classList.remove('open'); }
function paintPalette(){
  const q = $('#paletteInput').value.trim().toLowerCase();
  const all = paletteItems();
  const list = all.filter(i=>i.label.toLowerCase().includes(q)).slice(0,12);
  paletteSel = Math.min(paletteSel, Math.max(0,list.length-1));
  $('#paletteList').innerHTML = list.length
    ? list.map((i,ix)=>`<button class="palette-item ${ix===paletteSel?'sel':''}" data-ix="${ix}"><span class="pk">${i.k}</span><span>${esc(i.label)}</span></button>`).join("")
    : `<div class="palette-empty">결과 없음</div>`;
  $$('#paletteList .palette-item').forEach(b=>{
    b.addEventListener('click',()=>{ const it=list[+b.dataset.ix]; closePalette(); it.run(); });
  });
  $('#paletteInput').onkeydown = e=>{
    if(e.key==="ArrowDown"){ e.preventDefault(); paletteSel=Math.min(paletteSel+1,list.length-1); paintPalette(); }
    if(e.key==="ArrowUp"){ e.preventDefault(); paletteSel=Math.max(paletteSel-1,0); paintPalette(); }
    if(e.key==="Enter"){ const it=list[paletteSel]; if(it){ closePalette(); it.run(); } }
    if(e.key==="Escape") closePalette();
  };
  $('#paletteList')._items = list;
}

/* ---------------- zip / copy ---------------- */
function downloadZip(){
  const ids = (S.gen && S.gen.length) ? S.gen : ["claude"];
  const files = ids.map(id=>{
    const t = TEMPLATES.find(x=>x.id===id);
    return {name:t.file, text:TPL_BUILD[id]()};
  });
  files.push({name:"harness-blueprint.md", text:blueprintMd()});
  download("harness-kit.zip", zipStore(files));
  toast(`${files.length}개 파일 · harness-kit.zip`);
}


/* ============================================================
   AUDIO PLAYER
   ============================================================ */
const PL = {on:false, id:null, rate:1};
function fmtT(s){
  if(!isFinite(s)) s=0;
  const m=Math.floor(s/60), ss=Math.floor(s%60);
  return m + ":" + String(ss).padStart(2,"0");
}
function openAudio(id, autoplay){
  PL.id = id;
  const a = $("#audio");
  const c = CHAPTERS.find(x=>x.id===id);
  if(!c) return;
  $("#plTitle").textContent = String(CHAPTERS.indexOf(c)+1).padStart(2,"0") + " · " + c.short;
  $("#plSub").textContent = AUDIO_VOICE + " · " + fmtT(aSec(id)||0);
  a.src = audioSrc(id);
  a.playbackRate = PL.rate;
  $("#player").classList.add("open");
  document.body.classList.add("player-open");
  PL.on = true;
  if(autoplay!==false) a.play().catch(()=>{});
  S.lastAudio = id; save();
}
function toggleAudio(){
  const a = $("#audio");
  if(!PL.id){ openAudio(CHAPTERS[S.idx].id, true); return; }
  if(a.paused) a.play().catch(()=>{}); else a.pause();
}
function closePlayer(){
  const a = $("#audio"); a.pause();
  $("#player").classList.remove("open");
  document.body.classList.remove("player-open");
  PL.on = false;
}
function stepChapter(d){
  const i = CHAPTERS.findIndex(x=>x.id===PL.id);
  const n = Math.max(0, Math.min(CHAPTERS.length-1, i+d));
  if(n===i) return;
  openAudio(CHAPTERS[n].id, true);
}
(function wirePlayer(){
  const a = $("#audio");
  const icon = paused => paused ? '<path d="M7 5l12 7-12 7z"/>' : '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>';
  a.addEventListener("play",()=>{ $("#plIcon").innerHTML = icon(false); });
  a.addEventListener("pause",()=>{ $("#plIcon").innerHTML = icon(true); });
  a.addEventListener("timeupdate",()=>{
    const d = a.duration || aSec(PL.id) || 0;
    $("#plTime").textContent = fmtT(a.currentTime) + " / " + fmtT(d);
    $("#plBar").style.width = d ? (a.currentTime/d*100)+"%" : "0%";
    const seek = $("#plSeek");
    if(document.activeElement !== seek) seek.value = d ? Math.round(a.currentTime/d*1000) : 0;
  });
  a.addEventListener("ended",()=>{
    const i = CHAPTERS.findIndex(x=>x.id===PL.id);
    if(i < CHAPTERS.length-1) openAudio(CHAPTERS[i+1].id, true);
    else { $("#plIcon").innerHTML = icon(true); toast("마지막 챕터입니다"); }
  });
  a.addEventListener("error",()=>{ if(PL.id) toast("오디오를 불러오지 못했습니다 — 파일 경로를 확인하세요"); });
  $("#plToggle").addEventListener("click",toggleAudio);
  $("#plClose").addEventListener("click",closePlayer);
  $("#plPrev").addEventListener("click",()=>stepChapter(-1));
  $("#plNext").addEventListener("click",()=>stepChapter(1));
  $("#plSeek").addEventListener("input",e=>{
    const d = a.duration || aSec(PL.id) || 0;
    a.currentTime = (+e.target.value/1000)*d;
  });
  const speeds = [1,1.25,1.5,0.8];
  $("#plSpeed").addEventListener("click",()=>{
    PL.rate = speeds[(speeds.indexOf(PL.rate)+1)%speeds.length];
    a.playbackRate = PL.rate;
    $("#plSpeed").textContent = (PL.rate===1 ? "1.0" : String(PL.rate)) + "×";
  });
})();

/* ---------------- boot ---------------- */
function boot(){
  applyTheme();
  renderNav();
  renderArticle();
  renderBuild();
  renderDiag();
  renderRef();
  renderPractice();
  paintView();
}
applyTheme();

/* view switches */
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));

/* theme */
$('#themeBtn').addEventListener('click',()=>{
  S.theme = S.theme==="dark"?"light":"dark"; applyTheme(); save();
});

/* search */
$('#search').addEventListener('input',e=>{
  renderNav();
  const q = e.target.value.trim().toLowerCase();
  if(!q) return;
  const hit = CHAPTERS.find(c=>(c.title+" "+c.lede+" "+c.blocks.map(b=>b.tag+b.title+b.body).join(" ")).toLowerCase().includes(q));
  if(hit){ S.idx = CHAPTERS.indexOf(hit); if(S.view!=="learn") setView("learn"); else { renderArticle(); renderNav(); } }
});

/* build inputs */
$$('.q-step').forEach(step=>{
  $$('.opt',step).forEach(o=>o.addEventListener('click',()=>{
    S.answers[step.dataset.q] = o.dataset.val; save(); renderBuild();
  }));
});

/* blueprint copy / download */
$('#copyBtn').addEventListener('click',async ()=>{
  try{ await navigator.clipboard.writeText(blueprintMd()); toast("청사진을 복사했습니다"); }
  catch(e){ toast("복사가 차단되었습니다 — 다운로드를 사용하세요"); }
});
$('#dlBtn').addEventListener('click',()=>{
  download("harness-blueprint.md", new Blob([blueprintMd()],{type:"text/markdown;charset=utf-8"}));
  toast("harness-blueprint.md 다운로드");
});

/* practice switch */
$$('#practiceSwitch button').forEach(b=>{
  b.addEventListener('click',()=>{ S.practice = b.dataset.tab; save(); renderPractice(); });
});

/* palette */
$('#paletteBack').addEventListener('click',e=>{ if(e.target.id==="paletteBack") closePalette(); });
$('#paletteInput').addEventListener('input',paintPalette);

/* keyboard */
document.addEventListener('keydown',e=>{
  const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==="k"){ e.preventDefault(); openPalette(); return; }
  if(e.key==="Escape") closePalette();
  if(inField) return;
  if(S.view!=="learn") return;
  if(e.key==="ArrowRight") go(1);
  if(e.key==="ArrowLeft") go(-1);
});

/* PWA install */
let deferredPrompt = null;
const installBtn = $('#installBtn');
const isStandalone = ()=>window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault(); deferredPrompt = e;
  if(!isStandalone()) installBtn.classList.add('show');
});
installBtn.addEventListener('click',async ()=>{
  if(deferredPrompt){
    deferredPrompt.prompt();
    const r = await deferredPrompt.userChoice;
    if(r.outcome==="accepted"){ installBtn.classList.remove('show'); toast("홈 화면에 추가되었습니다"); }
    deferredPrompt = null;
  } else {
    toast("브라우저 메뉴 → '홈 화면에 추가'를 선택하세요");
  }
});
window.addEventListener('appinstalled',()=>installBtn.classList.remove('show'));
if(isStandalone()) installBtn.classList.remove('show');

window.addEventListener('online',()=>$('#offlinePill').classList.remove('show'));
window.addEventListener('offline',()=>$('#offlinePill').classList.add('show'));

/* deep link (?go=practice|build|diagnose|reference&chapter=n) */
(function deepLink(){
  const p = new URLSearchParams(location.search);
  const go = p.get("go");
  if(go && ["learn","practice","build","diagnose","reference"].includes(go)) S.view = go;
  const ch = p.get("chapter");
  if(ch && !isNaN(+ch)) S.idx = Math.max(0, Math.min(CHAPTERS.length-1, +ch-1));
})();

boot();

/* ============================================================
   PRESENTER MODE
   ============================================================ */
const ST = {open:false, deck:[], pos:0, mode:"chapter", started:0, paused:false, pausedAt:0,
            accum:0, notes:false, hideAnswer:true, segStart:0, clock:null, chapter:null};

function chapterDeck(ci){
  const c = CHAPTERS[ci], p = PARTS.find(x=>x.id===c.part);
  const num = String(ci+1).padStart(2,"0");
  const slides = [];
  slides.push({kind:"cover", eyebrow:`${p.no} · CHAPTER ${num}`, title:c.title, body:c.lede,
    notes:{title:"도입", body:c.lede, bullets:c.checks}});
  c.blocks.forEach((b,i)=>{
    slides.push({kind:"block", eyebrow:`${b.tag} · ${b.sub}`, index:`${i+1}/${c.blocks.length}`,
      title:b.title, body:b.body, notes:{title:b.title, body:b.body, bullets:[]}});
  });
  slides.push({kind:"quote", eyebrow:"일상 비유", title:c.analogy,
    notes:{title:"비유로 정리", body:"청중이 자기 업무로 번역할 수 있도록 한 문장씩 확인하며 넘깁니다.", bullets:[]}});
  slides.push({kind:"list", eyebrow:"실무 체크", title:"오늘 확인할 것", items:c.checks,
    notes:{title:"체크리스트", body:"전부 다 하지 않아도 됩니다. 하나만 골라 이번 주에 하겠다고 말하게 하세요.", bullets:c.checks}});
  c.quiz.forEach((q,qi)=>{
    slides.push({kind:"quiz", eyebrow:`확인 ${qi+1}/${c.quiz.length}`, title:q.q,
      choices:q.choices, answer:q.answer, why:q.explain,
      notes:{title:"질문", body:q.explain, bullets:[]}});
  });
  slides.push({kind:"takeaway", eyebrow:"한 줄 정리", title:TAKEAWAYS[c.id]||c.lede,
    notes:{title:"마무리", body:"다음 챕터로 넘어가기 전에 이 문장을 소리 내어 읽게 하세요.", bullets:[]}});
  return slides;
}

function workshopDeck(){
  const w = WORKSHOP_TRACK;
  const slides = [];
  slides.push({kind:"cover", eyebrow:"WORKSHOP · 90 MIN", title:w.title, body:w.subtitle,
    notes:{title:"진행 안내", body:"90분 동안 진단 → 개념 → 조립 → 산출물 → 시나리오 순서로 진행합니다.", bullets:w.segments.map(s=>s.t)}});
  let acc = 0;
  w.segments.forEach((s,i)=>{
    const from = acc; acc += s.min;
    slides.push({kind:"workshop", eyebrow:`${String(from).padStart(2,"0")}–${String(acc).padStart(2,"0")} MIN · ${i+1}/${w.segments.length}`,
      title:s.t, body:s.d, act:s.act, minutes:s.min,
      notes:{title:`${s.t} (${s.min}분)`, body:s.d, bullets:[s.act]}});
  });
  slides.push({kind:"takeaway", eyebrow:"마무리", title:"오늘 커밋한 하나가 팀 하네스의 시작입니다.",
    notes:{title:"클로징", body:"각자 이번 주에 할 일 하나를 말하고 종료합니다.", bullets:[]}});
  return slides;
}

function openPresenter(mode, ci){
  ST.mode = mode; ST.chapter = ci;
  ST.deck = mode==="workshop" ? workshopDeck() : chapterDeck(ci ?? S.idx);
  ST.pos = 0; ST.notes = false; ST.hideAnswer = true;
  ST.started = Date.now(); ST.paused = false; ST.accum = 0; ST.segStart = Date.now();
  $('#stage').classList.add('open');
  document.body.style.overflow = "hidden";
  ST.open = true;
  $('#stageDeck').textContent = mode==="workshop" ? "90분 워크숍" : `${String((ci ?? S.idx)+1).padStart(2,"0")} · ${CHAPTERS[ci ?? S.idx].short}`;
  paintSlide();
  clearInterval(ST.clock);
  ST.clock = setInterval(tickClock, 1000);
  if($('#stage').requestFullscreen && !document.fullscreenElement){
    $('#stage').requestFullscreen?.().catch(()=>{});
  }
}
function closePresenter(){
  ST.open = false; clearInterval(ST.clock);
  $('#stage').classList.remove('open');
  document.body.style.overflow = "";
  if(document.fullscreenElement) document.exitFullscreen?.().catch(()=>{});
}
function elapsed(){
  if(ST.paused) return ST.accum;
  return ST.accum + Math.floor((Date.now()-ST.started)/1000);
}
function fmt(s){
  const m = Math.floor(Math.abs(s)/60), ss = Math.abs(s)%60;
  return `${s<0?"-":""}${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
}
function tickClock(){
  const el = $('#stageClock'); if(!el) return;
  const slide = ST.deck[ST.pos];
  if(ST.mode==="workshop" && slide && slide.minutes){
    const left = slide.minutes*60 - Math.floor((Date.now()-ST.segStart)/1000);
    el.textContent = fmt(left);
    el.classList.toggle('warn', left < 60);
  } else {
    el.textContent = fmt(elapsed());
    el.classList.remove('warn');
  }
}
function paintSlide(){
  const s = ST.deck[ST.pos];
  if(!s) return;
  const stage = $('#stage');
  stage.classList.toggle('hide-answer', ST.hideAnswer);
  let body = "";
  if(s.kind==="cover"){
    body = `<div class="s-eyebrow"><span class="bar"></span><span>${esc(s.eyebrow)}</span></div>
      <h2 class="s-title cover">${esc(s.title)}</h2>
      <p class="s-body">${esc(s.body)}</p>`;
  } else if(s.kind==="quote"){
    body = `<div class="s-eyebrow"><span class="bar"></span><span>${esc(s.eyebrow)}</span></div>
      <p class="s-quote">${esc(s.title)}<span class="src">일상의 장면으로 옮겨 이해하기</span></p>`;
  } else if(s.kind==="list"){
    body = `<div class="s-eyebrow"><span class="bar"></span><span>${esc(s.eyebrow)}</span></div>
      <h2 class="s-title">${esc(s.title)}</h2>
      <ul class="s-list">${s.items.map((t,i)=>`<li><span class="n">${String(i+1).padStart(2,"0")}</span><span>${esc(t)}</span></li>`).join("")}</ul>`;
  } else if(s.kind==="quiz"){
    body = `<div class="s-eyebrow"><span class="bar"></span><span>${esc(s.eyebrow)}</span></div>
      <h2 class="s-title" style="font-size:clamp(22px,3.2vw,42px);max-width:30ch">${esc(s.title)}</h2>
      <div class="s-choices">${s.choices.map((ch,i)=>`<div class="s-choice ${i===s.answer?"correct":""}">
        <span class="mk">${String.fromCharCode(65+i)}</span><span>${esc(ch)}</span></div>`).join("")}</div>
      <div class="s-answer-hint">${ST.hideAnswer?"Enter · 클릭으로 정답 공개":"정답 공개됨"}</div>
      <div class="s-why"><b>해설</b>${esc(s.why)}</div>`;
  } else if(s.kind==="workshop"){
    body = `<div class="s-eyebrow"><span class="bar"></span><span>${esc(s.eyebrow)}</span></div>
      <h2 class="s-title" style="font-size:clamp(30px,4.6vw,58px)">${esc(s.title)}</h2>
      <p class="s-body">${esc(s.body)}</p>
      <div class="s-why" style="margin-top:26px"><b>이 구간에서 할 일</b>${esc(s.act)}</div>`;
  } else if(s.kind==="takeaway"){
    body = `<div class="s-eyebrow"><span class="bar"></span><span>${esc(s.eyebrow)}</span></div>
      <p class="s-quote" style="border-left-color:#E08050">${esc(s.title)}</p>`;
  } else { /* block */
    body = `<div class="s-eyebrow"><span class="bar"></span><span>${esc(s.eyebrow)}</span><span class="num">${esc(s.index||"")}</span></div>
      <h2 class="s-title">${esc(s.title)}</h2>
      <p class="s-body">${esc(s.body)}</p>`;
  }
  $('#slide').innerHTML = body;
  $('#stageCount').textContent = `${ST.pos+1} / ${ST.deck.length}`;
  $('#prog').innerHTML = ST.deck.map((_,i)=>`<button data-i="${i}" class="${i===ST.pos?'cur':(i<ST.pos?'done':'')}" aria-label="${i+1}"></button>`).join("");
  $$('#prog button').forEach(b=>b.addEventListener('click',()=>{ ST.pos = +b.dataset.i; ST.segStart = Date.now(); ST.hideAnswer = true; paintSlide(); }));
  $('#prevSlide').disabled = ST.pos===0;
  $('#nextSlide').disabled = ST.pos===ST.deck.length-1;
  /* notes */
  const n = s.notes || {};
  $('#notes').innerHTML = `<h5>Notes</h5><p style="font-family:var(--mono);font-size:11px;letter-spacing:.1em;color:rgba(239,235,224,.45);margin-bottom:10px">${esc(n.title||"")}</p>
    <p>${esc(n.body||"")}</p>${(n.bullets&&n.bullets.length)?`<ul>${n.bullets.map(b=>`<li>${esc(b)}</li>`).join("")}</ul>`:""}`;
  $('#notes').classList.toggle('open', ST.notes);
  tickClock();
}
function stepSlide(d){
  const n = ST.pos + d;
  if(n<0 || n>=ST.deck.length) return;
  ST.pos = n; ST.hideAnswer = true; ST.segStart = Date.now(); paintSlide();
}
function launchPane(){
  return `<div class="launch">
    <button class="launch-card" data-launch="chapter">
      <div class="lc-k">Presenter · Chapter</div>
      <p class="lc-t">현재 챕터 발표</p>
      <p class="lc-d">${esc(CHAPTERS[S.idx].short)} — 개념 · 비유 · 체크 · 퀴즈로 구성된 덱</p>
    </button>
    <button class="launch-card" data-launch="workshop">
      <div class="lc-k">Presenter · Workshop</div>
      <p class="lc-t">90분 워크숍 진행</p>
      <p class="lc-d">진단 → 개념 → 조립 → 산출물 → 시나리오, 구간별 타이머</p>
    </button>
  </div>`;
}

/* wiring */
document.addEventListener('click',e=>{
  const b = e.target.closest('[data-launch]');
  if(!b) return;
  openPresenter(b.dataset.launch);
});

$('#exitStage').addEventListener('click',closePresenter);
$('#prevSlide').addEventListener('click',()=>stepSlide(-1));
$('#nextSlide').addEventListener('click',()=>stepSlide(1));
$('#stageNotes').addEventListener('click',()=>{ ST.notes = !ST.notes; $('#notes').classList.toggle('open',ST.notes); $('#stageNotes').classList.toggle('on',ST.notes); });
$('#stageFull').addEventListener('click',()=>{
  if(document.fullscreenElement) document.exitFullscreen?.();
  else $('#stage').requestFullscreen?.().catch(()=>toast("전체화면을 지원하지 않는 브라우저입니다"));
});
$('#stagePause').addEventListener('click',()=>{
  if(ST.paused){ ST.started = Date.now(); ST.paused = false; }
  else { ST.accum = elapsed(); ST.paused = true; }
  $('#stagePause').classList.toggle('on',ST.paused);
  tickClock();
});
$('#stageReset').addEventListener('click',()=>{ ST.accum=0; ST.started=Date.now(); ST.segStart=Date.now(); ST.paused=false; $('#stagePause').classList.remove('on'); tickClock(); });
$('#slide').addEventListener('click',()=>{
  const s = ST.deck[ST.pos];
  if(s && s.kind==="quiz"){ ST.hideAnswer = !ST.hideAnswer; $('#stage').classList.toggle('hide-answer',ST.hideAnswer); }
});
$('#slide').addEventListener('dblclick',e=>{ if(!e.target.closest('.s-choice')) stepSlide(1); });

document.addEventListener('keydown',e=>{
  if(!ST.open) return;
  const k = e.key;
  if(k==="Escape"){ closePresenter(); return; }
  if(k==="ArrowRight"||k===" "||k==="PageDown"||k==="Enter"){ e.preventDefault(); stepSlide(1); return; }
  if(k==="ArrowLeft"||k==="PageUp"||k==="Backspace"){ e.preventDefault(); stepSlide(-1); return; }
  if(k==="n"||k==="N"){ ST.notes=!ST.notes; $('#notes').classList.toggle('open',ST.notes); $('#stageNotes').classList.toggle('on',ST.notes); }
  if(k==="f"||k==="F"){ $('#stageFull').click(); }
  if(k==="p"||k==="P"){ $('#stagePause').click(); }
  if(k==="Home"){ ST.pos=0; paintSlide(); }
  if(k==="End"){ ST.pos=ST.deck.length-1; paintSlide(); }
});
document.addEventListener('fullscreenchange',()=>{ if(!document.fullscreenElement && ST.open && !ST.keepOpen) {} });
