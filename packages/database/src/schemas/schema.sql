-- Tether Database Schema
-- PostgreSQL

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE diagnosis_category AS ENUM (
  'anxiety',
  'depression',
  'bipolar',
  'adhd',
  'autism',
  'alcohol_use',
  'opioid_use',
  'other_substance_use',
  'schizophrenia',
  'ptsd',
  'eating_disorder',
  'personality_disorder'
);

CREATE TYPE age_group AS ENUM (
  'adolescent',
  'young_adult',
  'mature_adult',
  'older_adult',
  'elder'
);

CREATE TYPE treatment_phase AS ENUM (
  'acute',
  'early_recovery',
  'stable'
);

CREATE TYPE resource_tier AS ENUM (
  'clinical',
  'structured_community',
  'lifestyle'
);

CREATE TYPE group_size AS ENUM (
  'individual',
  'small',
  'medium',
  'large'
);

CREATE TYPE interaction_style AS ENUM (
  'face_to_face',
  'side_by_side',
  'online_sync',
  'online_async'
);

CREATE TYPE commitment_level AS ENUM (
  'drop_in',
  'short_series',
  'ongoing'
);

CREATE TYPE care_plan_status AS ENUM (
  'draft',
  'pending_review',
  'approved',
  'sent',
  'viewed'
);

-- ============================================
-- CORE TABLES
-- ============================================

-- Clinicians (providers using the system)
CREATE TABLE clinicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  organization VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patients
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinician_id UUID REFERENCES clinicians(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  age_group age_group NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Community Resources
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Classification
  tier resource_tier NOT NULL,
  diagnoses_served diagnosis_category[] DEFAULT '{}',
  serves_general_population BOOLEAN DEFAULT false,
  age_groups age_group[] NOT NULL,
  
  -- Characteristics
  group_size group_size NOT NULL,
  interaction_style interaction_style NOT NULL,
  structure_level commitment_level NOT NULL,
  noise_level VARCHAR(20) DEFAULT 'moderate',
  lighting VARCHAR(20) DEFAULT 'normal',
  crowding VARCHAR(20) DEFAULT 'moderate',
  atmosphere TEXT[] DEFAULT '{}',
  
  -- Logistics
  schedule_days TEXT[] DEFAULT '{}',
  schedule_times TEXT[] DEFAULT '{}',
  session_duration VARCHAR(50),
  address TEXT,
  transit_accessible BOOLEAN DEFAULT false,
  parking_available BOOLEAN DEFAULT false,
  cost_type VARCHAR(20) DEFAULT 'free',
  cost_amount DECIMAL(10, 2),
  insurance_accepted TEXT[] DEFAULT '{}',
  intake_type VARCHAR(20) DEFAULT 'walk_in',
  intake_process TEXT,
  
  -- Safety
  alcohol_served BOOLEAN DEFAULT false,
  facilitator_credentials VARCHAR(50),
  
  -- Metadata
  keywords TEXT[] DEFAULT '{}',
  verified BOOLEAN DEFAULT false,
  last_verified TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patient Assessments
CREATE TABLE patient_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  
  -- Schedule
  weekday_mornings BOOLEAN DEFAULT false,
  weekday_afternoons BOOLEAN DEFAULT false,
  weekday_evenings BOOLEAN DEFAULT false,
  weekends BOOLEAN DEFAULT false,
  
  -- Logistics
  transport_access VARCHAR(20),
  max_distance_miles INTEGER,
  cost_constraint VARCHAR(20),
  
  -- Preferences
  energy_pattern VARCHAR(20),
  group_size_preference group_size,
  interaction_style interaction_style,
  commitment_level commitment_level,
  
  -- Interests
  interest_categories TEXT[] DEFAULT '{}',
  past_interests TEXT[] DEFAULT '{}',
  
  -- Diagnosis-specific (JSONB for flexibility)
  diagnosis_specific JSONB DEFAULT '{}',
  
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clinical Constraints (set by clinician)
CREATE TABLE clinical_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  clinician_id UUID REFERENCES clinicians(id) NOT NULL,
  
  primary_diagnosis diagnosis_category NOT NULL,
  comorbidities diagnosis_category[] DEFAULT '{}',
  treatment_phase treatment_phase NOT NULL,
  approved_tiers resource_tier[] NOT NULL,
  treatment_goals TEXT[] DEFAULT '{}',
  contraindicated_environments TEXT[] DEFAULT '{}',
  
  -- Diagnosis-specific constraints (JSONB for flexibility)
  diagnosis_specific JSONB DEFAULT '{}',
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Community Care Plans
CREATE TABLE care_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  clinician_id UUID REFERENCES clinicians(id) NOT NULL,
  assessment_id UUID REFERENCES patient_assessments(id),
  constraints_id UUID REFERENCES clinical_constraints(id),
  
  status care_plan_status DEFAULT 'draft',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Care Plan Recommendations (matched resources)
CREATE TABLE care_plan_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_plan_id UUID REFERENCES care_plans(id) NOT NULL,
  resource_id UUID REFERENCES resources(id) NOT NULL,
  
  rank INTEGER NOT NULL,
  compatibility_score INTEGER NOT NULL,
  match_rationale JSONB NOT NULL,
  
  -- Patient response
  patient_interested BOOLEAN,
  dismissal_reason TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_patients_clinician ON patients(clinician_id);
CREATE INDEX idx_resources_tier ON resources(tier);
CREATE INDEX idx_resources_verified ON resources(verified);
CREATE INDEX idx_care_plans_patient ON care_plans(patient_id);
CREATE INDEX idx_care_plans_status ON care_plans(status);
CREATE INDEX idx_recommendations_care_plan ON care_plan_recommendations(care_plan_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clinicians_updated_at
  BEFORE UPDATE ON clinicians
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON patient_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_constraints_updated_at
  BEFORE UPDATE ON clinical_constraints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_care_plans_updated_at
  BEFORE UPDATE ON care_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
