/**
 * Tether Matching Engine
 * 
 * Matches patients to community resources using a three-stage process:
 * 1. Hard filters (clinician-set constraints)
 * 2. Logistics filters (patient practical constraints)
 * 3. Compatibility scoring (psychometric fit)
 */

import type {
  Resource,
  ClinicalConstraints,
  PatientAssessment,
  MatchedResource,
  MatchRationale,
} from '@tether/shared';

// ============================================
// SCORING WEIGHTS
// ============================================

const WEIGHTS = {
  groupSize: 0.25,
  interactionStyle: 0.25,
  interestAlignment: 0.20,
  sensoryCompatibility: 0.15,
  motivationAlignment: 0.15,
} as const;

// ============================================
// MAIN MATCHING FUNCTION
// ============================================

export function matchResources(
  resources: Resource[],
  constraints: ClinicalConstraints,
  assessment: PatientAssessment,
  limit: number = 5
): MatchedResource[] {
  
  // Stage 1: Hard filters (clinician constraints)
  const clinicallyAppropriate = resources.filter(r => 
    passesHardFilters(r, constraints)
  );
  
  // Stage 2: Logistics filters (patient constraints)
  const logisticallyFeasible = clinicallyAppropriate.filter(r =>
    passesLogisticsFilters(r, assessment)
  );
  
  // Stage 3: Score and rank by compatibility
  const scored = logisticallyFeasible.map(resource => ({
    resource,
    compatibilityScore: calculateCompatibilityScore(resource, assessment),
    matchRationale: generateRationale(resource, assessment, constraints),
  }));
  
  // Sort by score descending, take top N
  return scored
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .slice(0, limit);
}

// ============================================
// STAGE 1: HARD FILTERS
// ============================================

function passesHardFilters(
  resource: Resource,
  constraints: ClinicalConstraints
): boolean {
  
  // Must be in approved tier
  if (!constraints.approvedTiers.includes(resource.tier)) {
    return false;
  }
  
  // Must serve patient's diagnosis (or be general population)
  if (resource.diagnosesServed !== 'general') {
    const servesPatient = resource.diagnosesServed.includes(constraints.primaryDiagnosis);
    if (!servesPatient) {
      return false;
    }
  }
  
  // Must serve patient's age group
  if (!resource.ageGroups.includes(constraints.ageGroup)) {
    return false;
  }
  
  // Must not have contraindicated environments
  for (const contraindication of constraints.contraindicatedEnvironments) {
    if (contraindication === 'alcohol' && resource.alcoholServed) {
      return false;
    }
    // Add more contraindication checks as needed
    if (resource.atmosphere.includes(contraindication)) {
      return false;
    }
  }
  
  return true;
}

// ============================================
// STAGE 2: LOGISTICS FILTERS
// ============================================

function passesLogisticsFilters(
  resource: Resource,
  assessment: PatientAssessment
): boolean {
  
  // Schedule compatibility
  const hasMatchingTime = resource.schedule.timeSlots.some(slot => {
    if (slot === 'morning' && assessment.availability.weekdayMornings) return true;
    if (slot === 'afternoon' && assessment.availability.weekdayAfternoons) return true;
    if (slot === 'evening' && assessment.availability.weekdayEvenings) return true;
    if (assessment.availability.weekends) return true;
    return false;
  });
  if (!hasMatchingTime) {
    return false;
  }
  
  // Transportation compatibility
  if (assessment.transportAccess === 'walking_only') {
    // Would need distance calculation - placeholder
    // For now, assume walking_only requires transit accessible
    if (!resource.location.transitAccessible) {
      return false;
    }
  }
  
  // Cost compatibility
  if (assessment.costConstraint === 'free_only' && resource.cost.type !== 'free') {
    return false;
  }
  
  return true;
}

// ============================================
// STAGE 3: COMPATIBILITY SCORING
// ============================================

function calculateCompatibilityScore(
  resource: Resource,
  assessment: PatientAssessment
): number {
  let score = 0;
  
  // Group size match (25%)
  score += WEIGHTS.groupSize * scoreGroupSizeMatch(
    resource.groupSize,
    assessment.groupSizePreference
  );
  
  // Interaction style match (25%)
  score += WEIGHTS.interactionStyle * scoreInteractionStyleMatch(
    resource.interactionStyle,
    assessment.interactionStyle
  );
  
  // Interest alignment (20%)
  score += WEIGHTS.interestAlignment * scoreInterestAlignment(
    resource.keywords,
    assessment.interestCategories,
    assessment.pastInterests
  );
  
  // Sensory compatibility (15%)
  score += WEIGHTS.sensoryCompatibility * scoreSensoryCompatibility(
    resource.sensoryProfile,
    assessment
  );
  
  // Motivation/energy alignment (15%)
  score += WEIGHTS.motivationAlignment * scoreEnergyAlignment(
    resource.schedule.timeSlots,
    assessment.energyPattern
  );
  
  return Math.round(score * 100);
}

function scoreGroupSizeMatch(
  resourceSize: Resource['groupSize'],
  preferredSize: PatientAssessment['groupSizePreference']
): number {
  if (resourceSize === preferredSize) return 1.0;
  
  // Adjacent sizes get partial credit
  const sizeOrder = ['individual', 'small', 'medium', 'large'];
  const resourceIndex = sizeOrder.indexOf(resourceSize);
  const preferredIndex = sizeOrder.indexOf(preferredSize);
  const distance = Math.abs(resourceIndex - preferredIndex);
  
  if (distance === 1) return 0.6;
  if (distance === 2) return 0.3;
  return 0.1;
}

function scoreInteractionStyleMatch(
  resourceStyle: Resource['interactionStyle'],
  preferredStyle: PatientAssessment['interactionStyle']
): number {
  if (resourceStyle === preferredStyle) return 1.0;
  
  // Side-by-side and face-to-face are closer than online options
  const inPerson = ['face_to_face', 'side_by_side'];
  const online = ['online_sync', 'online_async'];
  
  if (inPerson.includes(resourceStyle) && inPerson.includes(preferredStyle)) {
    return 0.7;
  }
  if (online.includes(resourceStyle) && online.includes(preferredStyle)) {
    return 0.7;
  }
  
  return 0.3;
}

function scoreInterestAlignment(
  resourceKeywords: string[],
  patientCategories: string[],
  patientPastInterests: string[]
): number {
  const allPatientInterests = [
    ...patientCategories.map(c => c.toLowerCase()),
    ...patientPastInterests.map(i => i.toLowerCase()),
  ];
  
  const resourceKeywordsLower = resourceKeywords.map(k => k.toLowerCase());
  
  const matches = resourceKeywordsLower.filter(keyword =>
    allPatientInterests.some(interest =>
      interest.includes(keyword) || keyword.includes(interest)
    )
  );
  
  if (matches.length >= 3) return 1.0;
  if (matches.length === 2) return 0.7;
  if (matches.length === 1) return 0.4;
  return 0.1;
}

function scoreSensoryCompatibility(
  sensory: Resource['sensoryProfile'],
  assessment: PatientAssessment
): number {
  // For now, assume quieter/calmer is generally preferred for mental health
  // This should be expanded based on diagnosis-specific preferences
  let score = 0.5; // Neutral baseline
  
  if (sensory.noiseLevel === 'quiet') score += 0.2;
  if (sensory.crowding === 'spacious') score += 0.2;
  if (sensory.lighting === 'normal') score += 0.1;
  
  return Math.min(score, 1.0);
}

function scoreEnergyAlignment(
  resourceTimeSlots: string[],
  patientEnergy: PatientAssessment['energyPattern']
): number {
  if (patientEnergy === 'varies') return 0.7; // Flexible
  
  if (resourceTimeSlots.includes(patientEnergy)) {
    return 1.0;
  }
  
  return 0.4;
}

// ============================================
// RATIONALE GENERATION
// ============================================

function generateRationale(
  resource: Resource,
  assessment: PatientAssessment,
  constraints: ClinicalConstraints
): MatchRationale {
  const factors: MatchRationale['factors'] = [];
  
  // Group size
  if (resource.groupSize === assessment.groupSizePreference) {
    factors.push({
      factor: 'Group size',
      contribution: 'positive',
      explanation: `${resource.groupSize} group matches your preference`,
    });
  }
  
  // Interaction style
  if (resource.interactionStyle === assessment.interactionStyle) {
    factors.push({
      factor: 'Interaction style',
      contribution: 'positive',
      explanation: resource.interactionStyle === 'side_by_side'
        ? 'Activity-based format reduces conversation pressure'
        : 'Direct engagement style matches your preference',
    });
  }
  
  // Energy/time alignment
  if (resource.schedule.timeSlots.includes(assessment.energyPattern)) {
    factors.push({
      factor: 'Schedule',
      contribution: 'positive',
      explanation: `${assessment.energyPattern} time slot aligns with your energy pattern`,
    });
  }
  
  // Interest match
  const interestMatches = resource.keywords.filter(k =>
    [...assessment.interestCategories, ...assessment.pastInterests]
      .some(i => i.toLowerCase().includes(k.toLowerCase()))
  );
  if (interestMatches.length > 0) {
    factors.push({
      factor: 'Interests',
      contribution: 'positive',
      explanation: `Connects to your interest in ${interestMatches.slice(0, 2).join(' and ')}`,
    });
  }
  
  // Generate summary
  const positiveFactors = factors.filter(f => f.contribution === 'positive');
  const summary = positiveFactors.length > 0
    ? `This ${resource.tier} resource fits your ${positiveFactors.map(f => f.factor.toLowerCase()).join(', ')} preferences.`
    : `This resource meets your basic requirements and may be worth exploring.`;
  
  return { summary, factors };
}

// ============================================
// EXPORTS
// ============================================

export { passesHardFilters, passesLogisticsFilters, calculateCompatibilityScore };
