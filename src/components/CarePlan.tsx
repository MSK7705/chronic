import { useState, useEffect } from 'react';
import { Calendar, Pill, Activity, Utensils, AlertCircle, CheckCircle2, Clock, Heart, Target, Shield, TrendingUp } from 'lucide-react';
import { carePlanService } from '../services/carePlanService';
import { supabase } from '../lib/supabase';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  taken: boolean;
}

interface Recommendation {
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  icon: any;
}

function CarePlan() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [carePlan, setCarePlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCarePlan();
  }, []);

  const loadCarePlan = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to view your care plan');
        return;
      }

      // Try to get existing care plan first
      let plan = await carePlanService.getLatestCarePlan(user.id);
      
      // If no plan exists, generate one
      if (!plan) {
        // Get user profile for patient name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        const patientName = profile?.full_name || 'Patient';
        plan = await carePlanService.generateCarePlan(user.id, patientName);
        
        if (plan) {
          await carePlanService.storeCarePlan(plan);
        }
      }

      if (plan) {
        setCarePlan(plan);
        
        // Convert care plan recommendations to component format
        const formattedRecommendations = plan.recommendations.map((rec: any) => ({
          category: rec.type,
          title: rec.title,
          description: rec.description,
          priority: rec.priority,
          icon: getIconForCategory(rec.type)
        }));
        
        setRecommendations(formattedRecommendations);
        
        // Set sample medications based on conditions
        const sampleMedications = generateSampleMedications(plan.conditions);
        setMedications(sampleMedications);
      }
    } catch (err) {
      console.error('Error loading care plan:', err);
      setError('Failed to load care plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getIconForCategory = (category: string) => {
    switch (category.toLowerCase()) {
      case 'diet':
      case 'nutrition':
        return Utensils;
      case 'exercise':
      case 'activity':
        return Activity;
      case 'medication':
        return Pill;
      case 'monitoring':
        return Heart;
      case 'lifestyle':
        return Target;
      default:
        return AlertCircle;
    }
  };

  const generateSampleMedications = (conditions: string[]) => {
    const medications: Medication[] = [];
    
    if (conditions.includes('diabetes')) {
      medications.push(
        { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', time: '8:00 AM', taken: true },
        { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', time: '8:00 PM', taken: false }
      );
    }
    
    if (conditions.includes('hypertension')) {
      medications.push(
        { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', time: '8:00 AM', taken: true }
      );
    }
    
    if (conditions.includes('heart')) {
      medications.push(
        { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily', time: '9:00 PM', taken: false }
      );
    }
    
    return medications;
  };

  const toggleMedication = (index: number) => {
    setMedications(prev => prev.map((med, i) =>
      i === index ? { ...med, taken: !med.taken } : med
    ));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return {
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        text: 'text-rose-700',
        badge: 'bg-rose-100 text-rose-700'
      };
      case 'medium': return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        badge: 'bg-amber-100 text-amber-700'
      };
      case 'low': return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        badge: 'bg-blue-100 text-blue-700'
      };
      default: return {
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        text: 'text-slate-700',
        badge: 'bg-slate-100 text-slate-700'
      };
    }
  };

  const completedMeds = medications.filter(m => m.taken).length;
  const totalMeds = medications.length;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-lg text-slate-600">Loading your personalized care plan...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Error Loading Care Plan</h3>
              <p className="text-red-600 mt-1">{error}</p>
              <button 
                onClick={loadCarePlan}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Care Plan Header */}
      {carePlan && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Personalized Care Plan</h2>
              <p className="text-blue-100 mt-1">Generated for {carePlan.patientName}</p>
              <div className="flex items-center mt-3 space-x-4">
                <div className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  <span className="text-sm">Risk Level: {carePlan.riskLevel}</span>
                </div>
                <div className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  <span className="text-sm">Health Score: {carePlan.overallHealthScore}/100</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-100">Next Review</p>
              <p className="text-lg font-semibold">{new Date(carePlan.nextReviewDate).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Today's Medications</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{completedMeds}/{totalMeds}</p>
              <p className="text-xs text-slate-500 mt-1">Doses taken</p>
            </div>
            <div className="bg-emerald-100 p-3 rounded-xl">
              <Pill className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${(completedMeds / totalMeds) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Active Recommendations</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{recommendations.length}</p>
              <p className="text-xs text-slate-500 mt-1">Personalized for you</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl">
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Next Appointment</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">Oct 15</p>
              <p className="text-xs text-slate-500 mt-1">Dr. Johnson, 2:00 PM</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-xl">
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Medication Schedule */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900">Medication Schedule</h3>
          <span className="text-sm text-slate-500">Today, October 1</span>
        </div>

        <div className="space-y-3">
          {medications.map((med, index) => (
            <div
              key={index}
              className={`
                flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200
                ${med.taken
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-white border-slate-200 hover:border-slate-300'
                }
              `}
            >
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => toggleMedication(index)}
                  className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200
                    ${med.taken
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-slate-300 hover:border-emerald-500'
                    }
                  `}
                >
                  {med.taken && <CheckCircle2 className="w-4 h-4 text-white" />}
                </button>

                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${med.taken ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                    <Pill className={`w-5 h-5 ${med.taken ? 'text-emerald-600' : 'text-slate-600'}`} />
                  </div>
                  <div>
                    <p className={`font-semibold ${med.taken ? 'text-emerald-900' : 'text-slate-900'}`}>
                      {med.name}
                    </p>
                    <p className="text-sm text-slate-600">{med.dosage} - {med.frequency}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">{med.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI-Powered Recommendations */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-900">Personalized Care Recommendations</h3>
          <p className="text-sm text-slate-600 mt-1">Based on your health data and predictive analysis</p>
        </div>

        <div className="space-y-4">
          {recommendations.map((rec, index) => {
            const colors = getPriorityColor(rec.priority);
            return (
              <div
                key={index}
                className={`${colors.bg} border-2 ${colors.border} rounded-xl p-5 transition-all duration-200 hover:shadow-md`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`${colors.bg} p-3 rounded-lg`}>
                    <rec.icon className={`w-6 h-6 ${colors.text}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className={`text-xs font-semibold ${colors.badge} px-2 py-1 rounded-full uppercase`}>
                          {rec.category}
                        </span>
                      </div>
                      <span className={`text-xs font-medium ${colors.text} uppercase`}>
                        {rec.priority} priority
                      </span>
                    </div>

                    <h4 className="font-semibold text-slate-900 mt-2">{rec.title}</h4>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">{rec.description}</p>

                    <div className="flex items-center space-x-3 mt-4">
                      <button className={`text-sm font-medium ${colors.text} hover:underline`}>
                        Learn More
                      </button>
                      <button className={`text-sm font-medium ${colors.text} hover:underline`}>
                        Mark as Done
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly Goals */}
      <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-lg p-6 text-white">
        <h3 className="text-xl font-bold mb-6">Weekly Goals</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">Exercise Minutes</span>
              <span className="text-sm font-bold">140 / 150</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
              <div className="bg-white h-full rounded-full" style={{ width: '93%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">Glucose Readings</span>
              <span className="text-sm font-bold">18 / 21</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
              <div className="bg-white h-full rounded-full" style={{ width: '86%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">Medication Adherence</span>
              <span className="text-sm font-bold">6 / 7 days</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
              <div className="bg-white h-full rounded-full" style={{ width: '86%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">Water Intake</span>
              <span className="text-sm font-bold">52 / 56 cups</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
              <div className="bg-white h-full rounded-full" style={{ width: '93%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CarePlan;
