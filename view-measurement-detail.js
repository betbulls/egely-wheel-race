import { supabase } from './db.js';
import * as auth from './auth.js';
import { vitalityLevel, trendLabel } from './analytics.js';
import { drawTrio } from './chart.js';
import { mountCurveReplay } from './replay.js';
import { mountVideoShare } from './video-share.js';
import { fetchRecordingPlayback, mountVoicePlayer } from './voice.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

// Muted vitality-zone colour for NUMBER TEXT on light surfaces — the vivid
// vColor yellow is unreadable on white. (Chart lines/zone bars keep vivid.)
const zText = v => v < 6 ? '#c2415b' : v < 13 ? '#b8860b' : '#0f8a52';

function avatarHtml(url, name){
  if(url) return `<img src="${esc(url)}" alt="">`;
  return `<span class="avatar-initial">${esc((name || '?').charAt(0).toUpperCase())}</span>`;
}

// Read-only detail of a single stored measurement.
export function mount(el, id){
  if(!document.getElementById('meRaceKindStyle')){
    const st = document.createElement('style'); st.id = 'meRaceKindStyle';
    st.textContent = `.me-kind.race{color:#5230da;background:rgba(82,48,218,.1)}`;
    document.head.appendChild(st);
  }
  el.innerHTML = `
    <div class="view-head">
      <p class="room-hint" style="text-align:left;margin:0 0 6px" id="dBack"></p>
      <h1 class="page-title" id="dTitle">Loading…</h1>
      <div id="dClient"></div>
    </div>
    <div id="dPulse"></div>
    <div id="dBody"><div class="empty">Loading…</div></div>
  `;

  let onResize = null;
  let onResizeTrio = null;
  let replay = null;       // curve replay cockpit (replay.js)
  let videoShare = null;   // "Share as video" block (solo only)
  let voicePlayer = null;  // "Listen again" recording card (solo only)
  let disposed = false;    // the async load must not build UI into a dead view

  (async () => {
    const { data: r, error } = await supabase.from('results').select('*').eq('id', Number(id)).single();
    if(disposed) return;
    if(error || !r){ el.querySelector('#dBody').innerHTML = '<div class="empty">Measurement not found.</div>'; return; }

    // Set the back link in context: own measurement → My measurements;
    // a client's measurement (viewed by their practitioner) → that client.
    const me = auth.getState();
    const isClientView = !!(me.user && r.user_id && r.user_id !== me.user.id);
    let clientProf = null;
    if(isClientView){
      const { data: prof } = await supabase.from('profiles')
        .select('id, display_name, avatar_url').eq('id', r.user_id).maybeSingle();
      if(disposed) return;
      clientProf = prof || null;
      const cname = (clientProf && clientProf.display_name) || 'Member';
      el.querySelector('#dBack').innerHTML = `<a href="#/clients/${esc(r.user_id)}" class="link">← ${esc(cname)}</a>`;
      el.querySelector('#dClient').innerHTML = `
        <div class="d-client-chip">
          <span class="d-client-avatar">${avatarHtml(clientProf && clientProf.avatar_url, cname)}</span>
          <span class="d-client-name">${esc(cname)}'s measurement</span>
        </div>`;
    } else {
      el.querySelector('#dBack').innerHTML = `<a href="#/me" class="link">← My measurements</a>`;
    }

    const isRace = r.kind === 'race';
    const solo = r.session_id == null && !isRace;
    let title = 'Solo measurement';
    if(solo){ title = r.label || 'Solo measurement'; }
    else {
      const { data: sess } = await supabase.from('sessions').select('name').eq('id', r.session_id).single();
      if(disposed) return;
      title = (sess && sess.name) || (isRace ? 'Race' : 'Session');
    }
    el.querySelector('#dTitle').textContent = title;

    // Race result → a compact race-context strip + a link back to the full results
    // (the podium/standings live on the race page). No "Session pulse" — a race is
    // not a session.
    if(isRace){
      el.querySelector('#dPulse').innerHTML = `
        <div class="panel" style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:14px">
          <div style="display:flex;align-items:center;gap:24px">
            <div><div style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:22px;color:#011624">${r.final_rank != null ? '#' + r.final_rank : '—'}</div>
              <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#99a2a7">${r.final_rank != null ? 'Final place' : 'Unranked'}</div></div>
            <div><div style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:22px;color:#011624">${r.race_score != null ? r.race_score : '—'}</div>
              <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#99a2a7">Race score</div></div>
          </div>
          <a class="link" href="#/race/${r.session_id}">View race results →</a>
        </div>`;
    }

    // ---- Session Pulse: Host + Group + You for a finished session row ------
    if(!solo && !isRace){
      const { data: sessRows } = await supabase.from('results')
        .select('id, curve, racer_name, is_host, duration_seconds, avg, peak, steadiness')
        .eq('session_id', r.session_id);
      if(disposed) return;
      if(sessRows && sessRows.length){
        const durationMs = (r.duration_seconds || 60) * 1000;
        const maxLen = sessRows.reduce((m, rw) => Math.max(m, Array.isArray(rw.curve) ? rw.curve.length : 0), 0);
        const groupLeds = [];   // full-length; null where nobody was measuring (a gap)
        for(let i = 0; i < maxLen; i++){
          let sum = 0, n = 0;
          for(const rw of sessRows){
            const v = Array.isArray(rw.curve) ? rw.curve[i] : null;
            if(v != null){ sum += v; n++; }
          }
          groupLeds.push(n ? sum / n : null);
        }
        const hostRow = sessRows.find(rw => rw.is_host);
        // Map each bucket to its real time across the session, then drop the empty
        // (null) buckets so the line is drawn only where the racer actually measured.
        const ledsToHist = leds => {
          const n = leds.length;
          return leds.map((v, k) => ({ t: n > 1 ? (k / (n - 1)) * durationMs : 0, led: v }))
                     .filter(p => p.led != null);
        };
        const pulseHist = {
          host: hostRow && Array.isArray(hostRow.curve) ? ledsToHist(hostRow.curve) : [],
          group: groupLeds.length ? ledsToHist(groupLeds) : [],
          me: Array.isArray(r.curve) ? ledsToHist(r.curve) : [],
        };
        // Per-racer stats come from the stored summary columns (computed from the full
        // sample set at save time) — authoritative, and unaffected by the curve's time
        // bucketing. The curve drives only the drawn lines, not these numbers.
        const rowStats = rw => (rw && rw.avg != null)
          ? { avg: Number(rw.avg), peak: rw.peak, steadiness: rw.steadiness } : null;
        const hostStats = rowStats(hostRow);
        const meStats = rowStats(r);
        const withStats = sessRows.filter(rw => rw.avg != null);
        const groupStats = withStats.length ? {
          avg: withStats.reduce((s, rw) => s + Number(rw.avg), 0) / withStats.length,
          peak: Math.max(...withStats.map(rw => rw.peak || 0)),
          steadiness: Math.round(withStats.reduce((s, rw) => s + (rw.steadiness || 0), 0) / withStats.length),
        } : null;
        const fmtAvg = s => s ? s.avg.toFixed(1) : '–';
        const fmtPeak = s => s ? s.peak : '–';
        const fmtSteady = s => s ? s.steadiness : '–';
        const hostName = (hostRow && hostRow.racer_name) || 'Host';

        el.querySelector('#dPulse').innerHTML = `
          <div class="session-pulse">
            <div class="sp-head">
              <span class="sp-title">Session pulse</span>
              <div class="sp-legend">
                <span class="leg-item leg-host"><i class="leg-dot"></i>Host</span>
                <span class="leg-item leg-group"><i class="leg-dot"></i>Group</span>
                <span class="leg-item leg-me"><i class="leg-dot"></i>You</span>
              </div>
            </div>
            <canvas class="sp-chart" id="spChartMd"></canvas>
            <div class="sp-metrics">
              <div class="sp-col">
                <div class="sp-col-head leg-host"><i class="leg-dot"></i><span class="sp-col-name">${esc(hostName)}</span></div>
                <div class="sp-stats">
                  <div class="ss"><div class="ss-val">${fmtAvg(hostStats)}</div><div class="ss-lbl">Avg</div></div>
                  <div class="ss"><div class="ss-val">${fmtPeak(hostStats)}</div><div class="ss-lbl">Peak</div></div>
                  <div class="ss"><div class="ss-val">${fmtSteady(hostStats)}</div><div class="ss-lbl">Steady</div></div>
                </div>
              </div>
              <div class="sp-col">
                <div class="sp-col-head leg-group"><i class="leg-dot"></i><span class="sp-col-name">Group · ${sessRows.length} racer${sessRows.length > 1 ? 's' : ''}</span></div>
                <div class="sp-stats">
                  <div class="ss"><div class="ss-val">${fmtAvg(groupStats)}</div><div class="ss-lbl">Avg</div></div>
                  <div class="ss"><div class="ss-val">${fmtPeak(groupStats)}</div><div class="ss-lbl">Peak</div></div>
                  <div class="ss"><div class="ss-val">${fmtSteady(groupStats)}</div><div class="ss-lbl">Steady</div></div>
                </div>
              </div>
              <div class="sp-col">
                <div class="sp-col-head leg-me"><i class="leg-dot"></i><span class="sp-col-name">You</span></div>
                <div class="sp-stats">
                  <div class="ss"><div class="ss-val">${fmtAvg(meStats)}</div><div class="ss-lbl">Avg</div></div>
                  <div class="ss"><div class="ss-val">${fmtPeak(meStats)}</div><div class="ss-lbl">Peak</div></div>
                  <div class="ss"><div class="ss-val">${fmtSteady(meStats)}</div><div class="ss-lbl">Steady</div></div>
                </div>
              </div>
            </div>
          </div>`;
        onResizeTrio = () => drawTrio(el.querySelector('#spChartMd'), pulseHist, { durationMs });
        onResizeTrio();
        window.addEventListener('resize', onResizeTrio);
      }
    }

    const lvl = vitalityLevel(r.avg || 0);
    const when = new Date(r.created_at).toLocaleString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const dur = r.duration_seconds
      ? (r.duration_seconds >= 60 ? Math.round(r.duration_seconds / 60) + ' min' : r.duration_seconds + ' s')
      : '—';

    el.querySelector('#dBody').innerHTML = `
      <div class="panel">
        <div class="me-title-row" style="margin-bottom:10px">
          <span class="me-kind ${isRace ? 'race' : (solo ? 'solo' : 'session')}">${isRace ? 'Race' : (solo ? 'Solo' : 'Session')}</span>
          ${r.verified ? '<span class="v-badge verified">✓ Verified</span>' : '<span class="v-badge unverified">unverified</span>'}
        </div>
        <div class="d-meta">${esc(when)} · ${esc(dur)}</div>

        <div class="eval-level" style="color:${zText(r.avg || 0)};margin-top:16px">${esc(lvl.name)}</div>
        <div class="eval-meaning">${esc(lvl.meaning)}</div>
        ${solo ? '<div id="dVoice" hidden style="margin-top:16px"></div>' : ''}

        ${Array.isArray(r.curve) && r.curve.length > 1
          ? `<div class="solo-chart-wrap" style="margin-top:16px"><canvas id="dChart"></canvas></div>
             <div class="rp-bar" id="dReplayBar"></div>
             <div class="rp-hero" id="dReplayHero" hidden></div>`
          : '<p class="d-meta" style="margin-top:16px">No curve stored for this measurement.</p>'}

        <div class="res-stats" style="justify-content:flex-start;margin-top:18px;gap:22px">
          <div class="rs"><div class="rs-val" style="color:${zText(r.avg || 0)}">${(r.avg || 0).toFixed(1)}</div><div class="rs-lbl">Avg</div></div>
          <div class="rs"><div class="rs-val" style="color:${zText(r.peak || 0)}">${r.peak}</div><div class="rs-lbl">Peak</div></div>
          <div class="rs"><div class="rs-val">${r.steadiness}</div><div class="rs-lbl">Steady</div></div>
          <div class="rs"><div class="rs-val rs-trend">${esc(trendLabel(r.trend || 0))}</div><div class="rs-lbl">Trend</div></div>
        </div>

        <div class="zonebar" style="margin-top:16px">
          <span class="z-red" style="width:${r.zone_red || 0}%"></span>
          <span class="z-yellow" style="width:${r.zone_yellow || 0}%"></span>
          <span class="z-green" style="width:${r.zone_green || 0}%"></span>
        </div>

        ${r.comment ? `<div class="d-comment"><div class="d-comment-lbl">Comment</div><p>${esc(r.comment)}</p></div>` : ''}
        ${solo ? '<div id="dVideo"></div>' : ''}
      </div>
    `;
    // "Share as video" — solo social clip via the render worker (owner only:
    // the RLS already gates who can load this row at all).
    const vslot = el.querySelector('#dVideo');
    if(vslot) videoShare = mountVideoShare(vslot, { kind: 'solo', targetId: Number(id) });

    // Replay cockpit (replay.js) — owns all drawing on #dChart: idle = the
    // full curve (same as the old static draw), ▶ re-plays it in time with
    // the live readout (value / avg / peak / time-left) and the LED bar.
    if(Array.isArray(r.curve) && r.curve.length > 1){
      replay = mountCurveReplay({
        heroEl: el.querySelector('#dReplayHero'),
        barEl: el.querySelector('#dReplayBar'),
        canvas: el.querySelector('#dChart'),
        curve: r.curve,
        durationSeconds: r.duration_seconds || 60,
        // Solo voice: play the recording in sync with the replay (same as the
        // session/race replay). onAudio removes the standalone Listen-again card
        // so two audios never fight.
        loadAudio: solo ? (() => fetchRecordingPlayback(Number(id), 'solo')) : null,
        onAudio: () => { if(voicePlayer){ voicePlayer.destroy(); voicePlayer = null; } },
      });
      onResize = () => replay.redraw();
      window.addEventListener('resize', onResize);
    }
    // "Listen again" — the recording player (solo only); the replay's onAudio
    // takes this card over the moment playback starts there (session pattern).
    if(solo){
      const vslot = el.querySelector('#dVoice');
      if(vslot) voicePlayer = mountVoicePlayer(vslot, { sessionId: Number(id), mode: 'solo', hostName: r.racer_name || 'You' });
    }
  })();

  return () => {
    disposed = true;
    if(replay) replay.destroy();
    if(voicePlayer) voicePlayer.destroy();
    if(videoShare) videoShare.destroy();
    if(onResize) window.removeEventListener('resize', onResize);
    if(onResizeTrio) window.removeEventListener('resize', onResizeTrio);
  };
}
