import { supabase } from '../lib/supabase';

// Care Plan Interfaces based on evidence-based frameworks
export interface CarePlanGoal {
  id: string;
  category: 'medication' | 'lifestyle' | 'monitoring' | 'education' | 'emergency';
  title: string;
  description: string;
  target: string;
  timeframe: string;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'completed' | 'paused';
  progress: number; // 0-100
}

export interface CarePlanRecommendation {
  id: string;
  type: 'medication' | 'diet' | 'exercise' | 'monitoring' | 'lifestyle' | 'education';
  title: string;
  description: string;
  rationale: string;
  frequency: string;
  priority: 'high' | 'medium' | 'low';
  evidenceLevel: 'A' | 'B' | 'C' | 'E'; // ADA evidence levels
}

export interface CarePlan {
  id: string;
  userId: string;
  patientName: string;
  conditions: string[];
  riskLevel: 'low' | 'moderate' | 'high' | 'very-high';
  overallHealthScore: number;
  goals: CarePlanGoal[];
  recommendations: CarePlanRecommendation[];
  emergencyPlan: {
    warningSignsDescription: string;
    emergencyActions: string[];
    emergencyContacts: string[];
  };
  nextReviewDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface HealthDataAnalysis {
  conditions: string[];
  riskFactors: string[];
  healthScore: number;
  complicationRisk: number;
  emergencyVisits: number;
  adherenceRate: number;
  vitalSigns: {
    bloodPressure?: { systolic: number; diastolic: number };
    heartRate?: number;
    glucose?: number;
    weight?: number;
    bmi?: number;
  };
  trends: {
    improving: string[];
    stable: string[];
    worsening: string[];
  };
}

class CarePlanService {
  private cachedCarePlan: CarePlan | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Cache table existence checks to reduce repeated 404/PGRST205 noise
  private tableExistenceCache: Record<string, { exists: boolean; timestamp: number }> = {};

  private async checkTableExists(table: string): Promise<boolean> {
    const now = Date.now();
    const cached = this.tableExistenceCache[table];
    if (cached && now - cached.timestamp < this.CACHE_DURATION) {
      return cached.exists;
    }
    try {
      const { error } = await supabase.from(table).select('id').limit(1);
      if (error) {
        const code = (error as any)?.code || '';
        const msg = ((error as any)?.message || '').toLowerCase();
        if (code === 'PGRST205' || msg.includes('schema cache') || msg.includes('relation') || msg.includes('could not find the table')) {
          this.tableExistenceCache[table] = { exists: false, timestamp: now };
          console.warn(`[carePlanService] Table '${table}' missing or not in schema cache; skipping queries.`);
          return false;
        }
      }
      this.tableExistenceCache[table] = { exists: true, timestamp: now };
      return true;
    } catch (e) {
      console.warn(`[carePlanService] Error checking table existence for '${table}':`, e);
      this.tableExistenceCache[table] = { exists: false, timestamp: now };
      return false;
    }
  }

  private async checkCarePlansTable(): Promise<boolean> {
    try {
      const { error } = await supabase.from('care_plans').select('id').limit(1);
      if (error) {
        const msg = (error as any)?.message?.toLowerCase() || '';
        const code = (error as any)?.code || '';
        if (
          code === 'PGRST205' ||
          msg.includes('schema cache') ||
          msg.includes('relation') ||
          msg.includes("could not find the table")
        ) {
          console.warn('[carePlanService] care_plans table not found. Please run create_care_plans_table.sql in your Supabase project.');
          return false;
        }
      }
      return true;
    } catch (e) {
      console.warn('[carePlanService] Error checking care_plans table existence:', e);
      return false;
    }
  }

  // Analyze health data to determine conditions and risk factors
  async analyzeHealthData(userId: string): Promise<HealthDataAnalysis> {
    try {
      // Get latest health score (guarded)
      let healthScore: any = null;
      if (await this.checkTableExists('health_score')) {
        const { data: hsData, error: hsErr } = await supabase
          .from('health_score')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (hsErr) {
          console.warn('[carePlanService] Error fetching health_score (continuing without it):', hsErr);
        } else {
          healthScore = hsData && hsData.length > 0 ? hsData[0] : null;
        }
      } else {
        console.warn('[carePlanService] health_score table missing; continuing analysis without health score');
      }

      // Get recent vital signs
      const { data: vitalSigns } = await supabase
        .from('vital_signs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get wearable data for trends (guarded)
      let wearableData: any[] = [];
      if (await this.checkTableExists('wearable_data')) {
        const { data: wdData, error: wdErr } = await supabase
          .from('wearable_data')
          .select('*')
          .eq('user_id', userId)
          .order('recorded_at', { ascending: false })
          .limit(30);
        if (wdErr) {
          console.warn('[carePlanService] Error fetching wearable_data (continuing without it):', wdErr);
        } else {
          wearableData = wdData || [];
        }
      } else {
        console.warn('[carePlanService] wearable_data table missing; continuing analysis without wearable data');
      }

      const analysis: HealthDataAnalysis = {
        conditions: [],
        riskFactors: [],
        healthScore: healthScore?.health_score || 0,
        complicationRisk: healthScore?.complication_risk || 0,
        emergencyVisits: healthScore?.emergency_visits || 0,
        adherenceRate: healthScore?.adherence_rate || 0,
        vitalSigns: {},
        trends: { improving: [], stable: [], worsening: [] }
      };

      // Analyze conditions based on health data
      if (vitalSigns && vitalSigns.length > 0) {
        const latest = vitalSigns[0];
        if (latest.systolic_bp && latest.diastolic_bp) {
          if (latest.systolic_bp >= 140 || latest.diastolic_bp >= 90) {
            analysis.conditions.push('hypertension');
            analysis.riskFactors.push('High blood pressure');
          } else if (latest.systolic_bp >= 130 || latest.diastolic_bp >= 80) {
            analysis.conditions.push('elevated-bp');
            analysis.riskFactors.push('Elevated blood pressure');
          }
        }

        if (latest.glucose) {
          if (latest.glucose >= 126) {
            analysis.conditions.push('diabetes');
            analysis.riskFactors.push('High glucose');
          } else if (latest.glucose >= 100) {
            analysis.conditions.push('prediabetes');
            analysis.riskFactors.push('Elevated glucose');
          }
        }

        if (latest.weight) {
          const heightMeters = 1.75; // assumed height for demo
          const bmi = latest.weight / (heightMeters * heightMeters);
          analysis.vitalSigns.bmi = parseFloat(bmi.toFixed(1));
          if (bmi >= 30) {
            analysis.conditions.push('obesity');
            analysis.riskFactors.push('High BMI');
          } else if (bmi >= 25) {
            analysis.conditions.push('overweight');
            analysis.riskFactors.push('Elevated BMI');
          }
        }

        if (latest.heart_rate) {
          analysis.vitalSigns.heartRate = latest.heart_rate;
          if (latest.heart_rate >= 100) {
            analysis.riskFactors.push('Tachycardia');
          } else if (latest.heart_rate <= 60) {
            analysis.riskFactors.push('Bradycardia');
          }
        }

        if (latest.glucose) {
          analysis.vitalSigns.glucose = latest.glucose;
        }

        if (latest.weight) {
          analysis.vitalSigns.weight = latest.weight;
        }

        if (latest.systolic_bp && latest.diastolic_bp) {
          analysis.vitalSigns.bloodPressure = { systolic: latest.systolic_bp, diastolic: latest.diastolic_bp };
        }
      }

      // Trends from wearable data
      if (wearableData && wearableData.length > 0) {
        const recent = wearableData.slice(0, 5);
        const avgSteps = recent.reduce((sum, d) => sum + (d.steps || 0), 0) / recent.length;
        const avgHR = recent.reduce((sum, d) => sum + (d.heart_rate || 0), 0) / recent.length;
        if (avgSteps > 8000) analysis.trends.improving.push('Activity levels improving');
        else if (avgSteps < 4000) analysis.trends.worsening.push('Low activity levels');
        else analysis.trends.stable.push('Stable activity');

        if (avgHR > 100) analysis.riskFactors.push('Consistently high heart rate');
        else if (avgHR < 60) analysis.riskFactors.push('Consistently low heart rate');
      }

      return analysis;
    } catch (error) {
      console.error('Error analyzing health data:', error);
      // Return a minimal analysis to keep UI functional
      return {
        conditions: [],
        riskFactors: [],
        healthScore: 0,
        complicationRisk: 0,
        emergencyVisits: 0,
        adherenceRate: 0,
        vitalSigns: {},
        trends: { improving: [], stable: [], worsening: [] }
      };
    }
  }

  async generateCarePlan(userId: string, patientName: string): Promise<CarePlan> {
    const analysis = await this.analyzeHealthData(userId);
    const riskLevel = this.determineRiskLevel(analysis);

    const carePlan: CarePlan = {
      id: crypto.randomUUID(),
      userId,
      patientName,
      conditions: analysis.conditions,
      riskLevel,
      overallHealthScore: analysis.healthScore,
      goals: this.generateGoals(analysis),
      recommendations: this.generateRecommendations(analysis),
      emergencyPlan: this.generateEmergencyPlan(analysis),
      nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return carePlan;
  }

  private determineRiskLevel(analysis: HealthDataAnalysis): 'low' | 'moderate' | 'high' | 'very-high' {
    const score = analysis.healthScore;
    const risk = analysis.complicationRisk;
    if (score >= 80 && risk <= 20) return 'low';
    if (score >= 60 && risk <= 40) return 'moderate';
    if (score >= 40 && risk <= 60) return 'high';
    return 'very-high';
  }

  private generateGoals(analysis: HealthDataAnalysis): CarePlanGoal[] {
    const goals: CarePlanGoal[] = [];

    // Medication adherence
    goals.push({
      id: crypto.randomUUID(),
      category: 'medication',
      title: 'Maintain medication schedule',
      description: 'Take prescribed medications as directed by your physician.',
      target: `${Math.max(80, Math.round(analysis.adherenceRate))}% adherence`,
      timeframe: 'Daily',
      priority: 'high',
      status: 'active',
      progress: Math.round(analysis.adherenceRate)
    });

    // Lifestyle
    goals.push({
      id: crypto.randomUUID(),
      category: 'lifestyle',
      title: 'Increase daily steps',
      description: 'Aim to walk more and increase physical activity.',
      target: '8000 steps/day',
      timeframe: 'Weekly',
      priority: 'medium',
      status: 'active',
      progress: 0
    });

    // Monitoring
    goals.push({
      id: crypto.randomUUID(),
      category: 'monitoring',
      title: 'Monitor blood pressure',
      description: 'Check blood pressure regularly and record readings.',
      target: '120/80 mmHg',
      timeframe: 'Weekly',
      priority: 'high',
      status: 'active',
      progress: 0
    });

    // Education
    goals.push({
      id: crypto.randomUUID(),
      category: 'education',
      title: 'Learn about diabetes management',
      description: 'Understand how to manage diabetes through diet and medication.',
      target: 'Complete 3 education modules',
      timeframe: 'Monthly',
      priority: 'medium',
      status: 'active',
      progress: 0
    });

    // Emergency plan link
    if (analysis.riskFactors.includes('High blood pressure') || analysis.conditions.includes('hypertension')) {
      goals.push({
        id: crypto.randomUUID(),
        category: 'emergency',
        title: 'Recognize hypertension warning signs',
        description: 'Learn warning signs and actions to take during hypertensive crises.',
        target: 'Understand and follow emergency plan steps',
        timeframe: 'Monthly',
        priority: 'high',
        status: 'active',
        progress: 0
      });
    }

    return goals;
  }

  private generateRecommendations(analysis: HealthDataAnalysis): CarePlanRecommendation[] {
    const recommendations: CarePlanRecommendation[] = [];

    // Diet
    recommendations.push({
      id: crypto.randomUUID(),
      type: 'diet',
      title: 'Reduce sodium intake',
      description: 'Limit sodium to less than 2,300 mg per day to help manage blood pressure.',
      rationale: 'High sodium intake is linked to increased blood pressure.',
      frequency: 'Daily',
      priority: 'high',
      evidenceLevel: 'A'
    });

    // Exercise
    recommendations.push({
      id: crypto.randomUUID(),
      type: 'exercise',
      title: 'Regular aerobic exercise',
      description: 'Engage in at least 150 minutes of moderate-intensity aerobic activity per week.',
      rationale: 'Regular exercise improves cardiovascular health and reduces risk factors.',
      frequency: 'Weekly',
      priority: 'medium',
      evidenceLevel: 'A'
    });

    // Monitoring
    recommendations.push({
      id: crypto.randomUUID(),
      type: 'monitoring',
      title: 'Home glucose monitoring',
      description: 'Check blood glucose levels daily and record readings.',
      rationale: 'Regular monitoring helps manage diabetes and detect changes early.',
      frequency: 'Daily',
      priority: 'high',
      evidenceLevel: 'B'
    });

    // Lifestyle
    recommendations.push({
      id: crypto.randomUUID(),
      type: 'lifestyle',
      title: 'Stress management techniques',
      description: 'Practice mindfulness, meditation, or yoga to reduce stress.',
      rationale: 'Stress can negatively impact cardiovascular and metabolic health.',
      frequency: 'Daily',
      priority: 'medium',
      evidenceLevel: 'B'
    });

    // Education
    recommendations.push({
      id: crypto.randomUUID(),
      type: 'education',
      title: 'Understanding hypertension',
      description: 'Learn the causes, symptoms, and treatments of hypertension.',
      rationale: 'Knowledge empowers better self-care and adherence to treatment plans.',
      frequency: 'Monthly',
      priority: 'low',
      evidenceLevel: 'C'
    });

    return recommendations;
  }

  private generateEmergencyPlan(analysis: HealthDataAnalysis): CarePlan['emergencyPlan'] {
    const warningSignsDescription = this.getWarningSignsForConditions(analysis.conditions);
    const emergencyActions = this.getEmergencyActionsForConditions(analysis.conditions);
    const emergencyContacts = [
      'Primary Care Physician: (555) 123-4567',
      'Emergency: 911',
      'Family Contact: (555) 987-6543'
    ];

    return {
      warningSignsDescription,
      emergencyActions,
      emergencyContacts
    };
  }

  private getWarningSignsForConditions(conditions: string[]): string {
    const signs: string[] = [];
    if (conditions.includes('hypertension')) {
      signs.push('Severe headache', 'Chest pain', 'Shortness of breath', 'Vision changes');
    }
    if (conditions.includes('diabetes')) {
      signs.push('Extreme thirst', 'Frequent urination', 'Blurred vision', 'Fatigue');
    }
    if (conditions.includes('obesity')) {
      signs.push('Joint pain', 'Sleep apnea', 'Fatigue');
    }
    return signs.join('. ');
  }

  private getEmergencyActionsForConditions(conditions: string[]): string[] {
    const actions: string[] = [];
    if (conditions.includes('hypertension')) {
      actions.push('Rest and monitor blood pressure', 'Take prescribed medication', 'Call emergency services if symptoms worsen');
    }
    if (conditions.includes('diabetes')) {
      actions.push('Check blood sugar', 'Take insulin as prescribed', 'Seek medical help if levels remain high');
    }
    if (conditions.includes('obesity')) {
      actions.push('Engage in light physical activity', 'Follow dietary recommendations', 'Consult a healthcare provider');
    }
    return actions;
  }

  async storeCarePlan(carePlan: CarePlan): Promise<void> {
    const ok = await this.checkCarePlansTable();
    if (!ok) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const dbRecord = {
        id: carePlan.id,
        user_id: carePlan.userId,
        patient_name: carePlan.patientName,
        conditions: carePlan.conditions,
        risk_level: carePlan.riskLevel,
        overall_health_score: carePlan.overallHealthScore,
        goals: carePlan.goals,
        recommendations: carePlan.recommendations,
        emergency_plan: carePlan.emergencyPlan,
        next_review_date: carePlan.nextReviewDate,
        created_at: carePlan.createdAt,
        updated_at: carePlan.updatedAt,
      };

      const { error } = await supabase
        .from('care_plans')
        .upsert(dbRecord);
      if (error) throw error;
    } catch (error) {
      console.error('Error storing care plan:', error);
      throw error;
    }
  }

  async getLatestCarePlan(userId: string): Promise<CarePlan | null> {
    const ok = await this.checkCarePlansTable();
    if (!ok) return null;

    try {
      const { data, error } = await supabase
        .from('care_plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error) {
        if ((error as any)?.code === 'PGRST116') return null; // No rows
        throw error;
      }
      const carePlan: CarePlan = {
        id: data.id,
        userId: data.user_id,
        patientName: data.patient_name,
        conditions: data.conditions,
        riskLevel: data.risk_level,
        overallHealthScore: data.overall_health_score,
        goals: data.goals,
        recommendations: data.recommendations,
        emergencyPlan: data.emergency_plan,
        nextReviewDate: data.next_review_date,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      return carePlan;
    } catch (error) {
      console.error('Error fetching latest care plan:', error);
      return null;
    }
  }

  async updateGoalProgress(carePlanId: string, goalId: string, progress: number): Promise<void> {
    const ok = await this.checkCarePlansTable();
    if (!ok) return;

    try {
      const { data: existing, error } = await supabase
        .from('care_plans')
        .select('*')
        .eq('id', carePlanId)
        .limit(1);
      if (error) throw error;
      if (!existing || existing.length === 0) return;

      const plan = existing[0] as CarePlan;
      const updatedGoals = plan.goals.map(g => g.id === goalId ? { ...g, progress } : g);
      const { error: upErr } = await supabase
        .from('care_plans')
        .update({ goals: updatedGoals, updated_at: new Date().toISOString() })
        .eq('id', carePlanId);
      if (upErr) throw upErr;
    } catch (error) {
      console.error('Error updating goal progress:', error);
    }
  }

  private async getCarePlanById(carePlanId: string): Promise<CarePlan | null> {
    const ok = await this.checkCarePlansTable();
    if (!ok) return null;

    try {
      const { data, error } = await supabase
        .from('care_plans')
        .select('*')
        .eq('id', carePlanId)
        .single();
      if (error) {
        if ((error as any)?.code === 'PGRST116') return null;
        throw error;
      }
      const carePlan: CarePlan = {
        id: data.id,
        userId: data.user_id,
        patientName: data.patient_name,
        conditions: data.conditions,
        riskLevel: data.risk_level,
        overallHealthScore: data.overall_health_score,
        goals: data.goals,
        recommendations: data.recommendations,
        emergencyPlan: data.emergency_plan,
        nextReviewDate: data.next_review_date,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      return carePlan;
    } catch (error) {
      console.error('Error fetching care plan by id:', error);
      return null;
    }
  }
}

export const carePlanService = new CarePlanService();