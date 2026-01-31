// Core domain types for Tether

// ============================================
// DIAGNOSIS & CLINICAL TYPES
// ============================================

export type DiagnosisCategory =
  | 'anxiety'
  | 'depression'
  | 'bipolar'
  | 'adhd'
  | 'autism'
  | 'alcohol_use'
  | 'opioid_use'
  | 'other_substance_use'
  | 'schizophrenia'
  | 'ptsd'
  | 'eating_disorder'
  | 'personality_disorder';

export type AgeGroup =
  | 'adolescent'    // 13-17
  | 'young_adult'   // 18-25
  | 'mature_adult'  // 26-54
  | 'older_adult'   // 55-69
  | 'elder';        // 70+

export type TreatmentPhase =
  | 'acute'          // Higher-intensity clinical resources
  | 'early_recovery' // Mix of clinical and structured community
  | 'stable';        // Full spectrum including lifestyle

export type ResourceTier =
  | 'clinical'              // IOP, PHP, group therapy, specialty clinics
  | 'structured_community'  // AA/NA, NAMI, clubhouse, vocational rehab
  | 'lifestyle';            // Fitness, hobbies, volunteering, faith

// ============================================
// PATIENT ASSESSMENT TYPES
// ============================================

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'varies';

export type GroupSize =
  | 'individual'    // 1-on-1
  | 'small'         // 2-6
  | 'medium'        // 7-15
  | 'large';        // 15+

export type InteractionStyle =
  | 'face_to_face'  // Direct conversation
  | 'side_by_side'  // Activity-based, less talking
  | 'online_sync'   // Video calls
  | 'online_async'; // Forums, messaging

export type CommitmentLevel =
  | 'drop_in'       // No ongoing commitment
  | 'short_series'  // 4-8 weeks
  | 'ongoing';      // Regular membership

export type TransportAccess =
  | 'drives'
  | 'public_transit'
  | 'needs_rides'
  | 'walking_only';

export type CostConstraint =
  | 'free_only'
  | 'low_cost'      // Sliding scale acceptable
  | 'cost_flexible';

export interface PatientAssessment {
  // Schedule & logistics
  availability: {
    weekdayMornings: boolean;
    weekdayAfternoons: boolean;
    weekdayEvenings: boolean;
    weekends: boolean;
  };
  transportAccess: TransportAccess;
  maxDistanceMiles: number;
  costConstraint: CostConstraint;

  // Social preferences
  energyPattern: TimeOfDay;
  groupSizePreference: GroupSize;
  interactionStyle: InteractionStyle;
  commitmentLevel: CommitmentLevel;

  // Interests
  interestCategories: string[];  // From predefined list
  pastInterests: string[];       // Free text, "what did you used to enjoy"

  // Diagnosis-specific (populated based on diagnosis)
  diagnosisSpecific?: Record<string, unknown>;
}

// ============================================
// CLINICIAN INPUT TYPES
// ============================================

export interface ClinicalConstraints {
  patientId: string;
  
  // Required
  primaryDiagnosis: DiagnosisCategory;
  comorbidities: DiagnosisCategory[];
  ageGroup: AgeGroup;
  treatmentPhase: TreatmentPhase;
  approvedTiers: ResourceTier[];
  
  // Optional guardrails
  treatmentGoals: TreatmentGoal[];
  contraindicatedEnvironments: string[];  // e.g., "alcohol served", "loud music"
  
  // Diagnosis-specific constraints
  diagnosisSpecific?: Record<string, unknown>;
  
  // Free text
  notes?: string;
}

export type TreatmentGoal =
  | 'reduce_isolation'
  | 'build_routine'
  | 'develop_skills'
  | 'expand_support'
  | 'maintain_sobriety'
  | 'increase_activity';

// ============================================
// RESOURCE TYPES
// ============================================

export interface Resource {
  id: string;
  name: string;
  description: string;
  
  // Classification
  tier: ResourceTier;
  diagnosesServed: DiagnosisCategory[] | 'general';
  ageGroups: AgeGroup[];
  
  // Characteristics (the "vibe check" data)
  groupSize: GroupSize;
  interactionStyle: InteractionStyle;
  structureLevel: CommitmentLevel;
  sensoryProfile: {
    noiseLevel: 'quiet' | 'moderate' | 'loud';
    lighting: 'dim' | 'normal' | 'bright';
    crowding: 'spacious' | 'moderate' | 'crowded';
  };
  atmosphere: string[];  // e.g., "welcoming", "structured", "competitive"
  
  // Logistics
  schedule: {
    daysOffered: string[];
    timeSlots: TimeOfDay[];
    sessionDuration: string;  // e.g., "90 minutes"
  };
  location: {
    address: string;
    transitAccessible: boolean;
    parkingAvailable: boolean;
  };
  cost: {
    type: 'free' | 'sliding_scale' | 'fixed';
    amount?: number;
    insuranceAccepted?: string[];
  };
  intake: {
    type: 'walk_in' | 'registration' | 'referral' | 'waitlist';
    process?: string;
  };
  
  // Safety flags
  alcoholServed: boolean;
  facilitatorCredentials: 'licensed' | 'certified_peer' | 'trained_volunteer' | 'none';
  
  // Metadata
  verified: boolean;
  lastVerified?: Date;
  keywords: string[];
}

// ============================================
// MATCHING OUTPUT TYPES
// ============================================

export interface MatchedResource {
  resource: Resource;
  compatibilityScore: number;  // 0-100
  matchRationale: MatchRationale;
}

export interface MatchRationale {
  summary: string;  // 2-3 sentence explanation
  factors: {
    factor: string;
    contribution: 'positive' | 'neutral' | 'slight_concern';
    explanation: string;
  }[];
}

export interface CommunityCareCarePlan {
  id: string;
  patientId: string;
  clinicianId: string;
  
  // Inputs
  clinicalConstraints: ClinicalConstraints;
  patientAssessment: PatientAssessment;
  
  // Output
  recommendations: MatchedResource[];
  
  // Status
  status: 'draft' | 'pending_review' | 'approved' | 'sent' | 'viewed';
  createdAt: Date;
  sentAt?: Date;
  viewedAt?: Date;
  
  // Patient response
  patientInterest?: {
    resourceId: string;
    interested: boolean;
    dismissalReason?: string;
  }[];
}
