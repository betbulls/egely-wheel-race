import * as auth from './auth.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function avatarHtml(url, name){
  if(url) return `<img src="${esc(url)}" alt="">`;
  return `<span class="avatar-initial">${esc((name || '?').charAt(0).toUpperCase())}</span>`;
}

// Public-facing "invitation" page reached via a practitioner's shared link.
export function mount(el, handle){
  el.innerHTML = `<div id="cnBody"><div class="empty">Loading…</div></div>`;
  const body = el.querySelector('#cnBody');
  let unsubAuth = null;

  (async () => {
    const pr = handle ? await auth.getPractitionerByHandle(handle) : null;
    if(!pr || !pr.is_practitioner){
      body.innerHTML = `
        <div class="connect-card">
          <h1 class="connect-title">Link not found</h1>
          <p class="connect-lead">This connection link isn't active. Please ask for an up-to-date link.</p>
        </div>`;
      return;
    }

    const name = pr.display_name || 'A Spiritual Maker';
    body.innerHTML = `
      <div class="connect-card">
        <div class="connect-avatar">${avatarHtml(pr.avatar_url, name)}</div>
        <div class="connect-eyebrow">A guided connection with</div>
        <h1 class="connect-title">${esc(name)}</h1>
        ${pr.bio ? `<p class="connect-bio">${esc(pr.bio)}</p>` : ''}
        <div class="connect-what">
          <h2>What happens when you connect</h2>
          <p>${esc(name)} will accompany your journey — following your saved measurements,
          your curves and how your energy develops over time, including your live measurements.</p>
          <p class="connect-control">This isn't a data hand-off. You stay in control, and you can
          end the connection anytime from your profile.</p>
        </div>
        <div class="connect-action" id="cnAction"></div>
      </div>`;

    const action = el.querySelector('#cnAction');

    async function renderAction(){
      const a = auth.getState();
      if(!a.user){
        action.innerHTML = `
          <p class="connect-note">Log in to connect — watching the leaderboards is always free.</p>
          <button class="btn-join" id="cnLogin">Log in to connect</button>`;
        action.querySelector('#cnLogin').addEventListener('click', () => {
          // Remember the intent so we can finish the connection right after login.
          try { localStorage.setItem('ewr_pending_connect', handle); } catch {}
          location.hash = '#/login';
        });
        return;
      }
      if(a.user.id === pr.id){
        action.innerHTML = `<p class="connect-note">This is your own connection link. Share it with your members.</p>`;
        return;
      }
      action.innerHTML = `<div class="empty">Checking…</div>`;
      // Came back from logging in via this link → connect automatically.
      let pending = null;
      try { pending = localStorage.getItem('ewr_pending_connect'); } catch {}
      if(pending === handle){
        try { localStorage.removeItem('ewr_pending_connect'); } catch {}
        await auth.connectToPractitioner(pr.id);
      }
      const connected = await auth.isConnectedTo(pr.id);
      if(connected){
        action.innerHTML = `
          <p class="connect-note ok">✓ You're connected with ${esc(name)}.</p>
          <button class="btn-secondary" id="cnDisconnect">End connection</button>
          <span class="form-msg" id="cnMsg"></span>`;
        action.querySelector('#cnDisconnect').addEventListener('click', async () => {
          const btn = action.querySelector('#cnDisconnect'); btn.disabled = true;
          const { error } = await auth.disconnectPractitioner(pr.id);
          if(error){ btn.disabled = false; action.querySelector('#cnMsg').className = 'form-msg err'; action.querySelector('#cnMsg').textContent = 'Error: ' + error.message; return; }
          renderAction();
        });
      } else {
        action.innerHTML = `
          <button class="btn-join" id="cnConnect">Connect with ${esc(name)}</button>
          <span class="form-msg" id="cnMsg"></span>`;
        action.querySelector('#cnConnect').addEventListener('click', async () => {
          const btn = action.querySelector('#cnConnect'); btn.disabled = true;
          const { error } = await auth.connectToPractitioner(pr.id);
          if(error){ btn.disabled = false; action.querySelector('#cnMsg').className = 'form-msg err'; action.querySelector('#cnMsg').textContent = 'Error: ' + error.message; return; }
          renderAction();
        });
      }
    }

    // Re-render the action when auth state resolves (e.g. on a fresh page load).
    unsubAuth = auth.subscribeAuth(() => renderAction());
  })();

  return () => { if(unsubAuth) unsubAuth(); };
}
