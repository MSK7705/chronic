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
  // Analyze health data to determine conditions and risk factors
  async analyzeHealthData(userId: string): Promise<HealthDataAnalysis> {
    try {
      // Get latest health score
      const { data: healthScore } = await supabase
        .from('health_score')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Get recent vital signs
      const { data: vitalSigns } = await supabase
        .from('vital_signs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get wearable data for trends
      const { data: wearableData } = await supabase
        .from('wearable_data')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

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
        analysis.vitalSigns = {
          bloodPressure: latest.blood_pressure ? {
            systolic: latest.blood_pressure.systolic,
            diastolic: latest.blood_pressure.diastolic
          } : undefined,
          heartRate: latest.heart_rate,
          glucose: latest.glucose,
          weight: latest.weight,
          bmi: latest.bmi
        };

        // Determine conditions based on vital signs
        if (latest.glucose && latest.glucose > 126) {
          analysis.conditions.push('Type 2 Diabetes');
        } else if (latest.glucose && latest.glucose > 100) {
          analysis.conditions.push('Prediabetes');
        }

        if (latest.blood_pressure) {
          const { systolic, diastolic } = latest.blood_pressure;
          if (systolic >= 140 || diastolic >= 90) {
            analysis.conditions.push('Hypertension');
          } else if (systolic >= 130 || diastolic >= 80) {
            analysis.conditions.push('Elevated Blood Pressure');
          }
        }

        if (latest.bmi && latest.bmi >= 30) {
          analysis.conditions.push('Obesity');
        } else if (latest.bmi && latest.bmi >= 25) {
          analysis.conditions.push('Overweight');
        }
      }

      // Analyze trends if we have historical data
      if (vitalSigns && vitalSigns.length >= 3) {
        const recent = vitalSigns.slice(0, 3);
        const older = vitalSigns.slice(3, 6);

        if (recent.length >= 2 && older.length >= 2) {
          const recentAvgGlucose = recent.reduce((sum, v) => sum + (v.glucose || 0), 0) / recent.length;
          const olderAvgGlucose = older.reduce((sum, v) => sum + (v.glucose || 0), 0) / older.length;

          if (recentAvgGlucose < olderAvgGlucose - 10) {
            analysis.trends.improving.push('Blood Glucose');
          } else if (recentAvgGlucose > olderAvgGlucose + 10) {
            analysis.trends.worsening.push('Blood Glucose');
          } else {
            analysis.trends.stable.push('Blood Glucose');
          }
        }
      }

      // Determine risk factors
      if (analysis.complicationRisk > 0.7) {
        analysis.riskFactors.push('High Complication Risk');
      }
      if (analysis.adherenceRate < 0.8) {
        analysis.riskFactors.push('Poor Medication Adherence');
      }
      if (analysis.emergencyVisits > 2) {
        analysis.riskFactors.push('Frequent Emergency Visits');
      }

      return analysis;
    } catch (error) {
      console.error('Error analyzing health data:', error);
      throw error;
    }
  }

  // Generate care plan based on health analysis
  async generateCarePlan(userId: string, patientName: string): Promise<CarePlan> {
    const analysis = await this.analyzeHealthData(userId);
    
    const carePlan: CarePlan = {
      id: `cp_${Date.now()}`,
      userId,
      patientName,
      conditions: analysis.conditions,
      riskLevel: this.determineRiskLevel(analysis),
      overallHealthScore: analysis.healthScore,
      goals: this.generateGoals(analysis),
      recommendations: this.generateRecommendations(analysis),
      emergencyPlan: this.generateEmergencyPlan(analysis),
      nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store care plan in database
    await this.storeCarePlan(carePlan);
    
    return carePlan;
  }

  private determineRiskLevel(analysis: HealthDataAnalysis): 'low' | 'moderate' | 'high' | 'very-high' {
    let riskScore = 0;
    
    // Risk factors scoring
    if (analysis.conditions.includes('Type 2 Diabetes')) riskScore += 3;
    if (analysis.conditions.includes('Hypertension')) riskScore += 2;
    if (analysis.conditions.includes('Obesity')) riskScore += 2;
    if (analysis.complicationRisk > 0.8) riskScore += 3;
    if (analysis.emergencyVisits > 3) riskScore += 2;
    if (analysis.adherenceRate < 0.6) riskScore += 2;
    
    if (riskScore >= 8) return 'very-high';
    if (riskScore >= 5) return 'high';
    if (riskScore >= 2) return 'moderate';
    return 'low';
  }

  private generateGoals(analysis: HealthDataAnalysis): CarePlanGoal[] {
    const goals: CarePlanGoal[] = [];

    // Diabetes management goals
    if (analysis.conditions.includes('Type 2 Diabetes') || analysis.conditions.includes('Prediabetes')) {
      goals.push({
        id: `goal_glucose_${Date.now()}`,
        category: 'monitoring',
        title: 'Blood Glucose Control',
        description: 'Maintain blood glucose levels within target range',
        target: analysis.conditions.includes('Type 2 Diabetes') ? 'HbA1c < 7%' : 'Fasting glucose < 100 mg/dL',
        timeframe: '3 months',
        priority: 'high',
        status: 'active',
        progress: 0
      });

      goals.push({
        id: `goal_diet_${Date.now()}`,
        category: 'lifestyle',
        title: 'Dietary Management',
        description: 'Follow diabetes-friendly meal plan',
        target: 'Consistent carbohydrate intake, 3 balanced meals daily',
        timeframe: 'Ongoing',
        priority: 'high',
        status: 'active',
        progress: 0
      });
    }

    // Hypertension management goals
    if (analysis.conditions.includes('Hypertension') || analysis.conditions.includes('Elevated Blood Pressure')) {
      goals.push({
        id: `goal_bp_${Date.now()}`,
        category: 'monitoring',
        title: 'Blood Pressure Control',
        description: 'Maintain blood pressure within target range',
        target: 'BP < 130/80 mmHg',
        timeframe: '2 months',
        priority: 'high',
        status: 'active',
        progress: 0
      });
    }

    // Weight management goals
    if (analysis.conditions.includes('Obesity') || analysis.conditions.includes('Overweight')) {
      goals.push({
        id: `goal_weight_${Date.now()}`,
        category: 'lifestyle',
        title: 'Weight Management',
        description: 'Achieve and maintain healthy weight',
        target: analysis.conditions.includes('Obesity') ? 'Lose 5-10% of body weight' : 'Maintain current weight',
        timeframe: '6 months',
        priority: 'medium',
        status: 'active',
        progress: 0
      });
    }

    // Medication adherence goal
    if (analysis.adherenceRate < 0.9) {
      goals.push({
        id: `goal_adherence_${Date.now()}`,
        category: 'medication',
        title: 'Medication Adherence',
        description: 'Improve medication compliance',
        target: 'Take medications as prescribed >90% of the time',
        timeframe: '1 month',
        priority: 'high',
        status: 'active',
        progress: Math.round(analysis.adherenceRate * 100)
      });
    }

    return goals;
  }

  private generateRecommendations(analysis: HealthDataAnalysis): CarePlanRecommendation[] {
    const recommendations: CarePlanRecommendation[] = [];

    // Diabetes recommendations
    if (analysis.conditions.includes('Type 2 Diabetes')) {
      recommendations.push({
        id: `rec_glucose_monitoring_${Date.now()}`,
        type: 'monitoring',
        title: 'Blood Glucose Monitoring',
        description: 'Monitor blood glucose levels regularly',
        rationale: 'Regular monitoring helps track diabetes control and adjust treatment',
        frequency: 'Daily before meals and bedtime',
        priority: 'high',
        evidenceLevel: 'A'
      });

      recommendations.push({
        id: `rec_diabetes_education_${Date.now()}`,
        type: 'education',
        title: 'Diabetes Self-Management Education',
        description: 'Participate in structured diabetes education program',
        rationale: 'Education improves self-management skills and outcomes',
        frequency: 'Initial program, annual refresher',
        priority: 'high',
        evidenceLevel: 'A'
      });
    }

    // Hypertension recommendations
    if (analysis.conditions.includes('Hypertension')) {
      recommendations.push({
        id: `rec_bp_monitoring_${Date.now()}`,
        type: 'monitoring',
        title: 'Blood Pressure Monitoring',
        description: 'Monitor blood pressure at home',
        rationale: 'Home monitoring improves BP control and medication adherence',
        frequency: 'Daily, same time each day',
        priority: 'high',
        evidenceLevel: 'A'
      });

      recommendations.push({
        id: `rec_sodium_reduction_${Date.now()}`,
        type: 'diet',
        title: 'Sodium Restriction',
        description: 'Limit sodium intake to <2300mg per day',
        rationale: 'Sodium reduction lowers blood pressure',
        frequency: 'Daily',
        priority: 'medium',
        evidenceLevel: 'A'
      });
    }

    // General lifestyle recommendations
    recommendations.push({
      id: `rec_exercise_${Date.now()}`,
      type: 'exercise',
      title: 'Regular Physical Activity',
      description: 'Engage in moderate-intensity aerobic exercise',
      rationale: 'Exercise improves glucose control, blood pressure, and overall health',
      frequency: '150 minutes per week, spread over 3-5 days',
      priority: 'high',
      evidenceLevel: 'A'
    });

    recommendations.push({
      id: `rec_nutrition_${Date.now()}`,
      type: 'diet',
      title: 'Balanced Nutrition',
      description: 'Follow a balanced, nutrient-rich diet',
      rationale: 'Proper nutrition supports chronic disease management',
      frequency: 'Daily meal planning',
      priority: 'high',
      evidenceLevel: 'A'
    });

    // Medication adherence recommendation
    if (analysis.adherenceRate < 0.9) {
      recommendations.push({
        id: `rec_med_adherence_${Date.now()}`,
        type: 'medication',
        title: 'Medication Adherence Support',
        description: 'Use pill organizers, reminders, and regular pharmacy consultations',
        rationale: 'Good adherence is essential for treatment effectiveness',
        frequency: 'Daily medication routine',
        priority: 'high',
        evidenceLevel: 'A'
      });
    }

    return recommendations;
  }

  private generateEmergencyPlan(analysis: HealthDataAnalysis): CarePlan['emergencyPlan'] {
    const warningSignsDescription = this.getWarningSignsForConditions(analysis.conditions);
    const emergencyActions = this.getEmergencyActionsForConditions(analysis.conditions);
    
    return {
      warningSignsDescription,
      emergencyActions,
      emergencyContacts: [
        'Primary Care Provider',
        'Emergency Services: 911',
        'Poison Control: 1-800-222-1222'
      ]
    };
  }

  private getWarningSignsForConditions(conditions: string[]): string {
    const signs: string[] = [];
    
    if (conditions.includes('Type 2 Diabetes') || conditions.includes('Prediabetes')) {
      signs.push('Severe high blood sugar (>300 mg/dL), excessive thirst, frequent urination, nausea, vomiting');
      signs.push('Low blood sugar (<70 mg/dL), shakiness, sweating, confusion, rapid heartbeat');
    }
    
    if (conditions.includes('Hypertension')) {
      signs.push('Severe headache, chest pain, difficulty breathing, vision changes');
      signs.push('Blood pressure >180/120 mmHg');
    }
    
    return signs.join('; ');
  }

  private getEmergencyActionsForConditions(conditions: string[]): string[] {
    const actions: string[] = [];
    
    actions.push('Call 911 for severe symptoms or if unsure');
    actions.push('Contact primary care provider for urgent but non-emergency concerns');
    
    if (conditions.includes('Type 2 Diabetes')) {
      actions.push('For low blood sugar: consume 15g fast-acting carbs, recheck in 15 minutes');
      actions.push('For high blood sugar: check ketones if available, increase fluid intake');
    }
    
    if (conditions.includes('Hypertension')) {
      actions.push('For severe hypertension: rest in quiet environment, avoid sudden movements');
    }
    
    return actions;
  }

  // Store care plan in database
  async storeCarePlan(carePlan: CarePlan): Promise<void> {
    try {
      const { error } = await supabase
        .from('care_plans')
        .upsert({
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
          updated_at: carePlan.updatedAt
        });

      if (error) throw error;

      // Update cache after successful storage
      this.cachedCarePlan = carePlan;
      this.cacheTimestamp = Date.now();
    } catch (error) {
      console.error('Error storing care plan:', error);
      throw error;
    }
  }

  // Get latest care plan for user
  async getLatestCarePlan(userId: string): Promise<CarePlan | null> {
    try {
      // Check cache first
      const now = Date.now();
      if (this.cachedCarePlan && 
          this.cachedCarePlan.userId === userId && 
          (now - this.cacheTimestamp) < this.CACHE_DURATION) {
        return this.cachedCarePlan;
      }

      const { data, error } = await supabase
        .from('care_plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No data found
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
        updatedAt: data.updated_at
      };

      // Cache the result
      this.cachedCarePlan = carePlan;
      this.cacheTimestamp = now;

      return carePlan;
    } catch (error) {
      console.error('Error getting care plan:', error);
      throw error;
    }
  }

  // Update goal progress
  async updateGoalProgress(carePlanId: string, goalId: string, progress: number): Promise<void> {
    try {
      const carePlan = await this.getCarePlanById(carePlanId);
      if (!carePlan) throw new Error('Care plan not found');

      const updatedGoals = carePlan.goals.map(goal => 
        goal.id === goalId 
          ? { ...goal, progress, status: progress >= 100 ? 'completed' as const : goal.status }
          : goal
      );

      await supabase
        .from('care_plans')
        .update({
          goals: updatedGoals,
          updated_at: new Date().toISOString()
        })
        .eq('id', carePlanId);
    } catch (error) {
      console.error('Error updating goal progress:', error);
      throw error;
    }
  }

  private async getCarePlanById(carePlanId: string): Promise<CarePlan | null> {
    try {
      const { data, error } = await supabase
        .from('care_plans')
        .select('*')
        .eq('id', carePlanId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return {
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
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error getting care plan by ID:', error);
      throw error;
    }
  }
}

export const carePlanService = new CarePlanService();