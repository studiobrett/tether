/**
 * Tether A/B Test Dashboard
 *
 * Displays study results:
 * - Summary statistics
 * - Per-case breakdown with 70% threshold visualization
 * - Individual response table
 * - Case detail modal
 * - CSV/JSON export
 */

// State
let allResponses = [];
const CASE_NAMES = {
    'case-marcus': 'Marcus (Depression)',
    'case-priya': 'Priya (Anxiety)',
    'case-jordan': 'Jordan (ADHD)',
    'case-dave': 'Dave (Alcohol)',
    'case-ethan': 'Ethan (ADHD Teen)',
    'case-lily': 'Lily (ASD Teen)'
};

const CASE_IDS = ['case-marcus', 'case-priya', 'case-jordan', 'case-dave', 'case-ethan', 'case-lily'];

// Fetch responses from Supabase
async function fetchResponses() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/responses?select=*&order=created_at.desc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        allResponses = await response.json();
        console.log('Fetched responses:', allResponses);
        return allResponses;
    } catch (error) {
        console.error('Failed to fetch responses:', error);
        return [];
    }
}

// Calculate statistics
function calculateStats(responses) {
    if (responses.length === 0) {
        return {
            total: 0,
            overallPsychometricRate: 0,
            perCaseRates: {},
            casesAboveThreshold: 0
        };
    }

    let totalComparisons = 0;
    let psychometricSelections = 0;
    const perCaseCounts = {};

    CASE_IDS.forEach(caseId => {
        perCaseCounts[caseId] = { total: 0, psychometric: 0 };
    });

    responses.forEach(response => {
        if (response.responses && Array.isArray(response.responses)) {
            response.responses.forEach(caseResponse => {
                totalComparisons++;
                if (caseResponse.selected_version === 'psychometric') {
                    psychometricSelections++;
                }

                const caseId = caseResponse.case_id;
                if (perCaseCounts[caseId]) {
                    perCaseCounts[caseId].total++;
                    if (caseResponse.selected_version === 'psychometric') {
                        perCaseCounts[caseId].psychometric++;
                    }
                }
            });
        }
    });

    const perCaseRates = {};
    let casesAboveThreshold = 0;

    CASE_IDS.forEach(caseId => {
        const counts = perCaseCounts[caseId];
        const rate = counts.total > 0 ? (counts.psychometric / counts.total) * 100 : 0;
        perCaseRates[caseId] = rate;
        if (rate >= 70) {
            casesAboveThreshold++;
        }
    });

    return {
        total: responses.length,
        overallPsychometricRate: totalComparisons > 0
            ? (psychometricSelections / totalComparisons) * 100
            : 0,
        perCaseRates,
        casesAboveThreshold
    };
}

// Render summary stats
function renderStats(stats) {
    document.getElementById('total-responses').textContent = stats.total;

    const rate = stats.overallPsychometricRate;
    const rateEl = document.getElementById('overall-preference');
    rateEl.textContent = `${rate.toFixed(1)}%`;

    const thresholdEl = document.getElementById('threshold-status');
    if (rate >= 70) {
        thresholdEl.textContent = 'PASS';
        thresholdEl.classList.add('highlight');
        thresholdEl.classList.remove('warning');
    } else {
        thresholdEl.textContent = `${(70 - rate).toFixed(1)}% below`;
        thresholdEl.classList.add('warning');
        thresholdEl.classList.remove('highlight');
    }

    document.getElementById('cases-above-threshold').textContent =
        `${stats.casesAboveThreshold}/6`;
}

// Render per-case bars
function renderCaseBars(stats) {
    const container = document.getElementById('case-bars');
    container.innerHTML = '';

    CASE_IDS.forEach(caseId => {
        const rate = stats.perCaseRates[caseId] || 0;
        const isAbove = rate >= 70;

        const item = document.createElement('div');
        item.className = 'case-bar-item';
        item.innerHTML = `
            <span class="case-bar-label">${CASE_NAMES[caseId]}</span>
            <div class="case-bar-track">
                <div class="case-bar-fill ${isAbove ? 'above-threshold' : ''}"
                     style="width: ${rate}%"></div>
                <div class="threshold-line"></div>
            </div>
            <span class="case-bar-value">${rate.toFixed(0)}%</span>
        `;

        item.addEventListener('click', () => showCaseDetail(caseId));
        item.style.cursor = 'pointer';

        container.appendChild(item);
    });
}

// Render response table
function renderTable(responses) {
    const tbody = document.getElementById('response-tbody');
    tbody.innerHTML = '';

    if (responses.length === 0) {
        document.getElementById('empty-state').style.display = 'block';
        return;
    }

    document.getElementById('empty-state').style.display = 'none';

    responses.forEach((response, index) => {
        const row = document.createElement('tr');
        row.className = 'expandable-row';

        // Format timestamp
        const date = new Date(response.created_at);
        const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        // Build case cells based on case_order
        let caseCells = '';
        let psychometricCount = 0;

        // Create a map of case responses by case_id for this response
        const responseMap = {};
        if (response.responses && Array.isArray(response.responses)) {
            response.responses.forEach(r => {
                responseMap[r.case_id] = r;
            });
        }

        // Show in the order the participant saw them (using case_order)
        const displayOrder = response.case_order || CASE_IDS;
        displayOrder.forEach((caseId, idx) => {
            const caseResponse = responseMap[caseId];
            if (caseResponse) {
                const isPsychometric = caseResponse.selected_version === 'psychometric';
                if (isPsychometric) psychometricCount++;
                const cellClass = isPsychometric ? 'cell-psychometric' : 'cell-logistics';
                const abbrev = isPsychometric ? 'P' : 'L';
                caseCells += `<td class="${cellClass}" title="${caseResponse.reasoning}">${abbrev}</td>`;
            } else {
                caseCells += '<td>-</td>';
            }
        });

        row.innerHTML = `
            <td>${timeStr}</td>
            <td>${response.participant_role || '-'}</td>
            <td>${response.participant_specialty || '-'}</td>
            ${caseCells}
            <td><strong>${psychometricCount}/6</strong></td>
        `;

        row.addEventListener('click', () => toggleExpandedRow(response, row));
        tbody.appendChild(row);
    });
}

// Toggle expanded row with full reasoning
function toggleExpandedRow(response, clickedRow) {
    // Check if already expanded
    const existingExpanded = clickedRow.nextElementSibling;
    if (existingExpanded && existingExpanded.classList.contains('expanded-content')) {
        existingExpanded.remove();
        return;
    }

    // Remove any other expanded rows
    document.querySelectorAll('.expanded-content').forEach(el => el.remove());

    // Create expanded row
    const expandedRow = document.createElement('tr');
    expandedRow.className = 'expanded-content visible';

    let reasoningHtml = '<td colspan="10" style="padding: 1rem;">';
    reasoningHtml += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">';

    const responseMap = {};
    if (response.responses && Array.isArray(response.responses)) {
        response.responses.forEach(r => {
            responseMap[r.case_id] = r;
        });
    }

    const displayOrder = response.case_order || CASE_IDS;
    displayOrder.forEach((caseId, idx) => {
        const caseResponse = responseMap[caseId];
        if (caseResponse) {
            const isPsychometric = caseResponse.selected_version === 'psychometric';
            reasoningHtml += `
                <div class="reasoning-item">
                    <div class="selected-label ${isPsychometric ? 'psychometric' : 'logistics'}">
                        Case ${idx + 1}: ${CASE_NAMES[caseId]} - ${isPsychometric ? 'Psychometric' : 'Logistics'}
                    </div>
                    <p>${caseResponse.reasoning}</p>
                </div>
            `;
        }
    });

    reasoningHtml += '</div></td>';
    expandedRow.innerHTML = reasoningHtml;

    clickedRow.after(expandedRow);
}

// Show case detail modal
function showCaseDetail(caseId) {
    const modal = document.getElementById('case-detail-modal');
    modal.classList.add('visible');

    document.getElementById('modal-case-title').textContent = CASE_NAMES[caseId];

    // Collect all responses for this case
    const caseResponses = [];
    allResponses.forEach(response => {
        if (response.responses && Array.isArray(response.responses)) {
            const found = response.responses.find(r => r.case_id === caseId);
            if (found) {
                caseResponses.push({
                    ...found,
                    participant_role: response.participant_role
                });
            }
        }
    });

    const psychometric = caseResponses.filter(r => r.selected_version === 'psychometric');
    const logistics = caseResponses.filter(r => r.selected_version === 'logistics');

    document.getElementById('modal-psychometric-count').textContent = psychometric.length;
    document.getElementById('modal-logistics-count').textContent = logistics.length;

    // Render reasoning lists
    document.getElementById('modal-psychometric-reasoning').innerHTML =
        psychometric.length > 0
            ? psychometric.map(r => `
                <div class="reasoning-item">
                    <div class="selected-label psychometric">${r.participant_role}</div>
                    <p>${r.reasoning}</p>
                </div>
            `).join('')
            : '<p style="color: var(--text-muted);">No psychometric selections</p>';

    document.getElementById('modal-logistics-reasoning').innerHTML =
        logistics.length > 0
            ? logistics.map(r => `
                <div class="reasoning-item">
                    <div class="selected-label logistics">${r.participant_role}</div>
                    <p>${r.reasoning}</p>
                </div>
            `).join('')
            : '<p style="color: var(--text-muted);">No logistics selections</p>';
}

// Close modal
function closeModal() {
    document.getElementById('case-detail-modal').classList.remove('visible');
}

// Export to CSV
function exportCSV() {
    if (allResponses.length === 0) {
        alert('No data to export');
        return;
    }

    let csv = 'timestamp,session_id,role,specialty,';
    CASE_IDS.forEach((id, idx) => {
        csv += `case_${idx + 1}_id,case_${idx + 1}_selected,case_${idx + 1}_reasoning,`;
    });
    csv += 'psychometric_count\n';

    allResponses.forEach(response => {
        const responseMap = {};
        let psychometricCount = 0;

        if (response.responses && Array.isArray(response.responses)) {
            response.responses.forEach(r => {
                responseMap[r.case_id] = r;
                if (r.selected_version === 'psychometric') psychometricCount++;
            });
        }

        let row = `"${response.created_at}","${response.session_id}","${response.participant_role || ''}","${response.participant_specialty || ''}",`;

        const displayOrder = response.case_order || CASE_IDS;
        displayOrder.forEach(caseId => {
            const caseResponse = responseMap[caseId];
            if (caseResponse) {
                const reasoning = (caseResponse.reasoning || '').replace(/"/g, '""');
                row += `"${caseId}","${caseResponse.selected_version}","${reasoning}",`;
            } else {
                row += ',,,'
            }
        });

        row += psychometricCount;
        csv += row + '\n';
    });

    downloadFile(csv, 'tether-study-results.csv', 'text/csv');
}

// Export to JSON
function exportJSON() {
    if (allResponses.length === 0) {
        alert('No data to export');
        return;
    }

    const json = JSON.stringify(allResponses, null, 2);
    downloadFile(json, 'tether-study-results.json', 'application/json');
}

// Download file helper
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Refresh data
async function refreshData() {
    const btn = document.getElementById('refresh-data');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span>';

    const responses = await fetchResponses();
    const stats = calculateStats(responses);

    renderStats(stats);
    renderCaseBars(stats);
    renderTable(responses);

    btn.disabled = false;
    btn.textContent = 'Refresh';
}

// Initialize
async function init() {
    // Event listeners
    document.getElementById('export-csv').addEventListener('click', exportCSV);
    document.getElementById('export-json').addEventListener('click', exportJSON);
    document.getElementById('refresh-data').addEventListener('click', refreshData);
    document.getElementById('close-modal').addEventListener('click', closeModal);

    // Close modal on background click
    document.getElementById('case-detail-modal').addEventListener('click', (e) => {
        if (e.target.id === 'case-detail-modal') {
            closeModal();
        }
    });

    // Close modal on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });

    // Initial load
    await refreshData();
}

document.addEventListener('DOMContentLoaded', init);
