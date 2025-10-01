import { useState } from 'react';
import { Calendar, Pill, Activity, Utensils, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

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
  const [medications, setMedications] = useState<Medication[]>([
    { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', time: '8:00 AM', taken: true },
    { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', time: '8:00 PM', taken: false },
    { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', time: '8:00 AM', taken: true },
    { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily', time: '9:00 PM', taken: false },
  ]);

  const [recommendations] = useState<Recommendation[]>([
    {
      category: 'Diet',
      title: 'Reduce carbohydrate intake at dinner',
      description: 'Your evening glucose readings are elevated. Try reducing carbs by 30% at dinner and monitor for improvement.',
      priority: 'high',
      icon: Utensils
    },
    {
      category: 'Exercise',
      title: 'Add 15-minute post-meal walks',
      description: 'Walking after meals can help lower blood glucose levels by 20-30%. Start with dinner walks.',
      priority: 'high',
      icon: Activity
    },
    {
      category: 'Monitoring',
      title: 'Check blood pressure twice daily',
      description: 'Your recent readings show variability. Monitor morning and evening for better tracking.',
      priority: 'medium',
      icon: Calendar
    },
    {
      category: 'Medication',
      title: 'Take evening medications before 9 PM',
      description: 'Consistency in timing improves medication effectiveness. Set a daily reminder.',
      priority: 'medium',
      icon: Pill
    },
  ]);

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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
