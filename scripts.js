// Add this at the top to handle the dropdown UI
function toggleDropdown() {
    const checkboxes = document.getElementById("checkboxes");
    checkboxes.style.display = checkboxes.style.display === "block" ? "none" : "block";
}

// Close dropdown if user clicks outside
window.onclick = function(event) {
    if (!event.target.matches('.multi-select-button') && !event.target.closest('.checkbox-dropdown')) {
        const dropdowns = document.getElementsByClassName("checkbox-dropdown");
        for (let d of dropdowns) { d.style.display = "none"; }
    }
}

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
        filterLeaderboard(); // This will now use the default checked boxes
    } catch (e) {
        console.error("Error loading grader data:", e);
        document.getElementById('leaderboard').innerHTML = '<p class="no-results">Error loading data.</p>';
    }
}

function filterLeaderboard() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    // Get all selected types into an array
    const selectedTypes = Array.from(document.querySelectorAll('#checkboxes input:checked')).map(cb => cb.value);
    
    const container = document.getElementById('leaderboard');

    let list = Object.entries(rawGradingData).map(([name, data]) => {
        let filteredScore = 0;
        let assignments = Object.entries(data.gradedAssignments)
            .filter(([key]) => {
                // Check if the assignment key starts with any of our selected types
                return selectedTypes.some(type => key.startsWith(type));
            })
            .map(([key, count]) => {
                filteredScore += count;
                return { name: key.replace(/_/g, ' '), count };
            });
        
        return { name, filteredScore, assignments };
    });

    list = list.filter(item => 
        item.name.toLowerCase().includes(searchTerm) && item.filteredScore > 0
    );

    list.sort((a, b) => b.filteredScore - a.filteredScore);

    const isSearching = searchTerm.length > 0;
    const showRank = !isSearching && list.length > 1;

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