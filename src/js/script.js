// =============================
// Solara Dashboard - script.js
// =============================

// ---------- CLOCK ----------
function updateClock() {
  const now = new Date();

  // Format time 12h with AM/PM like your original
  let hours24 = now.getHours();
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  const ampm = hours24 >= 12 ? 'P.M' : 'A.M';

  const hours = String(hours12).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const clockEl = document.getElementById('clock');
  if (clockEl) clockEl.textContent = `${hours}:${minutes}:${seconds} ${ampm}`;

  // Format date
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateString = now.toLocaleDateString('en-US', options);

  const dateEl = document.getElementById('date');
  if (dateEl) dateEl.textContent = dateString;
}
updateClock();
setInterval(updateClock, 1000);

// ---------- WEATHER ----------
async function fetchWeather() {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${CONFIG.CITY},${CONFIG.STATE},${CONFIG.COUNTRY}&appid=${CONFIG.OPENWEATHER_API_KEY}&units=${CONFIG.UNITS}`;

    const response = await fetch(url);
    const data = await response.json();

    if (response.ok) {
      updateWeatherDisplay(data);
    } else {
      console.error('Weather API error:', data.message);
      const cond = document.querySelector('.condition');
      if (cond) cond.textContent = 'Unable to load weather';
    }
  } catch (error) {
    console.error('Error fetching weather:', error);
    const cond = document.querySelector('.condition');
    if (cond) cond.textContent = 'Connection error';
  }
}

function updateWeatherDisplay(data) {
  const temp = Math.round(data.main.temp);
  const high = Math.round(data.main.temp_max);
  const low = Math.round(data.main.temp_min);
  const condition = data.weather[0].main;

  const tEl = document.querySelector('.temperature');
  const cEl = document.querySelector('.condition');
  const dEl = document.querySelector('.weather-details span');

  if (tEl) tEl.textContent = `${temp}°`;
  if (cEl) cEl.textContent = condition;
  if (dEl) dEl.textContent = `High: ${high}° Low: ${low}°`;

  // If weather box height changed, refresh layout
  try { if (window.grid?.refreshItems) window.grid.refreshItems().layout(); } catch (_) {}
}

function updateWeatherLocation() {
  const locationText = `${CONFIG.CITY}, ${CONFIG.STATE}`;
  const locEl = document.getElementById('weather-location');
  if (locEl) locEl.textContent = locationText;
}

// Fetch weather on load and every 10 minutes
updateWeatherLocation();
fetchWeather();
setInterval(fetchWeather, 600000); // 10 minutes

// ---------- OPTIONAL: Align card heights per row (kept from your code) ----------
function alignRowHeights() {
  if (!window.grid) return;
  const items = grid.getItems();
  const rows = {};

  // Reset all card heights first
  items.forEach(item => {
    const cardContent = item.getElement().querySelector('.card-content');
    if (cardContent) cardContent.style.minHeight = '';
  });

  // Group items by Y (row)
  items.forEach(item => {
    const top = Math.round(item.getPosition().top);
    if (!rows[top]) rows[top] = [];
    rows[top].push(item);
  });

  // Match tallest in each row
  Object.values(rows).forEach(rowItems => {
    let maxHeight = 0;
    rowItems.forEach(item => { maxHeight = Math.max(maxHeight, item.getHeight()); });
    rowItems.forEach(item => {
      const cardContent = item.getElement().querySelector('.card-content');
      if (cardContent) cardContent.style.minHeight = (maxHeight - 20) + 'px'; // -20 for padding
    });
  });

  grid.refreshItems().layout();
}

// ---------- GRID / DRAG ----------
let grid;

function initializeGrid() {
  // Single Muuri instance with your options + handle
  grid = new Muuri('.grid', {
    items: '.card-item',
    dragEnabled: true,
    dragStartPredicate: {
      handle: '.drag-handle',
      distance: 0, // start instantly
      delay: 0
    },
    dragSortHeuristics: {
      sortInterval: 50,
      minDragDistance: 10,
      minBounceBackAngle: Math.PI / 2
    },
    dragPlaceholder: {
      enabled: true,
      createElement: function (item) {
        const element = document.createElement('div');
        element.style.height = item.getHeight() + 'px';
        element.style.width = item.getWidth() + 'px';
        const m = item.getMargin();
        element.style.margin = `${m.top}px ${m.right}px ${m.bottom}px ${m.left}px`;
        element.style.background = 'rgba(0, 0, 0, 0.05)';
        element.style.borderRadius = '20px';
        return element;
      }
    },
    layout: {
      fillGaps: false,
      horizontal: false,
      alignRight: false,
      alignBottom: false,
      rounding: true
    },
    layoutDuration: 300,
    layoutEasing: 'ease'
  });

  // Save layout after drag
  grid.on('dragEnd', function (item) {
    item.getElement().classList.remove('is-dragging', 'arming');
    saveLayout();
  });

  // Prevent default selection/scroll when starting on the handle
  document.addEventListener('mousedown', (e) => {
    const handle = e.target.closest('.drag-handle');
    if (!handle) return;

    e.preventDefault();

    // Arm the card immediately so iframe can't steal events before dragStart
    const itemEl = handle.closest('.card-item');
    if (itemEl) {
      itemEl.classList.add('arming');
      const stopArming = () => {
        itemEl.classList.remove('arming');
        document.removeEventListener('mouseup', stopArming, true);
      };
      document.addEventListener('mouseup', stopArming, true);
    }
  });

  // Toggle iframe hit-testing during drag
  grid.on('dragStart', (item) => {
    const el = item.getElement();
    el.classList.add('is-dragging');
    el.classList.remove('arming');
  });
  grid.on('dragCancel', (item) => {
    const el = item.getElement();
    el.classList.remove('is-dragging', 'arming');
  });

  // (Optional) keep row heights aligned after layout
  grid.on('layoutEnd', () => {
    // alignRowHeights(); // enable if you really want uniform rows
  });

  // If calendar iframe present, refresh layout when it finishes loading
  const cal = document.querySelector('.calendar-card iframe');
  if (cal) {
    cal.addEventListener('load', () => {
      try { grid.refreshItems().layout(); } catch (_) {}
    });
  }

  // If you add cards dynamically later, you can grid.add(newEl) then layout.
}

// Save current layout to localStorage (you had a placeholder approach)
function saveLayout() {
  if (!grid) return;
  const layout = grid.getItems().map(item => item.getElement().innerHTML);
  try {
    localStorage.setItem('solaraLayout', JSON.stringify(layout));
  } catch (e) {
    console.warn('Could not save layout:', e);
  }
}

// Load layout (placeholder hook)
function loadLayout() {
  const savedLayout = localStorage.getItem('solaraLayout');
  if (savedLayout) {
    console.log('Layout loaded from storage');
    // You can implement reconstructing items from savedLayout if you want persistence.
  }
}

// ---------- BOOT ----------
document.addEventListener('DOMContentLoaded', function () {
  initializeGrid();
  loadLayout();
  console.log('Solara Dashboard initialized with draggable cards!');
});

// If you need to add a “Today’s Events” card dynamically later, do it AFTER grid init:
// const el = document.getElementById('todays-events-item');
// if (el) grid.add(el);
