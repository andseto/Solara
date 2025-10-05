// Update clock every second
function updateClock() {
    const now = new Date();
    
    // Format time
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    document.getElementById('clock').textContent = `${hours}:${minutes}:${seconds}`;
    
    // Format date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('en-US', options);
    
    document.getElementById('date').textContent = dateString;
}

// Update immediately and then every second
updateClock();
setInterval(updateClock, 1000);

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
            fillGaps: true,
            horizontal: false,
            alignRight: false,
            alignBottom: false,
            rounding: true
        }
    });

    // Save layout to localStorage when items are moved
    grid.on('dragEnd', function () {
        saveLayout();
    });

    // Load saved layout if it exists
    loadLayout();
}

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
        // Layout loaded - you can implement custom ordering here if needed
        console.log('Layout loaded from storage');
    }
}

// Initialize the grid when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeGrid();
    console.log('Solara Dashboard initialized with draggable cards!');
});