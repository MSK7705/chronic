import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import DataEntry from './components/DataEntry';
import RiskAssessment from './components/RiskAssessment';
import CarePlan from './components/CarePlan';
import WearableSync from './components/WearableSync';
import Login from './components/Login';
import SignUp from './components/SignUp';
import { Activity, Heart, Stethoscope, FileText, Smartphone } from 'lucide-react';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

type TabType = 'dashboard' | 'entry' | 'risk' | 'care' | 'devices';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const location = useLocation();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleDataUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'entry', label: 'Data Entry', icon: Heart },
    { id: 'risk', label: 'Risk Assessment', icon: Stethoscope },
    { id: 'care', label: 'Care Plan', icon: FileText },
    { id: 'devices', label: 'Devices', icon: Smartphone },
  ];

  return (
    <Routes>
      <Route 
        path="/signup" 
        element={!session ? <SignUp /> : <Navigate to="/" />} 
      />
      <Route 
        path="/login" 
        element={!session ? <Login /> : <Navigate to="/" />} 
      />
      <Route 
        path="/" 
        element={
          session ? (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
              {/* Header */}
              <header className="bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="py-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                          <img 
                            src="/assets/logo.svg" 
                            alt="Health Icon" 
                            className="w-12 h-12"
                          />
                        </div>
                        <div>
                          <h1 className="text-3xl font-bold text-slate-900">HealthGuard</h1>
                          <p className="text-sm text-slate-600 mt-0.5">Chronic Disease Management Platform</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleSignOut}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>

                  {/* Navigation Tabs */}
                  <nav className="flex space-x-1 -mb-px">
                    {tabs.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => setActiveTab(id as TabType)}
                        className={`
                          flex items-center space-x-2 px-6 py-3 font-medium text-sm transition-all duration-200
                          ${activeTab === id
                            ? 'border-b-3 border-emerald-600 text-emerald-700 bg-emerald-50/50'
                            : 'border-b-3 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </header>

              {/* Main Content */}
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="animate-fadeIn">
                  {activeTab === 'dashboard' && <Dashboard key={refreshTrigger} />}
                  {activeTab === 'entry' && <DataEntry onDataSubmit={handleDataUpdate} />}
                  {activeTab === 'risk' && <RiskAssessment />}
                  {activeTab === 'care' && <CarePlan />}
                  {activeTab === 'devices' && <WearableSync onSync={handleDataUpdate} />}
                </div>
              </main>
            </div>
          ) : (
            <Navigate to="/login" />
          )
        } 
      />
    </Routes>
  );
}

export default App;
