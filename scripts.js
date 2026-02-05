let rawGradingData = {};

/**
 * UI Logic: Toggle the visibility of the custom checkbox dropdown
 */
function toggleDropdown(event) {
    event.stopPropagation();
    const options = document.getElementById("checkboxes");
    options.classList.toggle("show");
}

/**
 * UI Logic: Close dropdown if user clicks outside
 */
window.onclick = function(event) {
    if (!event.target.closest('.custom-select-wrapper')) {
        document.getElementById("checkboxes").classList.remove("show");
    }
}

/**
 * Updates the label text in the dropdown and refreshes the leaderboard
 */
function updateFilters() {
    const checked = Array.from(document.querySelectorAll('#checkboxes input:checked'));
    const label = document.getElementById('select-label');
    
    if (checked.length === 0) {
        label.innerText = "None Selected";
    } else if (checked.length === 1) {
        label.innerText = checked[0].parentElement.textContent.trim();
    } else {
        label.innerText = `${checked[0].parentElement.textContent.trim()} + ${checked.length - 1} more`;
    }
    
    filterLeaderboard();
}

/**
 * Initial data load
 */
async function loadData() {
    try {
        const response = await fetch('./data/graders.json');
        const lastModified = response.headers.get('Last-Modified');
        if (lastModified) {
            const date = new Date(lastModified);
            document.getElementById('last-update').innerText = `Last Updated: ${date.toLocaleString()}`;
        }

        rawGradingData = await response.json();
        updateTeamStats();
        updateFilters(); // Triggers first filter based on defaults
    } catch (e) {
        console.error("Error loading grader data:", e);
        document.getElementById('leaderboard').innerHTML = '<p class="no-results">Error loading data.</p>';
    }
}

/**
 * Total fields graded across all categories
 */
function updateTeamStats() {
    const total = Object.values(rawGradingData).reduce((sum, grader) => 
        sum + (grader.statistics.totalGradedFields || 0), 0);
    document.getElementById('total-count').innerText = `${total.toLocaleString()} Fields`;
}

/**
 * Main logic for filtering, sorting, and rendering
 */
function filterLeaderboard() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const selectedTypes = Array.from(document.querySelectorAll('#checkboxes input:checked')).map(cb => cb.value);
    const container = document.getElementById('leaderboard');

    // 1. Process Data based on multiple selected types
    let list = Object.entries(rawGradingData).map(([name, data]) => {
        let filteredScore = 0;
        let assignments = Object.entries(data.gradedAssignments)
            .filter(([key]) => selectedTypes.some(type => key.startsWith(type)))
            .map(([key, count]) => {
                filteredScore += count;
                return { name: key.replace(/_/g, ' '), count };
            });
        
        return { name, filteredScore, assignments };
    });

    // 2. Filter by search and ensure score > 0
    list = list.filter(item => 
        item.name.toLowerCase().includes(searchTerm) && item.filteredScore > 0
    );

    // 3. Sort Descending
    list.sort((a, b) => b.filteredScore - a.filteredScore);

    const isSearching = searchTerm.length > 0;
    const showRank = !isSearching && list.length > 1;

    // 4. Render
    container.innerHTML = '';
    if (list.length === 0) {
        container.innerHTML = '<p class="no-results">No matching records found.</p>';
        return;
    }

    list.forEach((grader, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'leaderboard-wrapper';
        
        const isTopThree = showRank && index < 3;
        const row = document.createElement('div');
        row.className = `leaderboard-item ${isTopThree ? 'rank-' + (index + 1) : ''} ${isSearching ? 'profile-mode' : ''}`;
        
        row.innerHTML = `
            <div class="rank">${showRank ? '#' + (index + 1) : '👤'}</div>
            <div class="name">${grader.name}</div>
            <div class="score"><strong>${grader.filteredScore.toLocaleString()}</strong> fields</div>
        `;

        const details = document.createElement('div');
        details.className = `details ${isSearching ? 'open' : ''}`;
        
        const assignmentRows = grader.assignments
            .map(a => `<li><span>${a.name}</span> <strong>${a.count}</strong></li>`)
            .join('');
            
        details.innerHTML = `<ul>${assignmentRows}</ul>`;
        row.onclick = () => details.classList.toggle('open');
        
        wrapper.appendChild(row);
        wrapper.appendChild(details);
        container.appendChild(wrapper);
    });
}

window.onload = loadData;