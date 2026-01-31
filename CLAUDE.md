# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Tether is a social prescribing platform that matches mental health patients to community resources using psychometric compatibility scoring, not just ZIP code and eligibility. This is an academic capstone prototype for Brett Goerl (MD/MBA student at UVA Darden) designed to validate the matching hypothesis with 1-3 test users.

**Core hypothesis:** Psychometric matching improves adherence rates beyond the ~50% achieved by logistics-based platforms like Findhelp and Unite Us.

**This is a learning exercise**, not a product launch. Brett starts psychiatry residency next year. The goal is academic validation and building product development skills.

The core innovation combines:
- Clinician-set guardrails (diagnosis, treatment phase, resource tiers, contraindications)
- Patient psychometric assessment (energy patterns, interaction style, group preferences, past interests)
- Curated resource metadata ("vibe check" data on community organizations)

## User Personas

**Clinician: Dr. Sarah Chen**
- Psychiatrist at community mental health center, 90-patient panel
- Pain point: Generic 211 printouts end up in the trash
- Need: Connect patients to resources without adding >5 min to workflow
- Key insight: Skeptical of new software; if it doesn't fit workflow, she won't use it

**Patient: Marcus Thompson**
- 34-year-old with moderate depression, recently stabilized on sertraline
- Works remotely, lives alone, limited social network
- Pain point: Generic resource lists feel overwhelming and irrelevant
- Key insight: Low energy in evenings, mornings better; prefers side-by-side activities over face-to-face; used to enjoy hiking

## Commands

**Monorepo management** (uses Turborepo):
```bash
npm run dev          # Start all apps in dev mode
npm run build        # Build all packages and apps
npm run lint         # Lint all packages and apps
npm run test         # Run tests across all packages
```

**Database operations**:
```bash
npm run db:migrate   # Apply PostgreSQL schema (packages/database)
npm run db:seed      # Seed database with test data
```

**Individual package development**:
```bash
cd packages/matching-engine && npm run test    # Run matching engine tests (Vitest)
cd apps/clinician && npm run dev               # Run clinician app only (Vite)
cd apps/patient && npm run dev                 # Run patient app only (Vite)
cd apps/admin && npm run dev                   # Run admin app only (Vite)
```

## Architecture

This is a **Turborepo monorepo** with shared packages and three separate frontend apps.

### Three User Interfaces

1. **Clinician Interface** (`apps/clinician`): Dr. Chen flow
   - Patient selection (C1)
   - Diagnosis selection (C2)
   - Treatment parameters (C3)
   - Care Plan review and send (C4)

2. **Patient Interface** (`apps/patient`): Marcus flow
   - Welcome/explanation (P1)
   - Psychometric assessment (P2)
   - Community Care Plan results (P3)
   - Resource detail with match rationale (P4)

3. **Admin Interface** (`apps/admin`): Resource data entry
   - Manual entry of community organizations
   - "Vibe check" surveys for qualitative metadata
   - Verification tracking

### Package Dependencies

```
apps/clinician  ───┐
apps/patient    ───┼──> @tether/shared (types, utilities)
apps/admin      ───┘

packages/matching-engine ──> @tether/shared

packages/database (independent, PostgreSQL schemas)
```

All three apps are React + TypeScript + Tailwind CSS frontends built with Vite.

### Core Data Flow

1. Clinician sets clinical constraints (diagnosis, treatment phase, approved tiers)
2. Patient receives link, completes 5-min psychometric assessment
3. Matching engine generates 3-5 personalized recommendations
4. Patient views Community Care Plan with match rationale for each resource
5. Patient marks interest or dismisses; feedback informs future matching

### Matching Algorithm (`packages/matching-engine/src/index.ts`)

Three-stage filtering process:

**Stage 1: Hard Filters** (pass/fail, clinician-set)
- Resource tier must be in approved tiers
- Must serve patient's diagnosis and age group
- Must not have contraindicated environments (e.g., alcohol served)

**Stage 2: Logistics Filters** (pass/fail, patient-set)
- Schedule compatibility
- Transportation accessibility
- Cost constraints

**Stage 3: Compatibility Scoring** (0-100, weighted)
- Group size preference: 25%
- Interaction style: 25%
- Interest alignment: 20%
- Sensory compatibility: 15%
- Energy/motivation alignment: 15%

Output: `MatchedResource[]` with scores and rationale explaining why each resource fits.

### Type System (`packages/shared/src/types/index.ts`)

All domain types centralized in `@tether/shared`:

- **Clinical**: `DiagnosisCategory`, `AgeGroup`, `TreatmentPhase`, `ResourceTier`
- **Assessment**: `PatientAssessment`, `GroupSize`, `InteractionStyle`, `TimeOfDay`
- **Matching**: `MatchedResource`, `MatchRationale`, `CommunityCareCarePlan`
- **Resource**: `Resource` with "vibe check" fields (`sensoryProfile`, `atmosphere`)

### Database Schema (`packages/database/src/schemas/schema.sql`)

PostgreSQL with core tables:
- `clinicians`, `patients`
- `resources` (community organizations with structured metadata)
- `patient_assessments` (psychometric data)
- `clinical_constraints` (clinician guardrails)
- `care_plans`, `care_plan_recommendations`

Uses PostgreSQL enums and JSONB for diagnosis-specific flexibility.

## Key Design Decisions

**Why three separate apps?**
Each interface serves a different user with minimal shared UI. Separate apps keep concerns isolated.

**Why JSONB for diagnosis_specific fields?**
Different diagnoses need different questions (sobriety date for SUD, sensory sensitivities for autism). JSONB provides flexibility without migrations.

**Why "vibe check" metadata?**
Traditional platforms only track location/eligibility. The hypothesis is psychometric fit (group size, interaction style, sensory environment) significantly impacts adherence.

**Scoring weights (25/25/20/15/15):**
Group size and interaction style weighted highest because they correlate most with dropout rates in mental health settings.

## Working with Brett

**Collaboration style:**
- Prefers step-by-step iteration: "tackle things one at a time so we get the best possible product"
- Review and refine each component before moving to the next
- Emphasizes honest evaluation over validation

**Domain expertise:**
- Brett has clinical expertise in psychiatry; don't over-explain mental health concepts
- Focus on product and engineering guidance
- Frame features in terms of user needs and jobs-to-be-done

**Writing preferences:**
- Clear prose, no em-dashes
- Tight sentences, no wordiness
- No excessive bullet points in documents
- Consistent formatting

**Code preferences:**
- React/TypeScript frontend, Node.js backend, PostgreSQL
- Be opinionated about architecture decisions
- User stories in standard format: "As a [persona], I want [goal] so that [benefit]"

## Documentation

Product specs in `docs/specs/`:
- `Tether Design & UI Brief.docx` - Wireframes (C1-C4 clinician, P1-P4 patient)
- `Tether Assessment Logic.docx` - Branching logic by diagnosis and age
- `Tether Epic and User Stories.docx` - User stories with acceptance criteria
- `Tether User Personas.docx` - Dr. Chen and Marcus profiles
- `Tether_Usability_Test_Plan.docx` - Testing protocol
- `Final Paper_Tether.docx` - Business case and market analysis

## A/B Testing Lab (`lab/ab-test/`)

For validating the core hypothesis with psychiatry residents:
- Show Version A (Tether with rationale) vs Version B (generic 211-style list)
- Patient case: Marcus Thompson scenario
- Success metric: >70% prefer Version A

## Related Work

Built on matching concepts from [Empower](https://github.com/empowersocialapp/Empower-Social-2), adapted for clinical mental health. Key differences:
- Three-way matching (patient + clinician + resource) instead of two-way
- Real curated resources instead of generated concepts
- Feedback loop for learning
