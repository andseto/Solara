/* widgets/todaysEvents.js
 * "Today’s Events" for Google Calendar.
 * Auth: Google Identity Services (OAuth) + Calendar v3.
 * Shows ONLY events happening today (local time).
 */

(() => {
  // ===== CONFIG: paste your keys =====
  const CLIENT_ID = "YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com";
  const API_KEY   = "YOUR_API_KEY";
  const SCOPES    = "https://www.googleapis.com/auth/calendar.readonly";
  const DISCOVERY_DOC = "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest";

  // If you want to read PUBLIC calendars without OAuth, list them here and set USE_PUBLIC_ONLY = true.
  // Example: const PUBLIC_CAL_IDS = ["your_public_cal_id@group.calendar.google.com"];
  const PUBLIC_CAL_IDS = [];
  const USE_PUBLIC_ONLY = false; // set true to skip OAuth and only use PUBLIC_CAL_IDS with API key

  // ===== DOM =====
  const el = {
    item:   document.getElementById("todays-events-item"),
    body:   document.getElementById("todays-body"),
    status: document.getElementById("todays-status"),
    btnIn:  document.getElementById("todays-signin"),
    btnOut: document.getElementById("todays-signout"),
    btnRef: document.getElementById("todays-refresh"),
  };
  if (!el.item) return;

  // ===== State =====
  let tokenClient = null;
  let gapiReady = false;
  let gisReady  = false;

  // ===== Init when scripts are available =====
  function whenReady() {
    const hasGapi = typeof window.gapi !== "undefined";
    const hasGIS  = typeof window.google !== "undefined" && google.accounts && google.accounts.oauth2;
    if (hasGapi && hasGIS) {
      initGapi().then(() => {
        gapiReady = true;
        if (!USE_PUBLIC_ONLY) {
          initGis();
          gisReady = true;
          wireButtons();
          setStatus("Ready. Click Sign in.");
        } else {
          // public-only mode
          setAuthedUI(true);
          setStatus("Loading public calendars…");
          fetchAndRender();
        }
        relayoutMuuri();
      }).catch(err => {
        console.error(err);
        setStatus("Failed to load Google API.");
      });
      return true;
    }
    return false;
  }
  const wait = setInterval(() => { if (whenReady()) clearInterval(wait); }, 100);

  async function initGapi() {
    await new Promise((resolve, reject) => {
      gapi.load("client", { callback: resolve, onerror: reject });
    });
    await gapi.client.init({
      apiKey: API_KEY,
      discoveryDocs: [DISCOVERY_DOC],
    });
  }

  function initGis() {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp && resp.access_token) {
          setAuthedUI(true);
          fetchAndRender();
        } else {
          setAuthedUI(false);
        }
      },
    });
  }

  function wireButtons() {
    el.btnIn.addEventListener("click", () => {
      if (!(gapiReady && gisReady)) return;
      tokenClient.requestAccessToken({ prompt: "consent" });
    });
    el.btnOut.addEventListener("click", () => {
      const token = gapi.client.getToken();
      if (token && token.access_token) {
        google.accounts.oauth2.revoke(token.access_token, () => {
          gapi.client.setToken("");
          setAuthedUI(false);
          renderEmpty();
          setStatus("Signed out.");
          relayoutMuuri();
        });
      } else {
        setAuthedUI(false);
        renderEmpty();
        setStatus("Signed out.");
        relayoutMuuri();
      }
    });
    el.btnRef.addEventListener("click", fetchAndRender);
  }

  // ===== Time window: today (local) =====
  function getTodayBounds() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    // RFC3339 strings (absolute instants) in UTC:
    return { timeMin: start.toISOString(), timeMax: end.toISOString() };
  }

  // ===== Fetch + render =====
  async function fetchAndRender() {
    try {
      setStatus("Loading today’s events…");
      disable(el.btnRef, true);

      const { timeMin, timeMax } = getTodayBounds();

      let items = [];
      if (USE_PUBLIC_ONLY && PUBLIC_CAL_IDS.length) {
        // Merge events across listed public calendars (no OAuth)
        const all = await Promise.all(PUBLIC_CAL_IDS.map(calId =>
          gapi.client.calendar.events.list({
            calendarId: calId,
            timeMin, timeMax,
            showDeleted: false,
            singleEvents: true,
            orderBy: "startTime",
            maxResults: 50,
          })
        ));
        all.forEach(resp => { if (resp.result.items) items = items.concat(resp.result.items); });
      } else {
        // Private primary calendar (OAuth)
        const resp = await gapi.client.calendar.events.list({
          calendarId: "primary",
          timeMin, timeMax,
          showDeleted: false,
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 50,
        });
        items = resp.result.items || [];
      }

      // Sort by start time
      items.sort((a, b) => {
        const aStart = new Date(a.start.dateTime || (a.start.date + "T00:00:00"));
        const bStart = new Date(b.start.dateTime || (b.start.date + "T00:00:00"));
        return aStart - bStart;
      });

      renderList(items);
      setStatus(items.length ? `Today: ${items.length} event${items.length>1?"s":""}.` : "No events today.");
      relayoutMuuri();
    } catch (e) {
      console.error(e);
      if (e.status === 401 || e.status === 403) {
        setStatus("Authorization required. Click Sign in.");
        setAuthedUI(false);
      } else {
        setStatus("Failed to load events.");
      }
    } finally {
      disable(el.btnRef, false);
    }
  }

  function renderList(events) {
    if (!events.length) { renderEmpty(); return; }

    const html = `
      <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px;">
        ${events.map(ev => {
          const startISO = ev.start.dateTime || (ev.start.date + "T00:00:00");
          const endISO   = ev.end.dateTime   || (ev.end.date + "T00:00:00");
          const start    = new Date(startISO);
          const end      = new Date(endISO);

          const timeStr  = ev.start.dateTime
            ? `${start.toLocaleTimeString(undefined, { hour:"numeric", minute:"2-digit" })}–${end.toLocaleTimeString(undefined, { hour:"numeric", minute:"2-digit" })}`
            : "All day";

          const title    = escapeHtml(ev.summary || "(No title)");
          const loc      = ev.location ? `<div style="opacity:.85; font-size:.9rem;">${escapeHtml(ev.location)}</div>` : "";
          const link     = ev.htmlLink ? `<a href="${ev.htmlLink}" target="_blank" rel="noopener" style="text-decoration:underline; font-size:.9rem;">Open</a>` : "";

          return `
            <li style="display:grid; grid-template-columns: 110px 1fr; gap:10px; border-bottom:1px solid rgba(0,0,0,0.1); padding:6px 0;">
              <div style="font-weight:600;">${timeStr}</div>
              <div>
                <div style="font-weight:600; line-height:1.2;" title="${title}">${title}</div>
                ${loc}
                ${link}
              </div>
            </li>
          `;
        }).join("")}
      </ul>
    `;
    el.body.innerHTML = html;
  }

  function renderEmpty() {
    el.body.innerHTML = `<p class="placeholder">No events today.</p>`;
  }

  // ===== UI helpers =====
  function setAuthedUI(on) {
    if (!USE_PUBLIC_ONLY) {
      el.btnIn.disabled  = on;
      el.btnOut.disabled = !on;
      el.btnRef.disabled = !on;
    } else {
      // public-only mode: hide auth buttons
      el.btnIn.style.display = "none";
      el.btnOut.style.display = "none";
      el.btnRef.disabled = false;
    }
  }
  function setStatus(msg) { if (el.status) el.status.textContent = msg; }
  function disable(node, val) { if (node) node.disabled = !!val; }
  function escapeHtml(s) {
    return (s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }
  function relayoutMuuri() {
    try {
      if (window.grid && typeof window.grid.refreshItems === "function") {
        window.grid.refreshItems().layout();
      }
    } catch (_) {}
  }
})();
