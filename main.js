/* assets/js/main.js
   Unified JS for Kidii
   - Mobile nav, AOS init
   - Ideas & debates localStorage backed (prototype)
   - Like system per-device (localStorage); backend-ready functions
   - Modal for detail view; toast messages
*/

/* AOS init if present */
if (window.AOS) {
  AOS.init({ once: true, duration: 700, easing: 'ease-out-cubic' });
}

/* Mobile nav toggle (accessible) */
(function(){
  const mobileToggle = document.getElementById('mobileToggle');
  const mainNav = document.getElementById('mainNav');
  if (!mobileToggle || !mainNav) return;
  mobileToggle.addEventListener('click', () => {
    const open = mainNav.classList.toggle('open');
    mobileToggle.setAttribute('aria-expanded', String(open));
    mainNav.setAttribute('aria-hidden', String(!open));
  });
})();

/* --- localStorage helpers --- */
function readJSON(key, fallback){
  try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(e){ return fallback; }
}
function writeJSON(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

/* Seed data (only once) */
(function seedData(){
  if(!localStorage.getItem('kidii_ideas')){
    const seed = [
      { id:'eco-bottle', title:'Eco Bottle', category:'Environment', desc:'Smart refillable bottle that tracks hydration and rewards eco-friendly refills.', likes:12 },
      { id:'tutormate', title:'TutorMate', category:'Education', desc:'Peer-to-peer tutoring platform matching students by subject and level.', likes:9 },
      { id:'readright', title:'ReadRight', category:'Tech', desc:'Browser overlay tools to aid dyslexic readers and ESL learners.', likes:6 }
    ];
    writeJSON('kidii_ideas', seed);
  }
  if(!localStorage.getItem('kidii_debates')){
    const seed = [
      { id:'d1', title:'Should entrepreneurship be taught in schools?', body:'Share reasons', comments:[], upvotes:128 },
      { id:'d2', title:'Is AI helping creativity?', body:'Tell us your experiences', comments:[], upvotes:96 }
    ];
    writeJSON('kidii_debates', seed);
  }
})();

/* Escape */
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* Toast */
function showToast(message, ms=2300){
  let t = document.querySelector('.toast');
  if(!t){
    t = document.createElement('div'); t.className='toast'; document.body.appendChild(t);
  }
  t.textContent = message; t.classList.add('show');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(()=> t.classList.remove('show'), ms);
}

/* Like handling (one like per device via kidii_likes) */
function toggleLike(ideaId, buttonEl){
  const liked = readJSON('kidii_likes', []);
  const ideas = readJSON('kidii_ideas', []);
  const idx = liked.indexOf(ideaId);
  let action;
  if (idx === -1){ liked.push(ideaId); action = 1; } else { liked.splice(idx,1); action = -1; }
  writeJSON('kidii_likes', liked);

  const updated = ideas.map(i => {
    if(i.id === ideaId) i.likes = Math.max(0, (i.likes||0) + action);
    return i;
  });
  writeJSON('kidii_ideas', updated);

  if (buttonEl){
    buttonEl.classList.toggle('liked', action === 1);
    const countSpan = buttonEl.querySelector('.likes-count');
    if (countSpan){
      const idea = updated.find(x => x.id === ideaId);
      countSpan.textContent = idea.likes || 0;
      // micro animation
      buttonEl.animate([{ transform:'scale(1)' }, { transform:'scale(1.12)' }, { transform:'scale(1)'}], { duration:240, easing:'ease-out' });
    }
  }
}

/* Render ideas list (for #featuredIdeas and #ideasList) */
function renderIdeasList(containerSelector, options = {}){
  const container = document.querySelector(containerSelector);
  if(!container) return;
  container.innerHTML = '';
  const ideas = readJSON('kidii_ideas', []);
  const max = options.max || ideas.length;
  ideas.slice(0, max).forEach(idea => {
    const el = document.createElement('article');
    el.className = options.cardClass || 'card';
    el.setAttribute('data-id', idea.id);
    el.innerHTML = `
      <h3>${escapeHtml(idea.title)}</h3>
      <p class="muted">${escapeHtml(idea.desc)}</p>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
        <span class="badge">${escapeHtml(idea.category||'General')}</span>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-light like-btn" data-id="${idea.id}" aria-pressed="${(readJSON('kidii_likes',[]).includes(idea.id))? 'true':'false'}">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-8-6.7-8-11.2C4 6.1 6.6 4 9.2 4c1.7 0 2.8 1 2.8 1s1.1-1 2.8-1C17.4 4 20 6.1 20 9.8 20 14.3 12 21 12 21z"/></svg>
            <span class="likes-count">${idea.likes||0}</span>
          </button>
          <button class="btn btn-ghost view-btn" data-id="${idea.id}">View</button>
        </div>
      </div>`;
    container.appendChild(el);
  });

  // Attach handlers
  container.querySelectorAll('.like-btn').forEach(b => {
    b.addEventListener('click', (e) => {
      e.preventDefault(); const id = b.dataset.id; toggleLike(id, b);
    });
  });
  container.querySelectorAll('.view-btn').forEach(b => {
    b.addEventListener('click', (e) => {
      e.preventDefault(); const id = b.dataset.id; openIdeaModal(id);
    });
  });
}

/* Idea modal */
function openIdeaModal(id){
  const ideas = readJSON('kidii_ideas', []);
  const idea = ideas.find(i => i.id === id);
  if(!idea) return;
  let m = document.getElementById('ideaModal');
  if(!m){
    m = document.createElement('div'); m.id='ideaModal'; m.className='modal'; m.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <button class="btn btn-light" id="closeModal" aria-label="Close">Close</button>
        <h2 id="modalTitle"></h2>
        <p class="muted" id="modalDesc"></p>
        <div id="modalMeta" style="margin-top:12px"></div>
      </div>`;
    document.body.appendChild(m);
    m.addEventListener('click', (ev) => {
      if(ev.target === m) closeModal();
    });
    m.querySelector('#closeModal').addEventListener('click', closeModal);
  }
  m.querySelector('#modalTitle').textContent = idea.title;
  m.querySelector('#modalDesc').textContent = idea.desc;
  m.querySelector('#modalMeta').innerHTML = `<strong>Category:</strong> ${escapeHtml(idea.category||'General')} • <strong>Likes:</strong> ${idea.likes||0}`;
  m.classList.add('open'); setTimeout(()=> m.querySelector('.modal-card').focus(), 100);
}
function closeModal(){
  const m = document.getElementById('ideaModal'); if(!m) return; m.classList.remove('open');
}

/* Submit form handler (submit.html) */
function initSubmitForm(){
  const form = document.getElementById('ideaForm');
  if(!form) return;
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const title = form.querySelector('[name=title]').value.trim();
    const category = form.querySelector('[name=category]').value.trim() || 'General';
    const desc = form.querySelector('[name=description]').value.trim();
    if(!title || !desc) { showToast('Please provide title and description.'); return; }
    const ideas = readJSON('kidii_ideas', []);
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') + '-' + Date.now();
    ideas.unshift({ id, title, category, desc, likes:0 });
    writeJSON('kidii_ideas', ideas);
    showToast('Idea submitted!');
    form.reset();
    // If the current page has the ideas list, re-render
    renderIdeasList('#ideasList', { max: 500 });
    // If featured on home
    renderIdeasList('#featuredIdeas', { max: 3 });
  });
}

/* Debates form init (debate.html) */
function initDebateForm(){
  const form = document.getElementById('debateForm');
  if(!form) return;
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const t = form.title.value?.trim();
    const b = form.body.value?.trim();
    if(!t || !b) { showToast('Enter title and body'); return; }
    const list = readJSON('kidii_debates', []);
    list.unshift({ id:'d'+Date.now(), title:t, body:b, comments:[], upvotes:0 });
    writeJSON('kidii_debates', list);
    renderDebates('#debatesList');
    form.reset();
    showToast('Debate created!');
  });
}

/* Render debates */
function renderDebates(containerSelector){
  const container = document.querySelector(containerSelector);
  if(!container) return;
  container.innerHTML = '';
  const debates = readJSON('kidii_debates', []);
  debates.forEach(d => {
    const el = document.createElement('article');
    el.className = 'card';
    el.innerHTML = `<h3>${escapeHtml(d.title)}</h3>
      <p class="muted">${escapeHtml(d.body)}</p>
      <div class="muted-2" style="margin-top:10px">${d.upvotes||0} upvotes • ${ (d.comments||[]).length } comments</div>`;
    container.appendChild(el);
  });
}

/* Initialize common things on DOM ready */
document.addEventListener('DOMContentLoaded', () => {
  // Render featured ideas on home
  renderIdeasList('#featuredIdeas', { max: 3 });

  // Render ideas page list
  renderIdeasList('#ideasList', { max: 500, cardClass:'idea-card' });

  // Render debates
  renderDebates('#debatesList');

  // init forms
  initSubmitForm();
  initDebateForm();

  // optional contact form quick UX
  const contactForm = document.getElementById('contactForm');
  if(contactForm){
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('Thanks! This is a demo site — messages not sent (no backend).');
      contactForm.reset();
    });
  }

  // focus outline improvements (keyboard)
  document.body.addEventListener('keyup', (e) => {
    if(e.key === 'Tab') document.documentElement.classList.add('user-is-tabbing');
  });
});