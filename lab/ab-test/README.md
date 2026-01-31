# Tether A/B Testing Lab

Tools for validating that psychometric matching improves clinician and patient preference over generic referrals.

## Purpose

Test the core hypothesis: **Do clinicians prefer Tether's personalized Community Care Plans over standard logistics-based referrals?**

## Test Design

### Participants
- Psychiatry residents (N=10-15)
- No prior exposure to Tether

### Materials
Two versions of referral output for the same patient case:

**Version A (Tether):**
- 3 resources with match rationale
- Explains why each resource fits the patient's preferences
- Includes energy pattern, interaction style, and interest alignment

**Version B (Standard):**
- 3 resources from a generic 211-style search
- Filtered by ZIP code and diagnosis category only
- No personalization or rationale

### Protocol
1. Present patient case (Marcus Thompson scenario)
2. Show both versions (randomized order)
3. Ask:
   - "What do you notice?"
   - "Which would you hand to this patient?"
   - "Why?"

### Success Criteria
- >70% preference for Version A
- Qualitative feedback confirms match rationale builds trust

## File Structure

```
lab/ab-test/
├── src/
│   ├── App.tsx           # Main test interface
│   ├── PatientCase.tsx   # Marcus scenario display
│   ├── VersionA.tsx      # Tether recommendations
│   ├── VersionB.tsx      # Generic referrals
│   └── ResultsCapture.tsx
├── fixtures/
│   ├── marcus-case.json
│   ├── version-a-recommendations.json
│   └── version-b-recommendations.json
└── results/
    └── .gitkeep
```

## Running the Test

```bash
cd lab/ab-test
npm install
npm run dev
```

Open http://localhost:3001 and follow the on-screen protocol.

## Data Collection

Results are stored locally in `results/` as JSON files:
- Participant ID (anonymous)
- Timestamp
- Version order shown
- Selection made
- Free-text reasoning

## Analysis

After collecting responses:

```bash
npm run analyze
```

Outputs:
- Selection distribution (A vs B)
- Reasoning themes (coded qualitatively)
- Statistical significance (chi-square if N > 20)
