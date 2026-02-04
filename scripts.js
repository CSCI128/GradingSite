let rawGradingData = {};

/**
 * Initial data load from the JSON file
 */
async function loadData() {
    try {
        const response = await fetch('./data/graders.json');
        
        // NEW: Get the last modified date from GitHub's header
        const lastModified = response.headers.get('Last-Modified');
        if (lastModified) {
            const date = new Date(lastModified);
            document.getElementById('last-update').innerText = `Last Updated: ${date.toLocaleString()}`;
        }

        rawGradingData = await response.json();
        updateTeamStats();
        filterLeaderboard();
    } catch (e) {
        console.error("Error loading grader data:", e);
        document.getElementById('leaderboard').innerHTML = '<p class="no-results">Error loading data.</p>';
    }
}

/**
 * Calculates and updates the total fields graded by the entire team
 */
function updateTeamStats() {
    const total = Object.values(rawGradingData).reduce((sum, grader) => 
        sum + (grader.statistics.totalGradedFields || 0), 0);
    document.getElementById('total-count').innerText = `${total.toLocaleString()} Fields`;
}

/**
 * Filters, sorts, and renders the leaderboard based on UI inputs
 */
function filterLeaderboard() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const typeFilter = document.getElementById('typeFilter').value;
    const container = document.getElementById('leaderboard');

    // 1. Process and Map Data
    let list = Object.entries(rawGradingData).map(([name, data]) => {
        let filteredScore = 0;
        let assignments = Object.entries(data.gradedAssignments)
            .filter(([key]) => typeFilter === "All" || key.startsWith(typeFilter))
            .map(([key, count]) => {
                filteredScore += count;
                // Clean up key: "Worksheet_1_Name" -> "Worksheet 1 Name"
                return { name: key.replace(/_/g, ' '), count };
            });
        
        return { name, filteredScore, assignments };
    });

    // 2. Filter by search term and ensure they have a score in the current category
    list = list.filter(item => 
        item.name.toLowerCase().includes(searchTerm) && item.filteredScore > 0
    );

    // 3. Sort by Score (Descending)
    list.sort((a, b) => b.filteredScore - a.filteredScore);

    // 4. UI Logic: Disable leaderboard visuals if searching
    const isSearching = searchTerm.length > 0;
    const showRank = !isSearching && list.length > 1;

    // 5. Render
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
        
        // Mode toggle: Use profile-mode styles if a search is active
        row.className = `leaderboard-item ${isTopThree ? 'rank-' + (index + 1) : ''} ${isSearching ? 'profile-mode' : ''}`;
        
        row.innerHTML = `
            <div class="rank">${showRank ? '#' + (index + 1) : '👤'}</div>
            <div class="name">${grader.name}</div>
            <div class="score"><strong>${grader.filteredScore.toLocaleString()}</strong> fields</div>
        `;

        const details = document.createElement('div');
        details.className = `details ${isSearching ? 'open' : ''}`; // Auto-expand when searching
        
        const assignmentRows = grader.assignments
            .map(a => `<li><span>${a.name}</span> <strong>${a.count}</strong></li>`)
            .join('');
            
        details.innerHTML = `<ul>${assignmentRows}</ul>`;

        // Click to toggle (ignored if auto-opened by search, but functional for list browsing)
        row.onclick = () => details.classList.toggle('open');
        
        wrapper.appendChild(row);
        wrapper.appendChild(details);
        container.appendChild(wrapper);
    });
}

// Kick off the load on page start
window.onload = loadData;