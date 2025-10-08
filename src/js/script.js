// Update clock every second
function updateClock() {
    const now = new Date();
    
    // Format time
    let hours24 = now.getHours();
    let hours12 = hours24 % 12;
    if (hours12 == 0) hours12 = 12;
    const ampm = hours24 >= 12 ? 'P.M' : 'A.M';

    const hours = String(hours12).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    document.getElementById('clock').textContent = `${hours}:${minutes}:${seconds} ${ampm}`;
    
    // Format date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('en-US', options);

    document.getElementById('date').textContent = dateString;
}

// Update immediately and then every second
updateClock();
setInterval(updateClock, 1000);

// Fetch weather data
async function fetchWeather() {
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${CONFIG.CITY},${CONFIG.STATE},${CONFIG.COUNTRY}&appid=${CONFIG.OPENWEATHER_API_KEY}&units=${CONFIG.UNITS}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (response.ok) {
            updateWeatherDisplay(data);
        } else {
            console.error('Weather API error:', data.message);
            document.querySelector('.condition').textContent = 'Unable to load weather';
        }
    } catch (error) {
        console.error('Error fetching weather:', error);
        document.querySelector('.condition').textContent = 'Connection error';
    }
}

// Update weather display with fetched data
function updateWeatherDisplay(data) {
    const temp = Math.round(data.main.temp);
    const high = Math.round(data.main.temp_max);
    const low = Math.round(data.main.temp_min);
    const condition = data.weather[0].main;
    
    document.querySelector('.temperature').textContent = `${temp}°`;
    document.querySelector('.condition').textContent = condition;
    document.querySelector('.weather-details span').textContent = `High: ${high}° Low: ${low}°`;
}

// Update weather location from config
function updateWeatherLocation() {
    const locationText = `${CONFIG.CITY}, ${CONFIG.STATE}`;
    document.getElementById('weather-location').textContent = locationText;
}

// Fetch weather on load and every 10 minutes
updateWeatherLocation();
fetchWeather();
setInterval(fetchWeather, 600000); // 600000ms = 10 minutes

// Align card heights within each row
function alignRowHeights() {
    const items = grid.getItems();
    const rows = {};
    
    // Reset all card heights first
    items.forEach(item => {
        const cardContent = item.getElement().querySelector('.card-content');
        cardContent.style.minHeight = '';
    });
    
    // Group items by their Y position (row)
    items.forEach(item => {
        const top = Math.round(item.getPosition().top);
        if (!rows[top]) {
            rows[top] = [];
        }
        rows[top].push(item);
    });
    
    // For each row, set all cards to match the tallest card
    Object.values(rows).forEach(rowItems => {
        let maxHeight = 0;
        
        // Find tallest card in row
        rowItems.forEach(item => {
            const height = item.getHeight();
            if (height > maxHeight) {
                maxHeight = height;
            }
        });
        
        // Set all cards in row to that height
        rowItems.forEach(item => {
            const cardContent = item.getElement().querySelector('.card-content');
            cardContent.style.minHeight = (maxHeight - 20) + 'px'; // -20 for padding
        });
    });
    
    // Refresh layout after height changes
    grid.refreshItems().layout();
}

// Initialize Muuri grid for draggable cards
let grid;

function initializeGrid() {
    grid = new Muuri('.grid', {
        items: '.card-item',
        dragEnabled: true,
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
                element.style.margin = item.getMargin().top + 'px ' + item.getMargin().right + 'px ' + 
                                      item.getMargin().bottom + 'px ' + item.getMargin().left + 'px';
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

    // Save layout to localStorage when items are moved
    grid.on('dragEnd', function () {
        saveLayout();
    });

    // Load saved layout if it exists
    loadLayout();
}

const el = document.getElementById('todays-events-item');
if (window.grid && el) window.grid.add(el);

// Save the current layout to localStorage
function saveLayout() {
    const layout = grid.getItems().map(item => {
        return item.getElement().innerHTML;
    });
    localStorage.setItem('solaraLayout', JSON.stringify(layout));
}

// Load layout from localStorage
function loadLayout() {
    const savedLayout = localStorage.getItem('solaraLayout');
    if (savedLayout) {
        console.log('Layout loaded from storage');
    }
}

// Initialize the grid when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeGrid();
    console.log('Solara Dashboard initialized with draggable cards!');
});