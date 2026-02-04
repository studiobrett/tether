/**
 * Tether A/B Test Survey
 *
 * Handles the survey flow:
 * 1. Welcome + screening
 * 2. Instructions
 * 3. 6 patient cases with randomized plan presentation
 * 4. Thank you
 */

// State
let fixtures = null;
let sessionId = null;
let caseOrder = [];
let versionMapping = {}; // Maps case_id to { plan1Version, plan2Version }
let currentCaseIndex = 0;
let selectedPlan = null;
let responses = [];
let participantData = {
    role: '',
    specialty: '',
    providesReferrals: ''
};

// SVG icons for resource logistics
const ICONS = {
    schedule: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    location: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    cost: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
    intake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M13 12H3"/></svg>'
};

// Generate random session ID
function generateSessionId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Fisher-Yates shuffle
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Initialize randomization
function initializeRandomization() {
    sessionId = generateSessionId();

    // Shuffle case order
    const caseIds = fixtures.cases.map(c => c.id);
    caseOrder = shuffleArray(caseIds);

    // For each case, randomize which version is Plan 1 vs Plan 2
    caseOrder.forEach(caseId => {
        const isPsychometricFirst = Math.random() < 0.5;
        versionMapping[caseId] = {
            plan1Version: isPsychometricFirst ? 'psychometric' : 'logistics',
            plan2Version: isPsychometricFirst ? 'logistics' : 'psychometric'
        };
    });

    console.log('Session ID:', sessionId);
    console.log('Case order:', caseOrder);
    console.log('Version mapping:', versionMapping);
}

// Show a specific screen
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');

    // Show/hide case navigation dots
    const caseNav = document.getElementById('case-nav');
    if (screenId === 'screen-case') {
        caseNav.style.display = 'flex';
    } else {
        caseNav.style.display = 'none';
    }

    window.scrollTo(0, 0);
}

// Update case navigation dots
function updateCaseDots(currentIndex) {
    const dots = document.querySelectorAll('#case-dots .dot');
    dots.forEach((dot, i) => {
        dot.classList.remove('active', 'complete');
        if (i < currentIndex) {
            dot.classList.add('complete');
        } else if (i === currentIndex) {
            dot.classList.add('active');
        }
    });
    document.getElementById('case-label').textContent = `Case ${currentIndex + 1} of 6`;
}

// Get tier class for styling
function getTierClass(tier) {
    const tierLower = tier.toLowerCase();
    if (tierLower.includes('clinical')) return 'clinical';
    if (tierLower.includes('structured') || tierLower.includes('community')) return 'community';
    if (tierLower.includes('lifestyle')) return 'lifestyle';
    return 'community';
}

// Extract distance from location string (e.g., "1.2 miles away" -> "1.2 mi")
function extractDistance(location) {
    const match = location.match(/([\d.]+)\s*miles?\s*away/i);
    if (match) {
        return `${match[1]} mi`;
    }
    // Try to find just the distance part
    const distMatch = location.match(/([\d.]+)\s*mi/i);
    if (distMatch) {
        return `${distMatch[1]} mi`;
    }
    return location.split(',').pop().trim();
}

// Shorten schedule text
function shortenSchedule(schedule) {
    return schedule
        .replace('Saturdays', 'Sat')
        .replace('Saturday', 'Sat')
        .replace('Sundays', 'Sun')
        .replace('Sunday', 'Sun')
        .replace('Mondays', 'Mon')
        .replace('Monday', 'Mon')
        .replace('Tuesdays', 'Tue')
        .replace('Tuesday', 'Tue')
        .replace('Wednesdays', 'Wed')
        .replace('Wednesday', 'Wed')
        .replace('Thursdays', 'Thu')
        .replace('Thursday', 'Thu')
        .replace('Fridays', 'Fri')
        .replace('Friday', 'Fri')
        .replace(' and ', ' & ')
        .replace(' hours', 'h')
        .replace(' hour', 'h')
        .replace(' weeks', ' wks')
        .replace(' week', ' wk')
        .replace(' minutes', ' min');
}

// Shorten intake text
function shortenIntake(intake) {
    if (intake.toLowerCase().includes('drop-in') || intake.toLowerCase().includes('drop in')) {
        return 'Drop-in';
    }
    if (intake.toLowerCase().includes('walk in') || intake.toLowerCase().includes('walk-in')) {
        return 'Walk in';
    }
    if (intake.toLowerCase().includes('registration') || intake.toLowerCase().includes('register')) {
        return 'Register';
    }
    if (intake.toLowerCase().includes('referral')) {
        return 'Referral';
    }
    if (intake.toLowerCase().includes('call')) {
        return 'Call for intake';
    }
    // Keep it short
    if (intake.length > 20) {
        return intake.substring(0, 18) + '...';
    }
    return intake;
}

// Render a resource card (compact version)
function renderResourceCard(resource) {
    const tierClass = getTierClass(resource.tier);
    const tierLabel = resource.tier.replace('Structured ', '');
    const distance = extractDistance(resource.location);
    const schedule = shortenSchedule(resource.schedule);
    const intake = shortenIntake(resource.intake);

    return `
        <div class="resource">
            <div class="resource-top">
                <div class="resource-name">${resource.name}</div>
                <div class="tier-tag ${tierClass}">${tierLabel}</div>
            </div>
            <div class="resource-desc">${resource.description}</div>
            <div class="resource-logistics">
                <span>${ICONS.schedule}${schedule}</span>
                <span>${ICONS.location}${distance}</span>
                <span>${ICONS.cost}${resource.cost}</span>
                <span>${ICONS.intake}${intake}</span>
            </div>
        </div>
    `;
}

// Build clinical summary section
function buildClinicalSummary(caseData) {
    let parts = [];
    if (caseData.presentingProblem) {
        parts.push(caseData.presentingProblem);
    }
    if (caseData.currentTreatment) {
        parts.push(caseData.currentTreatment);
    }
    return parts.join(' ');
}

// Build history and functional status section
function buildHistoryStatus(caseData) {
    let parts = [];
    if (caseData.relevantHistory && caseData.relevantHistory.length > 0) {
        parts.push(caseData.relevantHistory.join(' '));
    }
    if (caseData.functionalStatus) {
        parts.push(caseData.functionalStatus);
    }
    return parts.join(' ');
}

// Build patient preferences section
function buildPatientPreferences(caseData) {
    if (caseData.patientReported && caseData.patientReported.length > 0) {
        return caseData.patientReported.map(item => `• ${item}`).join('<br>');
    }
    return '';
}

// Warning icon SVG
const WARNING_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>';

// Load a case into the UI
function loadCase(index) {
    const caseId = caseOrder[index];
    const caseData = fixtures.cases.find(c => c.id === caseId);
    const mapping = versionMapping[caseId];

    // Update case navigation
    updateCaseDots(index);

    // Update patient info (compact format)
    const initials = caseData.patient.name.split(' ').map(n => n[0]).join('');
    document.getElementById('patient-avatar').textContent = initials;
    document.getElementById('patient-name').textContent = caseData.patient.name;
    document.getElementById('patient-meta').textContent =
        `${caseData.patient.age} · ${caseData.patient.gender} · ${caseData.patient.diagnosis}`;

    // Update clinician parameter chips
    const paramsContainer = document.getElementById('clinician-params');
    let chipsHtml = '';
    chipsHtml += `<div class="param-chip">${caseData.clinicianSettings.treatmentPhase}</div>`;

    // Approved tiers chip
    const tiers = caseData.clinicianSettings.approvedTiers;
    if (tiers.length === 3) {
        chipsHtml += `<div class="param-chip">All Tiers</div>`;
    } else {
        chipsHtml += `<div class="param-chip">${tiers.join(', ')}</div>`;
    }
    paramsContainer.innerHTML = chipsHtml;

    // Contraindications warning (show below header when present)
    const contraindicationsWarning = document.getElementById('contraindications-warning');
    if (caseData.clinicianSettings.contraindications && caseData.clinicianSettings.contraindications !== 'None specified') {
        contraindicationsWarning.innerHTML = `${WARNING_ICON}<span><strong>Contraindication:</strong> ${caseData.clinicianSettings.contraindications}</span>`;
        contraindicationsWarning.style.display = 'flex';
    } else {
        contraindicationsWarning.style.display = 'none';
    }

    // Update vignette sections
    document.getElementById('clinical-summary').textContent = buildClinicalSummary(caseData);
    document.getElementById('history-status').textContent = buildHistoryStatus(caseData);
    document.getElementById('patient-preferences').innerHTML = buildPatientPreferences(caseData);

    // Update clinical goal
    document.getElementById('clinical-goal-text').textContent = caseData.clinicalGoal;

    // Get the correct version data based on mapping
    const plan1Data = mapping.plan1Version === 'psychometric' ? caseData.versionA : caseData.versionB;
    const plan2Data = mapping.plan2Version === 'psychometric' ? caseData.versionA : caseData.versionB;

    // Render Plan 1
    document.getElementById('plan-1-resources').innerHTML =
        plan1Data.recommendations.map(r => renderResourceCard(r)).join('');

    // Render Plan 2
    document.getElementById('plan-2-resources').innerHTML =
        plan2Data.recommendations.map(r => renderResourceCard(r)).join('');

    // Reset selection state
    selectedPlan = null;
    document.getElementById('plan-col-1').classList.remove('selected');
    document.getElementById('plan-col-2').classList.remove('selected');
    document.getElementById('reasoning').value = '';
    document.getElementById('char-count').textContent = '0 characters';
    updateNextButton();

    // Update button text for last case
    document.getElementById('next-case-btn').textContent =
        index === 5 ? 'Submit' : 'Next Case →';
}

// Select a plan
function selectPlan(planNumber) {
    selectedPlan = planNumber;
    document.getElementById('plan-col-1').classList.toggle('selected', planNumber === 1);
    document.getElementById('plan-col-2').classList.toggle('selected', planNumber === 2);
    updateNextButton();
}

// Update next button state
function updateNextButton() {
    const reasoning = document.getElementById('reasoning').value.trim();
    const btn = document.getElementById('next-case-btn');
    const minChars = 10;

    if (selectedPlan && reasoning.length >= minChars) {
        btn.classList.remove('disabled');
        btn.classList.add('active');
    } else {
        btn.classList.add('disabled');
        btn.classList.remove('active');
    }
}

// Save current case response
function saveCurrentResponse() {
    const caseId = caseOrder[currentCaseIndex];
    const mapping = versionMapping[caseId];
    const reasoning = document.getElementById('reasoning').value.trim();

    const response = {
        case_id: caseId,
        plan_1_version: mapping.plan1Version,
        plan_2_version: mapping.plan2Version,
        selected_plan: selectedPlan,
        selected_version: selectedPlan === 1 ? mapping.plan1Version : mapping.plan2Version,
        reasoning: reasoning
    };

    responses.push(response);
    console.log('Saved response:', response);
}

// Submit to Supabase
async function submitToSupabase() {
    const payload = {
        participant_role: participantData.role,
        participant_specialty: participantData.specialty || null,
        years_in_practice: null,
        case_order: caseOrder,
        responses: responses,
        session_id: sessionId
    };

    console.log('Submitting payload:', payload);

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/responses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        console.log('Successfully submitted to Supabase');
        return true;
    } catch (error) {
        console.error('Supabase submission error:', error);
        console.log('FALLBACK - Full response data:', JSON.stringify(payload, null, 2));
        throw error;
    }
}

// Show error
function showError(message) {
    const errorEl = document.getElementById('error-message');
    document.getElementById('error-text').textContent = message;
    errorEl.classList.add('visible');
}

// Hide error
function hideError() {
    document.getElementById('error-message').classList.remove('visible');
}

// Handle next case button click
async function handleNextCase() {
    const reasoning = document.getElementById('reasoning').value.trim();
    if (!selectedPlan || reasoning.length < 10) {
        return;
    }

    // Save current response
    saveCurrentResponse();

    if (currentCaseIndex < 5) {
        // Move to next case
        currentCaseIndex++;
        loadCase(currentCaseIndex);
    } else {
        // Submit and show thank you
        const btn = document.getElementById('next-case-btn');
        btn.classList.add('disabled');
        btn.classList.remove('active');
        btn.innerHTML = '<span class="loading-spinner"></span> Submitting...';

        try {
            await submitToSupabase();
            showScreen('screen-thankyou');
        } catch (error) {
            btn.classList.remove('disabled');
            btn.classList.add('active');
            btn.textContent = 'Submit';
            showError('Failed to submit responses. Please try again. Your data has been logged to the console as a backup.');
        }
    }
}

// Initialize the app
async function init() {
    // Load fixtures
    try {
        const response = await fetch('fixtures.json');
        fixtures = await response.json();
        console.log('Loaded fixtures:', fixtures);
    } catch (error) {
        console.error('Failed to load fixtures:', error);
        showError('Failed to load study data. Please refresh the page.');
        return;
    }

    // Initialize randomization
    initializeRandomization();

    // Screen 1: Welcome + Screening
    const roleSelect = document.getElementById('role');
    const otherRoleInput = document.getElementById('other-role-input');
    const referralInputs = document.querySelectorAll('input[name="provides-referrals"]');
    const screeningFail = document.getElementById('screening-fail');
    const continueBtn = document.getElementById('continue-btn');

    roleSelect.addEventListener('change', () => {
        if (roleSelect.value === 'Other') {
            otherRoleInput.classList.add('visible');
        } else {
            otherRoleInput.classList.remove('visible');
        }
        validateScreening();
    });

    document.getElementById('other-role').addEventListener('input', validateScreening);

    referralInputs.forEach(input => {
        input.addEventListener('change', () => {
            if (input.value === 'no' && input.checked) {
                screeningFail.classList.add('visible');
                continueBtn.disabled = true;
            } else {
                screeningFail.classList.remove('visible');
                validateScreening();
            }
        });
    });

    function validateScreening() {
        const roleValue = roleSelect.value;
        const otherRoleValue = document.getElementById('other-role').value.trim();
        const referralValue = document.querySelector('input[name="provides-referrals"]:checked');

        const roleValid = roleValue && (roleValue !== 'Other' || otherRoleValue);
        const referralValid = referralValue && referralValue.value === 'yes';

        continueBtn.disabled = !(roleValid && referralValid);
    }

    document.getElementById('screening-form').addEventListener('submit', (e) => {
        e.preventDefault();

        // Save participant data
        const roleValue = roleSelect.value;
        participantData.role = roleValue === 'Other'
            ? document.getElementById('other-role').value.trim()
            : roleValue;
        participantData.specialty = document.getElementById('specialty').value.trim();
        participantData.providesReferrals = 'yes';

        showScreen('screen-instructions');
    });

    // Screen 2: Instructions
    document.getElementById('begin-btn').addEventListener('click', () => {
        loadCase(0);
        showScreen('screen-case');
    });

    // Screen 3-8: Cases - Plan selection (click on columns)
    document.getElementById('plan-col-1').addEventListener('click', () => selectPlan(1));
    document.getElementById('plan-col-2').addEventListener('click', () => selectPlan(2));

    // Reasoning textarea
    document.getElementById('reasoning').addEventListener('input', (e) => {
        const length = e.target.value.length;
        document.getElementById('char-count').textContent = `${length} characters`;
        updateNextButton();
    });

    // Next case button
    document.getElementById('next-case-btn').addEventListener('click', handleNextCase);

    // Retry button
    document.getElementById('retry-btn').addEventListener('click', async () => {
        hideError();
        const btn = document.getElementById('next-case-btn');
        btn.classList.add('disabled');
        btn.classList.remove('active');
        btn.innerHTML = '<span class="loading-spinner"></span> Submitting...';

        try {
            await submitToSupabase();
            showScreen('screen-thankyou');
        } catch (error) {
            btn.classList.remove('disabled');
            btn.classList.add('active');
            btn.textContent = 'Submit';
            showError('Failed to submit responses. Your data has been logged to the console as a backup.');
        }
    });
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
