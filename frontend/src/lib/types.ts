// Espelha os DTOs da API .NET (MaluNutri.Application.Dtos)

export type Role = 'nutritionist' | 'patient'

export interface Me {
  id: string
  email: string
  fullName: string
  role: Role
  patientId: string | null
}

export interface PatientOverview {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  status: 'active' | 'paused' | 'archived'
  goal: string | null
  hasAppAccess: boolean
  age: number | null
  lastWeightKg: number | null
  hasActivePlan: boolean
  pendingCheckIns: number
  lastCheckIn: string | null
  nextConsultation: string | null
}

export interface Patient {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  birthDate: string | null
  sex: 'F' | 'M' | 'O' | null
  heightCm: number | null
  goal: string | null
  notes: string | null
  proteinTargetG: number
  waterTargetMl: number
  status: PatientOverview['status']
  hasAppAccess: boolean
  createdAt: string
}

export type PatientInput = Omit<Patient, 'id' | 'status' | 'hasAppAccess' | 'createdAt'>

export interface Consultation {
  id: string
  patientId: string
  scheduledAt: string
  durationMin: number
  kind: 'primeira' | 'retorno'
  status: 'agendada' | 'realizada' | 'cancelada'
  transcript: string | null
  chiefComplaint: string | null
  routine: string | null
  physicalActivity: string | null
  objective: string | null
  clinicalNotes: string | null
  aiProcessedAt: string | null
}

export type Meal = 'cafe' | 'lanche_manha' | 'almoco' | 'lanche_tarde' | 'jantar' | 'ceia'

export interface MealPlanItemFood {
  foodId: string
  foodName: string
  grams: number
}

export interface MealPlanItem {
  id: string
  meal: Meal
  mealTime: string
  description: string
  tip: string | null
  proteinG: number | null
  foods: MealPlanItemFood[]
}

export interface MealPlan {
  id: string
  patientId: string
  title: string
  status: 'rascunho' | 'ativo' | 'arquivado'
  notes: string | null
  publishedAt: string | null
  createdAt: string
  items: MealPlanItem[]
}

export interface MealPlanSummary {
  id: string
  title: string
  status: MealPlan['status']
  publishedAt: string | null
  createdAt: string
  meals: number
}

export interface MealPlanInput {
  title: string
  notes: string | null
  items: {
    meal: Meal
    mealTime: string
    description: string
    tip: string | null
    proteinG: number | null
    foods: { foodId: string; grams: number }[]
  }[]
}

export interface Food {
  id: string
  name: string
  foodGroup: string
  kcal100g: number
  carb100g: number
  protein100g: number
  fat100g: number
  householdUnit: string | null
  householdGrams: number | null
}

export interface Substitution {
  foodId: string
  name: string
  grams: number
  household: string | null
}

export interface ExamResult {
  id: string
  examName: string
  value: number
  unit: string
  refMin: number | null
  refMax: number | null
  status: 'baixo' | 'normal' | 'alto'
}

export interface ExamPanel {
  id: string
  collectedAt: string
  title: string
  attentionNote: string | null
  results: ExamResult[]
}

export type Hunger = 'pouca' | 'na_medida' | 'muita_a_noite'
export type Sleep = 'bem' | 'mais_ou_menos' | 'mal'
export type Hardest = 'cafe_da_manha' | 'almoco' | 'lanche_da_tarde' | 'jantar' | 'fim_de_semana' | 'agua'

export interface CheckIn {
  id: string
  patientId: string
  weekStart: string
  adherence: number
  hunger: Hunger
  sleep: Sleep
  hardest: Hardest[]
  weightKg: number | null
  waistCm: number | null
  comment: string | null
  reviewedAt: string | null
  createdAt: string
}

export interface Note {
  id: string
  body: string
  createdAt: string
  readAt: string | null
}

export interface NutritionistToday {
  consultations: {
    id: string
    patientId: string
    patientName: string
    scheduledAt: string
    durationMin: number
    kind: Consultation['kind']
    status: Consultation['status']
  }[]
  plansToBuild: number
  newCheckIns: number
  activePatients: number
  recentCheckIns: { id: string; patientId: string; patientName: string; adherence: number; weightKg: number | null; createdAt: string }[]
}

export interface PatientToday {
  firstName: string
  weekNumber: number | null
  currentMeal: { id: string; meal: Meal; mealTime: string; description: string; tip: string | null } | null
  proteinG: number
  proteinTargetG: number
  waterMl: number
  waterTargetMl: number
  checkInDone: boolean
  unreadNotes: number
}

export interface Progress {
  points: { weekStart: string; weightKg: number | null; waistCm: number | null; adherence: number }[]
  checkInCount: number
  weeks: number
  currentWeightKg: number | null
  weightChangeKg: number | null
  waistChangeCm: number | null
  avgAdherence: number | null
  latestNote: Note | null
}
