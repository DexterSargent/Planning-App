import React, { useState, useEffect, useMemo } from 'react';
import MuscleDiagram from '../Training/MuscleDiagram';
import { fetchJson } from '../../services/api';
import { TrendingUp, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, CartesianGrid, Legend, Dumbbell, Utensils, LayoutDashboard } from 'lucide-react';

const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#eab308', '#ef4444'];

export default function Analytics({ workouts = [], exercises = [], workoutExercises = {}, fetchWorkoutExercises = null, recipes = [] }) {
  const [timeframe, setTimeframe] = useState('30'); // '7', '30', '90', 'all'
  const [analyticsEvents, setAnalyticsEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'training', 'diet'
  
  const [selectedAnalyticsMuscle, setSelectedAnalyticsMuscle] = useState(null);

  // Lift logs state
  const [liftLogs, setLiftLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Log forms state
  const [showLiftLogForm, setShowLiftLogForm] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [newLiftWeight, setNewLiftWeight] = useState('');
  const [newLiftSets, setNewLiftSets] = useState('3');
  const [newLiftReps, setNewLiftReps] = useState('10');
  const [newLiftDate, setNewLiftDate] = useState(new Date().toISOString().split('T')[0]);

  // Load backend logs on mount
  useEffect(() => {
    loadLogs();
  }, []);

  // Fetch events for the selected timeframe independent of the calendar view
  useEffect(() => {
    let active = true;
    const end = new Date();
    // Add 7 days to end date to catch future planned events too
    end.setDate(end.getDate() + 7); 
    const start = new Date();
    
    if (timeframe === 'all') {
      start.setFullYear(2020, 0, 1);
    } else {
      start.setDate(end.getDate() - Number(timeframe) - 7);
    }
    
    const endStr = end.toISOString().split('T')[0];
    const startStr = start.toISOString().split('T')[0];
    
    fetchJson(`/calendar?start_date=${startStr}&end_date=${endStr}`).then(data => {
      if (active) setAnalyticsEvents(data);
    });
    
    return () => { active = false; };
  }, [timeframe]);

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const liftsRes = await fetchJson('/logs/lifts').catch(() => []);
      setLiftLogs(Array.isArray(liftsRes) ? liftsRes : []);
    } catch (err) {
      console.error('Failed loading analytics logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Filter dates based on timeframe
  const isDateInTimeframe = (dateStr) => {
    if (!dateStr || timeframe === 'all') return true;
    const dateObj = new Date(dateStr);
    const now = new Date();
    const diffDays = (now - dateObj) / (1000 * 60 * 60 * 24);
    return diffDays <= Number(timeframe) && diffDays >= -1;
  };

  // Filtered Training Sessions
  const filteredTrainingEvents = useMemo(() => {
    return analyticsEvents.filter((ev) => {
      const isTraining = ev.event_type === 'Training' || ev.ref_workout_id;
      const isCompleted = ev.is_completed === 1 || ev.is_completed === true;
      return isTraining && isCompleted && isDateInTimeframe(ev.event_date);
    });
  }, [analyticsEvents, timeframe]);
  
  // Auto-fetch missing exercises for the current timeframe's training events
  useEffect(() => {
    if (!fetchWorkoutExercises) return;
    const missingIds = new Set();
    filteredTrainingEvents.forEach((ev) => {
      const wid = ev.ref_workout_id;
      if (wid && !workoutExercises[wid]) {
        missingIds.add(wid);
      }
    });
    missingIds.forEach((id) => {
      fetchWorkoutExercises(id);
    });
  }, [filteredTrainingEvents, workoutExercises, fetchWorkoutExercises]);
  
  // Calculate Time Split (Event Types Breakdown)
  const timeSplitData = useMemo(() => {
    const split = {};
    analyticsEvents.filter(ev => isDateInTimeframe(ev.event_date)).forEach(ev => {
      const type = ev.event_type || 'Other';
      split[type] = (split[type] || 0) + (Number(ev.duration_mins) || 0);
    });
    return Object.entries(split).map(([name, value]) => ({ name, value })).filter(item => item.value > 0).sort((a,b) => b.value - a.value);
  }, [analyticsEvents, timeframe]);

  // Calculate Meal Frequencies
  const mealFrequenciesData = useMemo(() => {
    const freqs = {};
    analyticsEvents.filter(ev => isDateInTimeframe(ev.event_date) && ev.ref_recipe_id).forEach(ev => {
      const recipe = recipes.find(r => r.id === ev.ref_recipe_id) || { name: `Recipe #${ev.ref_recipe_id}` };
      freqs[recipe.name] = (freqs[recipe.name] || 0) + 1;
    });
    return Object.entries(freqs).map(([name, value]) => ({ name, value })).filter(item => item.value > 0).sort((a,b) => b.value - a.value);
  }, [analyticsEvents, timeframe, recipes]);

  // Calculate timeframe Muscle Frequencies & Drilldown Data
  const { muscleFrequencies, muscleDrilldown, totalTrainingMinutes } = useMemo(() => {
    const freqs = {};
    const drilldown = {};
    let totalMins = 0;

    filteredTrainingEvents.forEach((ev) => {
      totalMins += Number(ev.duration_mins) || 45;
      const workout = workouts.find((w) => w.id === Number(ev.ref_workout_id));
      if (workout) {
        const items = workoutExercises[workout.id] || workout.exercise_list || workout.items || [];
        items.forEach((item) => {
          const ex = exercises.find((e) => e.id === Number(item.exercise_id));
          if (ex && ex.category) {
            const catStr = ex.category;
            const categories = catStr.split(',').map((c) => c.trim()).filter(Boolean);
            const setsCount = Number(item.sets) || 3;

            const keysToUpdate = new Set();
            categories.forEach((cat) => {
              const lower = cat.toLowerCase();
              if (lower.includes('chest')) keysToUpdate.add('Chest');
              if (lower.includes('back') || lower.includes('lats') || lower.includes('traps')) keysToUpdate.add('Back');
              if (lower.includes('shoulders') || lower.includes('delt')) keysToUpdate.add('Shoulders');
              if (lower.includes('biceps')) keysToUpdate.add('Biceps');
              if (lower.includes('triceps')) keysToUpdate.add('Triceps');
              if (lower.includes('quads') || lower.includes('thighs') || lower.includes('leg')) keysToUpdate.add('Quads');
              if (lower.includes('hamstrings')) keysToUpdate.add('Hamstrings');
              if (lower.includes('glutes')) keysToUpdate.add('Glutes');
              if (lower.includes('calves')) keysToUpdate.add('Calves');
              if (lower.includes('core') || lower.includes('abs')) keysToUpdate.add('Core');
            });

            keysToUpdate.forEach((key) => {
              freqs[key] = (freqs[key] || 0) + setsCount;
              if (!drilldown[key]) drilldown[key] = [];
              drilldown[key].push({
                exerciseName: ex.name,
                sets: setsCount,
                reps: item.reps || '-',
                date: ev.event_date,
                workoutTitle: ev.title || workout.name,
              });
            });
          }
        });
      }
    });

    return { muscleFrequencies: freqs, muscleDrilldown: drilldown, totalTrainingMinutes: totalMins };
  }, [filteredTrainingEvents, workouts, exercises, workoutExercises]);

  const muscleFrequenciesData = useMemo(() => {
    return Object.entries(muscleFrequencies).map(([name, sets]) => ({ name, sets })).sort((a,b) => b.sets - a.sets).slice(0, 8);
  }, [muscleFrequencies]);

  const selectedMuscleExercisesData = useMemo(() => {
    if (!selectedAnalyticsMuscle || !muscleDrilldown[selectedAnalyticsMuscle]) return [];
    const aggregated = {};
    muscleDrilldown[selectedAnalyticsMuscle].forEach(item => {
      aggregated[item.exerciseName] = (aggregated[item.exerciseName] || 0) + item.sets;
    });
    return Object.entries(aggregated).map(([name, sets]) => ({ name, sets })).sort((a,b) => b.sets - a.sets);
  }, [muscleDrilldown, selectedAnalyticsMuscle]);

  // Handle saving new lift log
  const handleCreateLiftLog = async (e) => {
    e.preventDefault();
    if (!selectedExerciseId || !newLiftWeight) return;
    try {
      await fetchJson('/logs/lifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_id: parseInt(selectedExerciseId, 10),
          weight: parseFloat(newLiftWeight),
          sets: parseInt(newLiftSets, 10) || 3,
          reps: newLiftReps || '10',
          log_date: newLiftDate,
        }),
      });
      setNewLiftWeight('');
      setShowLiftLogForm(false);
      loadLogs();
    } catch (err) {
      alert(`Error logging lift: ${err.message}`);
    }
  };

  const filteredLiftLogs = useMemo(() => {
    return liftLogs
      .filter((l) => isDateInTimeframe(l.log_date))
      .sort((a, b) => new Date(a.log_date) - new Date(b.log_date)); // Sort ascending for charts!
  }, [liftLogs, timeframe]);

  // Filtered Lift chart data for the currently selected exercise
  const liftChartData = useMemo(() => {
    if (!selectedExerciseId) return [];
    return filteredLiftLogs.filter(l => l.exercise_id === Number(selectedExerciseId)).map(l => {
      const weights = String(l.weight).split(',').map(Number).filter(n => !isNaN(n));
      const maxWeight = weights.length > 0 ? Math.max(...weights) : parseFloat(l.weight) || 0;
      return { ...l, weight: maxWeight };
    });
  }, [filteredLiftLogs, selectedExerciseId]);

  // Total Volume Over Time Data
  const volumeChartData = useMemo(() => {
    const volumeByDate = {};
    filteredLiftLogs.forEach(l => {
      const weights = String(l.weight).split(',').map(Number).filter(n => !isNaN(n));
      let totalVolume = 0;
      const reps = Number(l.reps) || 1;
      if (weights.length > 0) {
         totalVolume = weights.reduce((sum, w) => sum + (w * reps), 0);
      } else {
         const w = parseFloat(l.weight) || 0;
         const sets = Number(l.sets) || 1;
         totalVolume = w * sets * reps;
      }
      volumeByDate[l.log_date] = (volumeByDate[l.log_date] || 0) + totalVolume;
    });
    return Object.entries(volumeByDate)
      .map(([date, vol]) => ({ log_date: date, volume: vol }))
      .sort((a,b) => new Date(a.log_date) - new Date(b.log_date));
  }, [filteredLiftLogs]);

  return (
    <section className="panel-grid analytics-grid" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Timeframe Filter Bar */}
      <div className="card" style={{ padding: '18px 22px', background: 'var(--card-bg)', borderRadius: '14px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={24} /> Training & Performance Analytics
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Track your workout progression, dietary habits, and time management
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg)', padding: '5px', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <button type="button" className={timeframe === '7' ? 'primary-button' : 'secondary-button'} style={{ padding: '6px 14px', fontSize: '0.82rem', borderRadius: '8px', border: timeframe === '7' ? 'none' : '1px solid transparent' }} onClick={() => setTimeframe('7')}>Last 7 Days</button>
          <button type="button" className={timeframe === '30' ? 'primary-button' : 'secondary-button'} style={{ padding: '6px 14px', fontSize: '0.82rem', borderRadius: '8px', border: timeframe === '30' ? 'none' : '1px solid transparent' }} onClick={() => setTimeframe('30')}>Last 30 Days</button>
          <button type="button" className={timeframe === '90' ? 'primary-button' : 'secondary-button'} style={{ padding: '6px 14px', fontSize: '0.82rem', borderRadius: '8px', border: timeframe === '90' ? 'none' : '1px solid transparent' }} onClick={() => setTimeframe('90')}>Last 90 Days</button>
          <button type="button" className={timeframe === 'all' ? 'primary-button' : 'secondary-button'} style={{ padding: '6px 14px', fontSize: '0.82rem', borderRadius: '8px', border: timeframe === 'all' ? 'none' : '1px solid transparent' }} onClick={() => setTimeframe('all')}>All Time</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '20px' }}>
        <button
          type="button"
          style={{ background: 'none', border: 'none', padding: '10px 16px', fontSize: '1rem', cursor: 'pointer', fontWeight: 600, color: activeTab === 'dashboard' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'dashboard' ? '2px solid var(--primary)' : '2px solid transparent' }}
          onClick={() => setActiveTab('dashboard')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><BarChart size={18} /> Dashboard</div>
        </button>
        <button
          type="button"
          style={{ background: 'none', border: 'none', padding: '10px 16px', fontSize: '1rem', cursor: 'pointer', fontWeight: 600, color: activeTab === 'training' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'training' ? '2px solid var(--primary)' : '2px solid transparent' }}
          onClick={() => setActiveTab('training')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Dumbbell size={18} /> Training Graphs</div>
        </button>
        <button
          type="button"
          style={{ background: 'none', border: 'none', padding: '10px 16px', fontSize: '1rem', cursor: 'pointer', fontWeight: 600, color: activeTab === 'diet' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'diet' ? '2px solid var(--primary)' : '2px solid transparent' }}
          onClick={() => setActiveTab('diet')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Utensils size={18} /> Diet & Misc Data</div>
        </button>
      </div>

      {/* TAB CONTENT: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ padding: '16px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Training Sessions</span>
              <h3 style={{ fontSize: '1.8rem', margin: '6px 0', color: 'var(--primary)' }}>{filteredTrainingEvents.length}</h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Workouts scheduled / logged</span>
            </div>

            <div className="card" style={{ padding: '16px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Training Time</span>
              <h3 style={{ fontSize: '1.8rem', margin: '6px 0', color: '#22c55e' }}>{Math.round(totalTrainingMinutes / 60 * 10) / 10} hrs</h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>({totalTrainingMinutes} mins across {timeframe === 'all' ? 'all history' : `${timeframe} days`})</span>
            </div>

            <div className="card" style={{ padding: '16px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top Worked Muscle</span>
              <h3 style={{ fontSize: '1.6rem', margin: '6px 0', color: '#eab308' }}>
                {Object.entries(muscleFrequencies).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None yet'}
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {Object.entries(muscleFrequencies).sort((a, b) => b[1] - a[1])[0]?.[1] || 0} total sets completed
              </span>
            </div>
            
            <div className="card" style={{ padding: '16px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Meals Tracked</span>
              <h3 style={{ fontSize: '1.8rem', margin: '6px 0', color: '#a855f7' }}>
                {mealFrequenciesData.reduce((acc, curr) => acc + curr.count, 0)}
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                across {mealFrequenciesData.length} distinct recipes
              </span>
            </div>
          </div>
          
          <div className="card" style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '14px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem' }}>Muscle Volume Heatmap</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Color intensity scales relatively based on your highest-volume muscle group. Switch to the <strong>Training Graphs</strong> tab for detailed breakdowns.
            </p>
            <div style={{ display: 'inline-block' }}>
              <MuscleDiagram
                selectedMuscle={null}
                onSelectMuscle={() => {}}
                muscleFrequencies={muscleFrequencies}
                relativeColoring={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: TRAINING GRAPHS */}
      {activeTab === 'training' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(400px, 1.5fr)', gap: '20px', alignItems: 'start' }}>
            
            {/* Left: Overall Muscle Frequency Progress Bars & Drilldown */}
            <div className="card" style={{ padding: '18px', background: 'var(--card-bg)', borderRadius: '14px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {selectedAnalyticsMuscle ? <><Search size={18} /> Drilldown: {selectedAnalyticsMuscle}</> : <><BarChart size={18} /> Top Muscle Volume Ranking</>}
                </h3>
                {selectedAnalyticsMuscle && (
                  <button type="button" className="secondary-button" style={{ padding: '3px 10px', fontSize: '0.75rem' }} onClick={() => setSelectedAnalyticsMuscle(null)}>
                    Clear Selection
                  </button>
                )}
              </div>

              {selectedAnalyticsMuscle ? (
                /* Specific Muscle Drilldown Bar Chart */
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 0 }}>
                    Exercise breakdown for <strong>{selectedAnalyticsMuscle}</strong>:
                  </p>
                  {selectedMuscleExercisesData.length > 0 ? (
                    <div style={{ width: '100%', height: 320 }}>
                      <ResponsiveContainer>
                        <BarChart data={selectedMuscleExercisesData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                          <XAxis type="number" stroke="var(--text-muted)" />
                          <YAxis type="category" dataKey="name" width={100} stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                          <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                          <Bar dataKey="sets" fill="#22c55e" radius={[0, 4, 4, 0]} name="Total Sets" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                      No exercises logged for {selectedAnalyticsMuscle} in this timeframe.
                    </div>
                  )}
                </div>
              ) : (
                /* Overall Muscle Frequency Bar Chart */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 0 }}>
                    Click a bar to view detailed exercise breakdown:
                  </p>
                  {muscleFrequenciesData.length > 0 ? (
                    <div style={{ width: '100%', height: 320 }}>
                      <ResponsiveContainer>
                        <BarChart data={muscleFrequenciesData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }} onClick={(data) => { if(data && data.activeLabel) setSelectedAnalyticsMuscle(data.activeLabel); }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                          <XAxis type="number" stroke="var(--text-muted)" />
                          <YAxis type="category" dataKey="name" width={80} stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                          <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                          <Bar dataKey="sets" fill="#eab308" radius={[0, 4, 4, 0]} name="Total Sets" style={{ cursor: 'pointer' }} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                      No workout sessions scheduled yet in this timeframe. Program workouts in your Schedule to see muscle volume rankings!
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Lift Progression Tracker */}
            <div className="card" style={{ padding: '18px', background: 'var(--card-bg)', borderRadius: '14px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Dumbbell size={20} /> Lift Progression
                </h3>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <select className="form-control" style={{ padding: '6px 12px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} value={selectedExerciseId} onChange={(e) => setSelectedExerciseId(e.target.value)}>
                    <option value="">-- Select Exercise --</option>
                    {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                  </select>

                  <button type="button" className="primary-button" style={{ padding: '6px 14px', fontSize: '0.82rem' }} onClick={() => {
                    if (!selectedExerciseId && exercises.length > 0) setSelectedExerciseId(exercises[0].id);
                    setShowLiftLogForm(!showLiftLogForm);
                  }}>
                    {showLiftLogForm ? '✕ Close' : '+ Log'}
                  </button>
                </div>
              </div>

              {/* Quick Log Lift Modal/Card */}
              {showLiftLogForm && (
                <form onSubmit={handleCreateLiftLog} style={{ background: 'var(--bg)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: '2 1 180px' }}>
                    <label style={{ fontSize: '0.78rem', display: 'block', marginBottom: '4px' }}>Exercise *</label>
                    <select required value={selectedExerciseId} onChange={(e) => setSelectedExerciseId(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                      <option value="">Select Exercise...</option>
                      {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: '1 1 80px' }}>
                    <label style={{ fontSize: '0.78rem', display: 'block', marginBottom: '4px' }}>Lbs *</label>
                    <input type="number" step="0.5" required placeholder="225" value={newLiftWeight} onChange={(e) => setNewLiftWeight(e.target.value)} style={{ width: '100%', padding: '6px 10px' }} />
                  </div>
                  <div style={{ flex: '1 1 60px' }}>
                    <label style={{ fontSize: '0.78rem', display: 'block', marginBottom: '4px' }}>Sets</label>
                    <input type="number" placeholder="3" value={newLiftSets} onChange={(e) => setNewLiftSets(e.target.value)} style={{ width: '100%', padding: '6px 10px' }} />
                  </div>
                  <div style={{ flex: '1 1 60px' }}>
                    <label style={{ fontSize: '0.78rem', display: 'block', marginBottom: '4px' }}>Reps</label>
                    <input type="text" placeholder="8" value={newLiftReps} onChange={(e) => setNewLiftReps(e.target.value)} style={{ width: '100%', padding: '6px 10px' }} />
                  </div>
                  <div style={{ flex: '1 1 130px' }}>
                    <label style={{ fontSize: '0.78rem', display: 'block', marginBottom: '4px' }}>Date</label>
                    <input type="date" value={newLiftDate} onChange={(e) => setNewLiftDate(e.target.value)} style={{ width: '100%', padding: '6px 10px' }} />
                  </div>
                  <button type="submit" className="primary-button" style={{ padding: '7px 18px' }}>Save</button>
                </form>
              )}

              {/* Lifts Line Chart */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {liftChartData.length > 0 ? (
                  <div style={{ width: '100%', height: 350 }}>
                    <ResponsiveContainer>
                      <LineChart data={liftChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="log_date" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                        <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                        <RechartsTooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="weight" name="Weight (lbs)" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg)', borderRadius: '8px', color: 'var(--text-muted)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedExerciseId
                      ? 'No progression data for this exercise in the current timeframe.'
                      : 'Select an exercise to view its weight progression chart.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Full Width: Total Volume Over Time */}
          <div className="card" style={{ padding: '18px', background: 'var(--card-bg)', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} /> Total Volume Over Time
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Tracks total weight lifted across all exercises (Sets × Reps × Weight) per session to measure progressive overload.
            </p>
            {volumeChartData.length > 0 ? (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <AreaChart data={volumeChartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="log_date" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="volume" name="Total Volume (lbs)" stroke="#22c55e" fillOpacity={1} fill="url(#colorVolume)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                No training volume data found for the current timeframe.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: DIET & MISC DATA */}
      {activeTab === 'diet' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '20px', alignItems: 'start' }}>
          
          {/* Meal Frequency Bar Chart */}
          <div className="card" style={{ padding: '18px', background: 'var(--card-bg)', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Utensils size={18} /> Most Eaten Meals</h3>
            {mealFrequenciesData.length > 0 ? (
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                  <BarChart data={mealFrequenciesData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                    <XAxis type="number" stroke="var(--text-muted)" />
                    <YAxis type="category" dataKey="name" width={120} stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                    <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="#a855f7" radius={[0, 4, 4, 0]} name="Meals Eaten" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                No meals tracked in this timeframe. Add meals to your calendar!
              </div>
            )}
          </div>

          {/* Time Split Pie Chart */}
          <div className="card" style={{ padding: '18px', background: 'var(--card-bg)', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '1.1rem' }}>⏱️ Time Split (Minutes)</h3>
            <p style={{ margin: '0 0 14px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Breakdown of how your schedule is allocated</p>
            {timeSplitData.length > 0 ? (
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={timeSplitData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} fill="#8884d8" label>
                      {timeSplitData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                No events scheduled to break down time usage.
              </div>
            )}
          </div>
          
        </div>
      )}

    </section>
  );
}
