# Tether

**Social prescribing platform with psychometric matching for mental health**

Tether solves the "last mile" problem in mental health treatment by matching patients to community resources based on psychometric compatibility, not just ZIP code and eligibility.

## The Problem

Current social prescribing platforms (Findhelp, Unite Us, 211 directories) treat community resource matching as a logistics problem. They filter by location and eligibility, then hand patients a generic list. Result: adherence rates under 50%, with most referrals ending up ignored.

## The Solution

Tether combines:
- **Clinician-set guardrails**: Diagnosis, treatment phase, resource tiers, contraindicated environments
- **Patient psychometric assessment**: Energy patterns, interaction style, group size preference, sensory needs, past interests
- **Curated resource metadata**: "Vibe check" data on community organizations

The matching algorithm generates personalized Community Care Plans with 3-5 recommendations, each with a clear rationale explaining why it fits.

## Architecture

```
tether/
├── apps/
│   ├── clinician/        # Provider interface (Dr. Chen flow)
│   ├── patient/          # Patient interface (Marcus flow)
│   └── admin/            # Resource data entry
├── packages/
│   ├── matching-engine/  # Core algorithm
│   ├── database/         # PostgreSQL schemas
│   └── shared/           # Types, utilities
├── lab/
│   └── ab-test/          # A/B testing tool for validation
└── docs/
    └── specs/            # Product requirements, wireframes
```

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **Monorepo**: Turborepo

## Three User Interfaces

### 1. Clinician Interface
Psychiatrists and care managers use this to create Community Care Plans. They:
- Select patient diagnosis and comorbidities
- Set treatment phase (acute, early recovery, stable)
- Choose approved resource tiers (clinical, structured community, lifestyle)
- Flag contraindicated environments
- Review and approve recommendations before sending to patient

### 2. Patient Interface
Patients receive a link from their provider and:
- Complete a brief psychometric assessment (5 min)
- View personalized recommendations with match rationale
- Mark interest or dismiss recommendations
- Access logistics (schedule, location, cost, next steps)

### 3. Admin Interface
For curating the resource database:
- Enter community organizations with structured metadata
- Complete "vibe check" surveys for qualitative characterization
- Track resource verification status

## Matching Logic

```
1. HARD FILTERS (Clinician-set, pass/fail)
   - Resource tier
   - Contraindicated environments
   - Age group
   - Diagnosis appropriateness

2. LOGISTICS FILTERS (Patient-set, pass/fail)
   - Schedule availability
   - Transportation/distance
   - Cost constraints

3. COMPATIBILITY SCORING (Patient preferences, 0-100)
   - Group size preference (25%)
   - Interaction style (25%)
   - Interest alignment (20%)
   - Sensory compatibility (15%)
   - Motivation alignment (15%)

4. OUTPUT
   - Top 3-5 resources
   - Match rationale for each
```

## Development Status

This is an academic prototype being developed as a digital capstone project. The goal is to validate the psychometric matching hypothesis with 1-3 test users, not to launch a production product.

## Related Work

Tether builds on matching concepts from [Empower](https://github.com/empowersocialapp/Empower-Social-2), adapting social event matching for clinical mental health contexts.

## License

MIT
