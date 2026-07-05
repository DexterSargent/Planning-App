import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const eventTypeOptions = [
  { value: 'Work', label: 'Work' },
  { value: 'Training', label: 'Training' },
  { value: 'Meal', label: 'Meal' },
  { value: 'Commute', label: 'Commute' },
  { value: 'Social', label: 'Social' },
];
const eventColors = {
  'Work': '#7c3aed',
  'Training': '#2563eb',
  'Meal': '#10b981',
  'Commute': '#f59e0b',
  'Social': '#ec4899',
};

function parseISODateLocal(value) {
  if (!value) return new Date();
  if (typeof value === 'string') {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function formatDate(date) {
  const d = parseISODateLocal(date);
  return d.toISOString().slice(0, 10);
}

function getOrdinal(day) {
  if (day % 100 >= 11 && day % 100 <= 13) return 'th';
  if (day % 10 === 1) return 'st';
  if (day % 10 === 2) return 'nd';
  if (day % 10 === 3) return 'rd';
  return 'th';
}

function formatDateFull(date) {
  const d = parseISODateLocal(date);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const day = d.getDate();
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${day}${getOrdinal(day)}, ${d.getFullYear()}`;
}

function addDays(isoDate, days) {
  const d = parseISODateLocal(isoDate);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

function startOfWeek(isoDate) {
  const d = parseISODateLocal(isoDate);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return formatDate(d);
}

function monthRange(date) {
  const d = parseISODateLocal(date);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start: formatDate(start), end: formatDate(end) };
}

function getMonthGrid(date) {
  const d = parseISODateLocal(date);
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
  const endDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells = [];
  let current = 1 - startOffset;
  for (let i = 0; i < 35; i += 1) {
    const day = new Date(d.getFullYear(), d.getMonth(), current);
    cells.push({
      date: formatDate(day),
      active: day.getMonth() === d.getMonth(),
      label: day.getDate(),
      current: day.getMonth() === d.getMonth(),
    });
    current += 1;
  }
  return Array.from({ length: 5 }, (_, rowIndex) => cells.slice(rowIndex * 7, rowIndex * 7 + 7));
}

function getWeekDays(date) {
  const start = parseISODateLocal(startOfWeek(formatDate(date)));
  const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return {
      date: formatDate(current),
      weekday: weekdayNames[index],
      label: current.getDate(),
    };
  });
}

function getWeekdayIndex(date, weekStartDate) {
  const start = parseISODateLocal(weekStartDate);
  const current = parseISODateLocal(date);
  return Math.round((current - start) / (1000 * 60 * 60 * 24));
}

function getWeekRange(date) {
  const start = startOfWeek(formatDate(date));
  return { start, end: addDays(start, 6) };
}

function getMonthTitle(date) {
  const d = parseISODateLocal(date);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getHourlyGrid() {
  return Array.from({ length: 24 }, (_, hour) => ({
    label: `${hour.toString().padStart(2, '0')}:00`,
    hour,
  }));
}

function clampedMinutes(minutes) {
  return Math.max(0, Math.round(minutes));
}

const CALENDAR_ROW_HEIGHT = 84;

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [plannerTab, setPlannerTab] = useState('build');
  const [trainingTab, setTrainingTab] = useState('build');
  const [scheduleView, setScheduleView] = useState('week');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [ingredients, setIngredients] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [events, setEvents] = useState([]);
  const [workoutExercises, setWorkoutExercises] = useState({});
  const [recipeIngredients, setRecipeIngredients] = useState({});

  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [ingredientModalVisible, setIngredientModalVisible] = useState(false);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingExercise, setEditingExercise] = useState(null);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [exerciseLibrarySearch, setExerciseLibrarySearch] = useState('');
  const [ingredientLibrarySearch, setIngredientLibrarySearch] = useState('');
  const [dragInfo, setDragInfo] = useState(null);
  const weekGridRef = useRef(null);
  const eventPointerTargetRef = useRef(null);
  const eventClickInfoRef = useRef({ startTime: 0, startX: 0, startY: 0, eventId: null, pointerId: null });
  const cellClickInfoRef = useRef({ startTime: 0, startX: 0, startY: 0, date: null, pointerId: null });
  const CLICK_MAX_DURATION = 500;
  const CLICK_DRAG_THRESHOLD = 5;

  const [statusMessage, setStatusMessage] = useState('');
  const [theme, setTheme] = useState('light');

  const [exerciseForm, setExerciseForm] = useState({ name: '', category: '', one_rm: '' });
  const [ingredientForm, setIngredientForm] = useState({ name: '', kcal: '', cost: '', category: '' });
  const [workoutForm, setWorkoutForm] = useState({
    name: '',
    duration_mins: '',
    exercise_id: '',
    sets: '',
    reps: '',
    percent: '',
    items: [],
  });
  const [recipeForm, setRecipeForm] = useState({
    name: '',
    time_to_cook_mins: '',
    ingredient_id: '',
    quantity_g: '',
    items: [],
  });
  const [scheduleForm, setScheduleForm] = useState({
    category: 'Work',
    title: '',
    date: formatDate(new Date()),
    start_time: '',
    duration_mins: '',
    ref_workout_id: '',
    ref_recipe_id: '',
    min_duration: '',
    max_duration: '',
    notes: '',
  });

  const [dashboardPerformance, setDashboardPerformance] = useState({});

  const weekViewRange = useMemo(() => getWeekRange(selectedDate), [selectedDate]);
  const monthGrid = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);

  const currentDay = formatDate(selectedDate);
  const currentDayFull = formatDateFull(selectedDate);
  const weekDates = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const hourlyGrid = useMemo(() => getHourlyGrid(), []);
  const eventsByDate = useMemo(() => {
    const map = {};
    weekDates.forEach((day) => { map[day.date] = []; });
    events.forEach((event) => {
      if (map[event.event_date]) {
        map[event.event_date].push(event);
      }
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => (a.start_time || '00:00').localeCompare(b.start_time || '00:00')));
    return map;
  }, [events, weekDates]);
  const dayEvents = useMemo(
    () => events.filter((event) => event.event_date === currentDay),
    [events, currentDay],
  );
  const currentDayEvents = eventsByDate[currentDay] || [];
  const todayWorkouts = useMemo(
    () => dayEvents.filter((event) => event.event_type === 'Training'),
    [dayEvents],
  );
  const todayMeals = useMemo(
    () => dayEvents.filter((event) => event.event_type === 'Meal'),
    [dayEvents],
  );

  const filteredExercises = useMemo(() => {
    const query = exerciseLibrarySearch.trim().toLowerCase();
    if (!query) return exercises;
    return exercises.filter((exercise) => {
      const name = exercise.name?.toLowerCase() || '';
      const category = exercise.category?.toLowerCase() || '';
      return name.includes(query) || category.includes(query);
    });
  }, [exercises, exerciseLibrarySearch]);

  const filteredIngredients = useMemo(() => {
    const query = ingredientLibrarySearch.trim().toLowerCase();
    if (!query) return ingredients;
    return ingredients.filter((item) => {
      const name = item.name?.toLowerCase() || '';
      const category = item.category?.toLowerCase() || '';
      return name.includes(query) || category.includes(query);
    });
  }, [ingredients, ingredientLibrarySearch]);

  const scheduledMinutes = useMemo(() => {
    return dayEvents.reduce((sum, event) => {
      const duration = Number(event.duration_mins) || 60;
      return sum + duration;
    }, 0);
  }, [dayEvents]);
  const freeMinutes = clampedMinutes(18 * 60 - scheduledMinutes);
  const freeTimeLabel = `${Math.floor(freeMinutes / 60)}h ${freeMinutes % 60}m free`;

  const weekRangeLabel = `${new Date(new Date(weekViewRange.start).setDate(new Date(weekViewRange.start).getDate() + 1)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(new Date(weekViewRange.end).setDate(new Date(weekViewRange.end).getDate() + 1)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  const dayRangeLabel = `${new Date(currentDay).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

  const activeEventClasses = {
    work: 'Work',
    training: 'Training',
    meal: 'Meal',
    commute: 'Commute',
    social: 'Social',
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    loadScheduleRange();
  }, [scheduleView, selectedDate]);

  useEffect(() => {
    if (!(scheduleView === 'week' || scheduleView === 'day') || !weekGridRef.current) {
      return;
    }

    const viewEvents = scheduleView === 'week'
      ? weekDates.flatMap((day) => eventsByDate[day.date] || [])
      : currentDayEvents;

    const nextEvent = viewEvents.find((event) => event.start_time);
    if (!nextEvent) {
      return;
    }

    const [hour, minute] = nextEvent.start_time.split(':').map(Number);
    const position = scheduleView === 'week'
      ? Math.max(0, (hour + minute / 60 - 1) * CALENDAR_ROW_HEIGHT)
      : Math.max(0, (hour + minute / 60) * CALENDAR_ROW_HEIGHT);

    weekGridRef.current.scrollTop = position;
  }, [scheduleView, currentDayEvents, eventsByDate, weekDates]);

  async function fetchJson(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, options);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${response.status} ${response.statusText}: ${text}`);
    }
    return response.status === 204 ? null : response.json();
  }

  async function refreshAll() {
    try {
      await Promise.all([
        fetchIngredients(),
        fetchExercises(),
        fetchRecipes(),
        fetchWorkouts(),
      ]);
      await loadScheduleRange();
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  async function fetchIngredients() {
    const data = await fetchJson('/ingredients');
    setIngredients(data);
    return data;
  }

  async function fetchExercises() {
    const data = await fetchJson('/exercises');
    setExercises(data);
    return data;
  }

  async function fetchRecipes() {
    const data = await fetchJson('/recipes');
    setRecipes(data);
    return data;
  }

  async function fetchWorkouts() {
    const data = await fetchJson('/workouts');
    setWorkouts(data);
    await Promise.all(data.map((workout) => fetchWorkoutExercises(workout.id)));
    return data;
  }

  async function fetchWorkoutExercises(workoutId) {
    if (!workoutId) return [];
    if (workoutExercises[workoutId]) return workoutExercises[workoutId];
    const data = await fetchJson(`/workouts/${workoutId}/exercises`);
    setWorkoutExercises((prev) => ({ ...prev, [workoutId]: data }));
    return data;
  }

  async function fetchRecipeIngredients(recipeId) {
    if (!recipeId) return [];
    if (recipeIngredients[recipeId]) return recipeIngredients[recipeId];
    const data = await fetchJson(`/recipes/${recipeId}/ingredients`);
    setRecipeIngredients((prev) => ({ ...prev, [recipeId]: data }));
    return data;
  }

  async function fetchEventsForRange(startDate, endDate) {
    const data = await fetchJson(`/calendar?start_date=${startDate}&end_date=${endDate}`);
    setEvents(data);
    return data;
  }

  function loadScheduleRange() {
    const { start, end } = scheduleView === 'month'
      ? monthRange(selectedDate)
      : scheduleView === 'day'
        ? { start: currentDay, end: currentDay }
        : weekViewRange;
    fetchEventsForRange(start, end).catch((error) => setStatusMessage(error.message));
  }

  function changeMonth(offset) {
    const nextDate = new Date(selectedDate);
    nextDate.setMonth(nextDate.getMonth() + offset);
    setSelectedDate(nextDate);
  }

  function changeWeek(offset) {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + offset * 7);
    setSelectedDate(nextDate);
  }

  function changeDay(offset) {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + offset);
    setSelectedDate(nextDate);
  }

  function handleInputChange(setter) {
    return (event) => {
      const { name, value } = event.target;
      setter((prev) => ({ ...prev, [name]: value }));
    };
  }

  function handleExerciseModalOpen() {
    setExerciseForm({ name: '', category: '', one_rm: '' });
    setEditingExercise(null);
    setExerciseModalVisible(true);
  }

  function openExerciseEdit(exercise) {
    setExerciseForm({
      name: exercise.name || '',
      category: exercise.category || '',
      one_rm: exercise.one_rm?.toString() || '',
    });
    setEditingExercise(exercise);
    setExerciseModalVisible(true);
  }

  async function handleSaveExercise() {
    if (!exerciseForm.name.trim()) {
      setStatusMessage('Exercise name is required.');
      return;
    }
    try {
      const method = editingExercise ? 'PUT' : 'POST';
      const url = editingExercise ? `/exercises/${editingExercise.id}` : '/exercises';
      await fetchJson(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: exerciseForm.name.trim(),
          category: exerciseForm.category.trim() || undefined,
          one_rm: exerciseForm.one_rm ? Number(exerciseForm.one_rm) : undefined,
        }),
      });
      await fetchExercises();
      setExerciseModalVisible(false);
      setEditingExercise(null);
      setStatusMessage(editingExercise ? 'Exercise updated.' : 'Exercise added.');
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  function openIngredientEdit(ingredient) {
    setIngredientForm({
      name: ingredient.name || '',
      kcal: ingredient.kcal_per_100g?.toString() || '',
      cost: ingredient.cost_per_100g?.toString() || '',
      category: ingredient.category || '',
    });
    setEditingIngredient(ingredient);
    setIngredientModalVisible(true);
  }

  async function handleSaveIngredient() {
    if (!ingredientForm.name.trim()) {
      setStatusMessage('Ingredient name is required.');
      return;
    }
    try {
      const method = editingIngredient ? 'PUT' : 'POST';
      const url = editingIngredient ? `/ingredients/${editingIngredient.id}` : '/ingredients';
      await fetchJson(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ingredientForm.name.trim(),
          kcal_per_100g: Number(ingredientForm.kcal) || 0,
          cost_per_100g: Number(ingredientForm.cost) || 0,
          category: ingredientForm.category.trim() || undefined,
        }),
      });
      await fetchIngredients();
      setIngredientModalVisible(false);
      setEditingIngredient(null);
      setStatusMessage(editingIngredient ? 'Ingredient updated.' : 'Ingredient added.');
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  async function handleDeleteExercise(exerciseId) {
    if (!window.confirm('Delete this exercise?')) return;
    try {
      await fetchJson(`/exercises/${exerciseId}`, { method: 'DELETE' });
      await fetchExercises();
      setStatusMessage('Exercise deleted.');
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  async function handleDeleteIngredient(ingredientId) {
    if (!window.confirm('Delete this ingredient?')) return;
    try {
      await fetchJson(`/ingredients/${ingredientId}`, { method: 'DELETE' });
      await fetchIngredients();
      setStatusMessage('Ingredient deleted.');
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  function handleIngredientModalOpen() {
    setIngredientForm({ name: '', kcal: '', cost: '', category: '' });
    setIngredientModalVisible(true);
  }


  async function handleAddIngredient() {
    if (!ingredientForm.name.trim()) {
      setStatusMessage('Ingredient name is required.');
      return;
    }
    try {
      await fetchJson('/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ingredientForm.name.trim(),
          kcal_per_100g: Number(ingredientForm.kcal) || 0,
          cost_per_100g: Number(ingredientForm.cost) || 0,
          category: ingredientForm.category.trim() || undefined,
        }),
      });
      await fetchIngredients();
      setIngredientModalVisible(false);
      setStatusMessage('Ingredient added.');
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  function addWorkoutExercise() {
    if (!workoutForm.exercise_id) {
      setStatusMessage('Choose an exercise to add.');
      return;
    }
    const exercise = exercises.find((item) => item.id === Number(workoutForm.exercise_id));
    if (!exercise) {
      setStatusMessage('Selected exercise not found.');
      return;
    }
    setWorkoutForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          exercise_id: exercise.id,
          name: exercise.name,
          sets: Number(prev.sets) || 0,
          reps: Number(prev.reps) || 0,
          weight: prev.percent ? `${prev.percent.trim()}%` : '',
        },
      ],
      exercise_id: '',
      sets: '',
      reps: '',
      percent: '',
    }));
    setStatusMessage(`${exercise.name} added to workout.`);
  }

  function removeWorkoutExercise(index) {
    setWorkoutForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  async function saveWorkout() {
    if (!workoutForm.name.trim()) {
      setStatusMessage('Workout name is required.');
      return;
    }
    if (!workoutForm.items.length) {
      setStatusMessage('Add at least one exercise to save a workout.');
      return;
    }
    try {
      await fetchJson('/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workoutForm.name.trim(),
          exercise_list: workoutForm.items.map((item) => ({
            exercise_id: item.exercise_id,
            sets: item.sets,
            reps: item.reps,
            weight: item.weight,
          })),
          duration_mins: workoutForm.duration_mins ? Number(workoutForm.duration_mins) : undefined,
        }),
      });
      setWorkoutForm({ name: '', duration_mins: '', exercise_id: '', sets: '', reps: '', percent: '', items: [] });
      await fetchWorkouts();
      setStatusMessage('Workout saved.');
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  function editWorkout(workout) {
    const items = workoutExercises[workout.id] || [];
    setWorkoutForm({
      name: workout.name,
      duration_mins: workout.duration_mins?.toString() || '',
      exercise_id: '',
      sets: '',
      reps: '',
      percent: '',
      items: items.map((item) => ({
        exercise_id: item.exercise_id,
        name: item.name,
        sets: item.sets,
        reps: item.reps,
        weight: item.weight || '',
      })),
    });
    setPlannerTab('build');
  }

  async function deleteWorkout(workoutId) {
    try {
      await fetchJson(`/workouts/${workoutId}`, { method: 'DELETE' });
      await fetchWorkouts();
      setStatusMessage('Workout deleted.');
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  function addRecipeIngredient() {
    if (!recipeForm.ingredient_id) {
      setStatusMessage('Choose an ingredient for the recipe.');
      return;
    }
    const ingredient = ingredients.find((item) => item.id === Number(recipeForm.ingredient_id));
    if (!ingredient) {
      setStatusMessage('Ingredient not found.');
      return;
    }
    setRecipeForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          ingredient_id: ingredient.id,
          name: ingredient.name,
          quantity_g: Number(prev.quantity_g) || 0,
          kcal_per_100g: ingredient.kcal_per_100g,
          cost_per_100g: ingredient.cost_per_100g,
        },
      ],
      ingredient_id: '',
      quantity_g: '',
    }));
    setStatusMessage(`${ingredient.name} added to recipe.`);
  }

  function removeRecipeIngredient(index) {
    setRecipeForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  async function saveRecipe() {
    if (!recipeForm.name.trim()) {
      setStatusMessage('Recipe name is required.');
      return;
    }
    if (!recipeForm.items.length) {
      setStatusMessage('Add ingredients before saving a recipe.');
      return;
    }
    try {
      await fetchJson('/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: recipeForm.name.trim(),
          ingredient_list: recipeForm.items.map((item) => ({
            ingredient_id: item.ingredient_id,
            quantity_g: item.quantity_g,
          })),
          time_to_cook_mins: recipeForm.time_to_cook_mins ? Number(recipeForm.time_to_cook_mins) : undefined,
          servings: 1,
        }),
      });
      setRecipeForm({ name: '', time_to_cook_mins: '', ingredient_id: '', quantity_g: '', items: [] });
      await fetchRecipes();
      setStatusMessage('Recipe saved.');
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  function editRecipe(recipe) {
    fetchRecipeIngredients(recipe.id).then((ingredients) => {
      setRecipeForm({
        name: recipe.name,
        time_to_cook_mins: recipe.time_to_cook_mins?.toString() || '',
        ingredient_id: '',
        quantity_g: '',
        items: ingredients.map((item) => ({
          ingredient_id: item.id,
          name: item.name,
          quantity_g: item.quantity_g,
          kcal_per_100g: item.kcal_per_100g,
          cost_per_100g: item.cost_per_100g,
        })),
      });
      setPlannerTab('build');
    });
  }

  async function deleteRecipe(recipeId) {
    try {
      await fetchJson(`/recipes/${recipeId}`, { method: 'DELETE' });
      await fetchRecipes();
      setStatusMessage('Recipe deleted.');
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  function openEventModal(category, time = '', date = formatDate(selectedDate)) {
    setScheduleForm({
      category: activeEventClasses[category] || activeEventClasses.work,
      title: '',
      date,
      start_time: time,
      duration_mins: '',
      ref_workout_id: '',
      ref_recipe_id: '',
      min_duration: '',
      max_duration: '',
      notes: '',
    });
    setSelectedEvent(null);
    setEventModalVisible(true);
  }

  function openEventEdit(event) {
    setScheduleForm({
      category: event.event_type,
      title: event.title,
      date: event.event_date,
      start_time: event.start_time || '',
      duration_mins: event.duration_mins?.toString() || '',
      ref_workout_id: event.ref_workout_id?.toString() || '',
      ref_recipe_id: event.ref_recipe_id?.toString() || '',
      min_duration: '',
      max_duration: '',
      notes: event.notes || '',
    });
    setSelectedEvent(event);
    setEventModalVisible(true);
  }

  function handleEventFormChange(event) {
    const { name, value } = event.target;
    setScheduleForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSaveEvent() {
    if (!scheduleForm.date.trim() || !scheduleForm.category) {
      setStatusMessage('Choose a date and event type.');
      return;
    }
    const eventType = scheduleForm.category;
    const title = scheduleForm.title.trim() || scheduleForm.category.replace(/ .*/, '');
    let duration = Number(scheduleForm.duration_mins) || undefined;
    if (eventType === 'Training' && scheduleForm.ref_workout_id) {
      const workout = workouts.find((item) => item.id === Number(scheduleForm.ref_workout_id));
      duration = workout?.duration_mins || duration;
    }
    if (eventType === 'Meal' && scheduleForm.ref_recipe_id) {
      const recipe = recipes.find((item) => item.id === Number(scheduleForm.ref_recipe_id));
      duration = recipe?.time_to_cook_mins || duration;
    }
    if (eventType === 'Social' && scheduleForm.min_duration && scheduleForm.max_duration) {
      duration = Math.round((Number(scheduleForm.min_duration) + Number(scheduleForm.max_duration)) / 2);
    }
    try {
      const method = selectedEvent ? 'PUT' : 'POST';
      const url = selectedEvent ? `/calendar/${selectedEvent.id}` : '/calendar';
      await fetchJson(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          event_type: eventType,
          event_date: scheduleForm.date,
          start_time: scheduleForm.start_time || undefined,
          duration_mins: duration,
          ref_workout_id: scheduleForm.ref_workout_id ? Number(scheduleForm.ref_workout_id) : undefined,
          ref_recipe_id: scheduleForm.ref_recipe_id ? Number(scheduleForm.ref_recipe_id) : undefined,
          notes: scheduleForm.notes.trim() || undefined,
        }),
      });
      setEventModalVisible(false);
      setSelectedEvent(null);
      loadScheduleRange();
      setStatusMessage(selectedEvent ? 'Event updated.' : 'Event added.');
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  function openEventDetails(event) {
    setSelectedEvent(event);
    setEventModalVisible(false);
  }

  async function handleDeleteEvent(eventId) {
    try {
      await fetchJson(`/calendar/${eventId}`, { method: 'DELETE' });
      loadScheduleRange();
      setSelectedEvent(null);
      setStatusMessage('Event deleted.');
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  function timeToPosition(hour, minutes = 0, rowHeight = 84) {
    return hour * rowHeight + (minutes / 60) * rowHeight;
  }

  function durationToHeight(duration, rowHeight = 84) {
    return (duration / 60) * rowHeight;
  }

  function formatTimeForInput(time) {
    return time ? time : '';
  }

  function parseCellTime(clientY, cellTop) {
    const offset = clientY - cellTop;
    const rowHeight = 84;
    const hourIndex = Math.floor(offset / rowHeight);
    const minute = Math.round(((offset % rowHeight) / rowHeight) * 60 / 15) * 15;
    const finalHour = Math.min(23, Math.max(0, hourIndex));
    const finalMinutes = minute === 60 ? 0 : minute;
    return `${finalHour.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
  }

  function handleCalendarCellClick(event, date) {
    if (dragInfo || event.pointerType === 'mouse' && event.buttons !== 0) {
      return;
    }
    const cell = event.currentTarget;
    const hour = Number(cell.dataset.hour || 0);
    const rect = cell.getBoundingClientRect();
    const minute = Math.round(((event.clientY - rect.top) / rect.height) * 60 / 15) * 15;
    const finalMinute = minute === 60 ? 0 : minute;
    const time = `${hour.toString().padStart(2, '0')}:${finalMinute.toString().padStart(2, '0')}`;
    openEventModal('work', time, date);
  }

  function handleEventDragStart(event, calendarEvent) {
    event.stopPropagation();
    const initialDayIndex = weekDates.findIndex((day) => day.date === calendarEvent.event_date);
    setDragInfo({
      type: 'move',
      event: calendarEvent,
      originX: event.clientX,
      originY: event.clientY,
      initialStart: calendarEvent.start_time || '08:00',
      initialDuration: Number(calendarEvent.duration_mins) || 60,
      initialDayIndex,
      deltaMinutes: 0,
      dragged: false,
    });
  }

  function handleEventResizeStart(event, calendarEvent) {
    event.stopPropagation();
    setDragInfo({
      type: 'resize',
      event: calendarEvent,
      originY: event.clientY,
      initialDuration: Number(calendarEvent.duration_mins) || 60,
      deltaMinutes: 0,
      dragged: false,
    });
  }

  function resetEventClickInfo() {
    eventClickInfoRef.current = { startTime: 0, startX: 0, startY: 0, eventId: null, pointerId: null };
  }

  function resetCellClickInfo() {
    cellClickInfoRef.current = { startTime: 0, startX: 0, startY: 0, date: null, pointerId: null };
  }

  function handleCellPointerDown(event, date) {
    event.stopPropagation();
    event.preventDefault();
    cellClickInfoRef.current = {
      startTime: Date.now(),
      startX: event.clientX,
      startY: event.clientY,
      date,
      pointerId: event.pointerId,
    };
  }

  function handleCellPointerUp(event, date) {
    event.stopPropagation();
    event.preventDefault();

    const clickInfo = cellClickInfoRef.current;
    const duration = Date.now() - clickInfo.startTime;
    const distanceMovedX = Math.abs(event.clientX - clickInfo.startX);
    const distanceMovedY = Math.abs(event.clientY - clickInfo.startY);

    resetCellClickInfo();
    if (dragInfo) {
      return;
    }
    if (clickInfo.pointerId !== event.pointerId || clickInfo.date !== date) {
      return;
    }
    if (duration <= CLICK_MAX_DURATION && distanceMovedX <= CLICK_DRAG_THRESHOLD && distanceMovedY <= CLICK_DRAG_THRESHOLD) {
      const cell = event.currentTarget;
      const hour = Number(cell.dataset.hour || 0);
      const rect = cell.getBoundingClientRect();
      const minute = Math.round(((event.clientY - rect.top) / rect.height) * 60 / 15) * 15;
      const finalMinute = minute === 60 ? 0 : minute;
      const time = `${hour.toString().padStart(2, '0')}:${finalMinute.toString().padStart(2, '0')}`;
      openEventModal('work', time, date);
    }
  }

  function handleEventPointerDown(event, calendarEvent) {
    event.stopPropagation();
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
      eventPointerTargetRef.current = event.currentTarget;
    } catch (err) {
      eventPointerTargetRef.current = event.currentTarget;
    }
    eventClickInfoRef.current = {
      startTime: Date.now(),
      startX: event.clientX,
      startY: event.clientY,
      eventId: calendarEvent.id,
      pointerId: event.pointerId,
    };
    handleEventDragStart(event, calendarEvent);
  }

  async function completeEventPointerUp(event, fallbackEvent) {
    if (eventPointerTargetRef.current) {
      try {
        eventPointerTargetRef.current.releasePointerCapture(event.pointerId);
      } catch (err) {
        // ignore if capture already released
      }
      eventPointerTargetRef.current = null;
    }

    const activeDrag = dragInfo;
    const clickInfo = eventClickInfoRef.current;
    const targetEvent = activeDrag?.event || fallbackEvent;
    const wasDragged = activeDrag?.dragged;

    if (!targetEvent || !activeDrag) {
      resetEventClickInfo();
      resetCellClickInfo();
      setDragInfo(null);
      return;
    }

    setDragInfo(null);
    resetEventClickInfo();
    resetCellClickInfo();

    if (wasDragged) {
      const updatedEvent = {
        ...activeDrag.event,
        event_date: activeDrag.currentDate || activeDrag.event.event_date,
        start_time: activeDrag.currentStart || activeDrag.event.start_time,
        duration_mins: activeDrag.currentDuration || activeDrag.event.duration_mins,
      };
      await saveDraggedEvent(updatedEvent);
    } else if (clickInfo.pointerId === event.pointerId && clickInfo.eventId === targetEvent.id) {
      const duration = Date.now() - clickInfo.startTime;
      const distanceMovedX = Math.abs(event.clientX - clickInfo.startX);
      const distanceMovedY = Math.abs(event.clientY - clickInfo.startY);
      if (duration <= CLICK_MAX_DURATION && distanceMovedX <= CLICK_DRAG_THRESHOLD && distanceMovedY <= CLICK_DRAG_THRESHOLD) {
        openEventDetails(targetEvent);
      }
    }
  }

  function handleEventPointerUp(event, calendarEvent) {
    event.stopPropagation();
    event.preventDefault();
    completeEventPointerUp(event, calendarEvent);
  }

  function handlePointerCancel(event) {
    if (eventPointerTargetRef.current) {
      try {
        eventPointerTargetRef.current.releasePointerCapture(event.pointerId);
      } catch (err) {
        // ignore
      }
      eventPointerTargetRef.current = null;
    }
    resetEventClickInfo();
    resetCellClickInfo();
    setDragInfo(null);
  }

  async function saveDraggedEvent(draggedEvent) {
    setEvents((prev) => prev.map((ev) => ev.id === draggedEvent.id ? { ...ev, ...draggedEvent } : ev));
    try {
      await fetchJson(`/calendar/${draggedEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draggedEvent.title,
          event_type: draggedEvent.event_type,
          event_date: draggedEvent.event_date,
          start_time: draggedEvent.start_time || undefined,
          duration_mins: Number(draggedEvent.duration_mins) || undefined,
          ref_workout_id: draggedEvent.ref_workout_id ? Number(draggedEvent.ref_workout_id) : undefined,
          ref_recipe_id: draggedEvent.ref_recipe_id ? Number(draggedEvent.ref_recipe_id) : undefined,
          notes: draggedEvent.notes || undefined,
        }),
      });
      setStatusMessage('Event updated.');
      await loadScheduleRange();
    } catch (error) {
      setStatusMessage(error.message);
      await loadScheduleRange();
    }
  }

  function handlePointerMove(event) {
    if (!dragInfo) return;
    event.preventDefault();
    const deltaY = event.clientY - dragInfo.originY;
    const deltaX = dragInfo.type === 'move' ? event.clientX - dragInfo.originX : 0;
    const deltaMinutes = Math.round((deltaY / CALENDAR_ROW_HEIGHT) * 60 / 15) * 15;

    let newDate = dragInfo.event.event_date;
    let newStart = dragInfo.initialStart;
    let newDuration = dragInfo.initialDuration;

    if (dragInfo.type === 'move') {
      const gridRect = weekGridRef.current?.getBoundingClientRect();
      const availableWidth = gridRect ? gridRect.width - 120 : 0;
      const columnWidth = availableWidth / 7;
      const dayShift = columnWidth ? Math.round(deltaX / columnWidth) : 0;
      const newDayIndex = Math.min(6, Math.max(0, (dragInfo.initialDayIndex || 0) + dayShift));
      if (weekDates[newDayIndex]) {
        newDate = weekDates[newDayIndex].date;
      }
      const [originalHour, originalMinutes] = dragInfo.initialStart.split(':').map((value) => Number(value || 0));
      const totalMinutes = originalHour * 60 + originalMinutes + deltaMinutes;
      const clampedMinutes = Math.max(0, Math.min(23 * 60 + 45, totalMinutes));
      const newHour = Math.floor(clampedMinutes / 60);
      const newMinute = clampedMinutes % 60;
      newStart = `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
      setScheduleForm((prev) => ({ ...prev, start_time: newStart, date: newDate }));
    } else if (dragInfo.type === 'resize') {
      newDuration = Math.max(15, dragInfo.initialDuration + deltaMinutes);
      setScheduleForm((prev) => ({ ...prev, duration_mins: newDuration.toString() }));
    }

    setDragInfo((prev) => ({
      ...prev,
      deltaMinutes,
      dragged: prev ? (prev.dragged || Math.abs(deltaY) >= 5 || Math.abs(deltaX) >= 10) : false,
      currentDate: newDate,
      currentStart: newStart,
      currentDuration: newDuration
    }));
  }

  useEffect(() => {
    if (!dragInfo) return undefined;
    const moveHandler = (event) => handlePointerMove(event);
    const upHandler = (event) => {
      completeEventPointerUp(event, dragInfo?.event);
    };
    window.addEventListener('pointermove', moveHandler);
    window.addEventListener('pointerup', upHandler);
    window.addEventListener('pointercancel', handlePointerCancel);
    return () => {
      window.removeEventListener('pointermove', moveHandler);
      window.removeEventListener('pointerup', upHandler);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [dragInfo]);

  function performanceFieldKey(eventId, exerciseId) {
    return `${eventId}_${exerciseId}`;
  }

  function handlePerformanceChange(eventId, exerciseId, value) {
    setDashboardPerformance((prev) => ({
      ...prev,
      [performanceFieldKey(eventId, exerciseId)]: value,
    }));
  }

  async function handleSavePerformance(eventId, workout) {
    const entries = dashboardPerformance;
    const workoutExercisesList = workoutExercises[workout.id] || [];
    try {
      await Promise.all(workoutExercisesList.map((exercise) => {
        const key = performanceFieldKey(eventId, exercise.exercise_id);
        const weight = entries[key] || exercise.weight || '';
        return fetchJson('/logs/lift', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exercise_id: exercise.exercise_id,
            weight,
            sets: exercise.sets,
            reps: exercise.reps,
          }),
        });
      }));
      setStatusMessage('Workout performance logged.');
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  function getSelectedWorkoutDuration() {
    const workout = workouts.find((item) => item.id === Number(scheduleForm.ref_workout_id));
    return workout?.duration_mins || scheduleForm.duration_mins;
  }

  function getSelectedRecipeDuration() {
    const recipe = recipes.find((item) => item.id === Number(scheduleForm.ref_recipe_id));
    return recipe?.time_to_cook_mins || scheduleForm.duration_mins;
  }

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <div className="brand">Performance HQ</div>
        {['dashboard', 'mealplan', 'training', 'schedule', 'analytics'].map((tab) => (
          <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
            {tab === 'dashboard' ? 'Dashboard' : tab === 'mealplan' ? 'Meal Planner' : tab === 'training' ? 'Training' : tab === 'schedule' ? 'Schedule' : 'Analytics'}
          </button>
        ))}
      </aside>

      <main className="content">
        <header className="top-bar">
          <div>
            <h1>{activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'mealplan' ? 'Meal Planner' : activeTab === 'training' ? 'Training Lab' : activeTab === 'schedule' ? 'Schedule' : 'Analytics'}</h1>
            <p className="subtitle">Organize your day by workouts, meals, and events.</p>
          </div>
          <div className="top-actions">
            <button className="secondary-button theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </button>
            <div className="status-pill">Live</div>
          </div>
        </header>

        {statusMessage && <div className="toast">{statusMessage}</div>}

        {activeTab === 'dashboard' && (
          <section className="dashboard-layout">
            <div className="dashboard-banner">
                <div className="date-heading">
                <span>Today</span>
                <strong>{formatDateFull(selectedDate)}</strong>
              </div>
              <div className="banner-meta">
                <span>Free time</span>
                <strong>{freeTimeLabel}</strong>
              </div>
            </div>

            <div className="dashboard-columns">
              <div className="dashboard-panel workout-panel">
                <div className="section-title">
                  <h2>Today's scheduled workout</h2>
                  <button onClick={() => setActiveTab('training')}>Build workout</button>
                </div>
                {todayWorkouts.length ? (
                  todayWorkouts.map((event) => {
                    const workout = workouts.find((item) => item.id === event.ref_workout_id);
                    const details = workoutExercises[workout?.id] || [];
                    return (
                      <div key={event.id} className="card compact-card">
                        <div className="card-heading">
                          <div>
                            <strong>{event.title || workout?.name || 'Training'}</strong>
                            <span>{event.start_time || 'Anytime'}</span>
                          </div>
                          <span className="pill" style={{ background: eventColors[event.event_type] }}>{event.event_type.replace(/ .*/, '')}</span>
                        </div>
                        {workout ? (
                          <div className="workout-form">
                            {details.length ? details.map((exercise) => (
                              <div key={exercise.exercise_id} className="workout-row">
                                <div>
                                  <strong>{exercise.name}</strong>
                                  <small>{exercise.sets}×{exercise.reps} · {exercise.weight || 'percent'}</small>
                                </div>
                                <input
                                  placeholder="Weights (e.g. 225,225,235)"
                                  value={dashboardPerformance[performanceFieldKey(event.id, exercise.exercise_id)] || ''}
                                  onChange={(e) => handlePerformanceChange(event.id, exercise.exercise_id, e.target.value)}
                                />
                              </div>
                            )) : <div className="empty-state">Loading workout details...</div>}
                            <button className="primary-button" onClick={() => handleSavePerformance(event.id, workout)}>
                              Save workout log
                            </button>
                          </div>
                        ) : (
                          <div className="empty-state">No workout linked to this event.</div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-state">No training scheduled for today.</div>
                )}
              </div>

              <div className="dashboard-panel meal-panel">
                <div className="section-title">
                  <h2>Meals scheduled</h2>
                  <button onClick={() => setActiveTab('mealplan')}>Create meal</button>
                </div>
                <div className="event-list">
                  {todayMeals.length ? todayMeals.map((event) => (
                    <button key={event.id} className="event-item" onClick={() => openEventDetails(event)}>
                      <div>
                        <strong>{event.title || 'Meal'}</strong>
                        <span>{event.start_time || 'Anytime'}</span>
                      </div>
                      <span>{event.ref_recipe_id ? `Recipe ${event.ref_recipe_id}` : ''}</span>
                    </button>
                  )) : <div className="empty-state">No meals scheduled for today.</div>}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'mealplan' && (
          <section className="tabbed-layout">
            <div className="sub-tabs">
              <button className={plannerTab === 'build' ? 'active' : ''} onClick={() => setPlannerTab('build')}>Recipe Builder</button>
              <button className={plannerTab === 'list' ? 'active' : ''} onClick={() => setPlannerTab('list')}>My Recipes</button>
              <button className={plannerTab === 'ingredients' ? 'active' : ''} onClick={() => setPlannerTab('ingredients')}>Ingredients</button>
            </div>

            {plannerTab === 'build' ? (
              <div className="form-grid">
                <div className="panel form-card">
                  <h2>Recipe details</h2>
                  <label>Name</label>
                  <input name="name" value={recipeForm.name} onChange={(e) => setRecipeForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Post-workout bowl" />
                  <label>Estimated cook time (mins)</label>
                  <input name="time_to_cook_mins" value={recipeForm.time_to_cook_mins} onChange={(e) => setRecipeForm((prev) => ({ ...prev, time_to_cook_mins: e.target.value }))} placeholder="25" />
                  <div className="divider" />
                  <div className="inline-action-row">
                    <span>Ingredients</span>
                    <button className="secondary-button" onClick={handleIngredientModalOpen}>Add ingredient</button>
                  </div>
                  <select name="ingredient_id" value={recipeForm.ingredient_id} onChange={(e) => setRecipeForm((prev) => ({ ...prev, ingredient_id: e.target.value }))}>
                    <option value="">Choose ingredient</option>
                    {ingredients.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  <input name="quantity_g" value={recipeForm.quantity_g} onChange={(e) => setRecipeForm((prev) => ({ ...prev, quantity_g: e.target.value }))} placeholder="Amount in grams" />
                  <button className="secondary-button" onClick={addRecipeIngredient}>Add to recipe</button>
                  <div className="list-group compact">
                    {recipeForm.items.map((item, index) => (
                      <div key={index} className="entity-card">
                        <div>
                          <strong>{item.name}</strong>
                          <span>{item.quantity_g}g · {Math.round((item.kcal_per_100g * item.quantity_g) / 100)} kcal</span>
                        </div>
                        <button className="action-delete" onClick={() => removeRecipeIngredient(index)}>Remove</button>
                      </div>
                    ))}
                  </div>
                  <button className="primary-button" onClick={saveRecipe}>Save recipe</button>
                </div>
              </div>
            ) : plannerTab === 'list' ? (
              <div className="panel list-card">
                <div className="section-title">
                  <h2>My saved recipes</h2>
                  <button className="secondary-button" onClick={() => setPlannerTab('build')}>New recipe</button>
                </div>
                <div className="event-list">
                  {recipes.length ? recipes.map((recipe) => (
                    <div key={recipe.id} className="entity-card">
                      <div>
                        <strong>{recipe.name}</strong>
                        <span>{recipe.total_kcal} kcal · ${recipe.cost.toFixed(2)}</span>
                      </div>
                      <div className="action-row">
                        <button onClick={() => editRecipe(recipe)}>Edit</button>
                        <button className="action-delete" onClick={() => deleteRecipe(recipe.id)}>Delete</button>
                      </div>
                    </div>
                  )) : <div className="empty-state">No recipes yet.</div>}
                </div>
              </div>
            ) : (
              <div className="panel list-card">
                <div className="section-title">
                  <h2>Ingredient library</h2>
                  <button className="primary-button" onClick={handleIngredientModalOpen}>Add ingredient</button>
                </div>
                <div className="search-row">
                  <input
                    value={ingredientLibrarySearch}
                    onChange={(e) => setIngredientLibrarySearch(e.target.value)}
                    placeholder="Search ingredients"
                  />
                </div>
                <div className="exercise-list-scroll">
                  {filteredIngredients.length ? filteredIngredients.map((ingredient) => (
                    <div key={ingredient.id} className="entity-card">
                      <div>
                        <strong>{ingredient.name}</strong>
                        <span>{ingredient.kcal_per_100g} kcal / 100g</span>
                      </div>
                      <div className="action-row">
                        <button onClick={() => openIngredientEdit(ingredient)}>Edit</button>
                        <button className="action-delete" onClick={() => handleDeleteIngredient(ingredient.id)}>Delete</button>
                      </div>
                    </div>
                  )) : <div className="empty-state">No ingredients found.</div>}
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'training' && (
          <section className="tabbed-layout">
            <div className="sub-tabs">
              <button className={trainingTab === 'build' ? 'active' : ''} onClick={() => setTrainingTab('build')}>Workout Builder</button>
              <button className={trainingTab === 'list' ? 'active' : ''} onClick={() => setTrainingTab('list')}>My Workouts</button>
              <button className={trainingTab === 'exercises' ? 'active' : ''} onClick={() => setTrainingTab('exercises')}>Exercises</button>
            </div>

            {trainingTab === 'build' ? (
              <div className="form-grid">
                <div className="panel form-card">
                  <h2>Workout details</h2>
                  <label>Name</label>
                  <input name="name" value={workoutForm.name} onChange={(e) => setWorkoutForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Lower body power" />
                  <label>Estimated duration (mins)</label>
                  <input name="duration_mins" value={workoutForm.duration_mins} onChange={(e) => setWorkoutForm((prev) => ({ ...prev, duration_mins: e.target.value }))} placeholder="45" />
                  <div className="divider" />
                  <div className="inline-action-row">
                    <span>Exercises</span>
                    <button className="secondary-button" onClick={handleExerciseModalOpen}>Add exercise</button>
                  </div>
                  <select name="exercise_id" value={workoutForm.exercise_id} onChange={(e) => setWorkoutForm((prev) => ({ ...prev, exercise_id: e.target.value }))}>
                    <option value="">Choose exercise</option>
                    {exercises.map((exercise) => (
                      <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
                    ))}
                  </select>
                  <div className="inline-row">
                    <input name="sets" value={workoutForm.sets} onChange={(e) => setWorkoutForm((prev) => ({ ...prev, sets: e.target.value }))} placeholder="Sets" />
                    <input name="reps" value={workoutForm.reps} onChange={(e) => setWorkoutForm((prev) => ({ ...prev, reps: e.target.value }))} placeholder="Reps" />
                    <input name="percent" value={workoutForm.percent} onChange={(e) => setWorkoutForm((prev) => ({ ...prev, percent: e.target.value }))} placeholder="%1RM" />
                  </div>
                  <button className="secondary-button" onClick={addWorkoutExercise}>Add to workout</button>
                  <div className="list-group compact">
                    {workoutForm.items.map((item, index) => (
                      <div key={index} className="entity-card">
                        <div>
                          <strong>{item.name}</strong>
                          <span>{item.sets}×{item.reps} · {item.weight}</span>
                        </div>
                        <button className="action-delete" onClick={() => removeWorkoutExercise(index)}>Remove</button>
                      </div>
                    ))}
                  </div>
                  <button className="primary-button" onClick={saveWorkout}>Save workout</button>
                </div>
              </div>
            ) : trainingTab === 'list' ? (
              <div className="panel list-card">
                <div className="section-title">
                  <h2>My saved workouts</h2>
                  <button className="secondary-button" onClick={() => setTrainingTab('build')}>New workout</button>
                </div>
                <div className="event-list">
                  {workouts.length ? workouts.map((workout) => (
                    <div key={workout.id} className="entity-card">
                      <div>
                        <strong>{workout.name}</strong>
                        <span>{workout.duration_mins || 'N/A'} mins</span>
                      </div>
                      <div className="action-row">
                        <button onClick={() => editWorkout(workout)}>Edit</button>
                        <button className="action-delete" onClick={() => deleteWorkout(workout.id)}>Delete</button>
                      </div>
                    </div>
                  )) : <div className="empty-state">No workouts yet.</div>}
                </div>
              </div>
            ) : (
              <div className="panel list-card">
                <div className="section-title">
                  <h2>Exercise library</h2>
                  <button className="primary-button" onClick={handleExerciseModalOpen}>Add exercise</button>
                </div>
                <div className="search-row">
                  <input
                    value={exerciseLibrarySearch}
                    onChange={(e) => setExerciseLibrarySearch(e.target.value)}
                    placeholder="Search exercises"
                  />
                </div>
                <div className="exercise-list-scroll">
                  {filteredExercises.length ? filteredExercises.map((exercise) => (
                    <div key={exercise.id} className="entity-card">
                      <div>
                        <strong>{exercise.name}</strong>
                        <span>{exercise.one_rm ? `${exercise.one_rm} 1RM` : 'No 1RM yet'}</span>
                      </div>
                      <div className="action-row">
                        <button onClick={() => openExerciseEdit(exercise)}>Edit</button>
                        <button className="action-delete" onClick={() => handleDeleteExercise(exercise.id)}>Delete</button>
                      </div>
                    </div>
                  )) : <div className="empty-state">No exercises found.</div>}
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'schedule' && (
          <section className="schedule-layout schedule-calendar-layout">
            <div className="schedule-header schedule-calendar-header">
              <div className="view-tabs">
                {['month', 'week', 'day'].map((view) => (
                  <button key={view} className={scheduleView === view ? 'active' : ''} onClick={() => setScheduleView(view)}>
                    {view === 'month' ? 'Month' : view === 'week' ? 'Week' : 'Day'}
                  </button>
                ))}
              </div>
              <div className="schedule-actions">
                <button className="secondary-button today-button" onClick={() => setSelectedDate(new Date())}>Today</button>
                <button className="primary-button add-event-button" onClick={() => openEventModal('work')}>
                  <span className="button-icon">＋</span>
                  Add event
                </button>
              </div>
              <div className="schedule-legend">
                {Object.entries(eventColors).map(([type, color]) => (
                  <span key={type} className="legend-pill" style={{ background: color }}>
                    {type.replace(/ .*/, '')}
                  </span>
                ))}
              </div>
            </div>

            <div className="schedule-calendar-body">
              {scheduleView === 'month' && (
                <div className="month-view">
                  <div className="month-view-header">
                    <button className="icon-button" onClick={() => changeMonth(-1)}>‹</button>
                    <div className="month-title">{getMonthTitle(selectedDate)}</div>
                    <button className="icon-button" onClick={() => changeMonth(1)}>›</button>
                  </div>
                  <div className="month-weekdays">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((weekday) => (
                      <div key={weekday} className="weekday-label">{weekday}</div>
                    ))}
                  </div>
                  <div className="month-grid">
                    {monthGrid.map((week, weekIndex) => (
                      <div key={weekIndex} className="month-row">
                        {week.map((day) => {
                          const dayEvents = events.filter((event) => event.event_date === day.date);
                          return (
                            <button
                              key={day.date}
                              type="button"
                              className={`month-cell ${day.active ? '' : 'disabled'} ${day.date === currentDay ? 'selected' : ''}`}
                              onClick={() => setSelectedDate(new Date(day.date))}
                            >
                              <div className="month-cell-top">
                                <span>{day.label}</span>
                                {day.date === currentDay && <span className="current-dot" />}
                              </div>
                              <div className="month-cell-events">
                                {dayEvents.slice(0, 3).map((event) => (
                                  <span key={event.id} className="event-chip" style={{ background: eventColors[event.event_type] }}>
                                    {event.event_type.replace(/ .*/, '')}
                                  </span>
                                ))}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {scheduleView === 'week' && (
                <div className="week-view">
                  <div className="week-view-header schedule-nav-row">
                    <button className="icon-button" onClick={() => changeWeek(-1)}>‹</button>
                    <div className="schedule-view-title">{weekRangeLabel}</div>
                    <button className="icon-button" onClick={() => changeWeek(1)}>›</button>
                  </div>
                  <div className="week-grid-wrapper" ref={weekGridRef}>
                    <div className="week-grid week-calendar-grid">
                      <div className="week-time-header" />
                      {weekDates.map((day) => (
                        <div key={day.date} className="week-day-header">
                          <span>{day.weekday}</span>
                          <strong>{day.label}</strong>
                        </div>
                      ))}
                      {hourlyGrid.map((row) => (
                        <React.Fragment key={`week-row-${row.hour}`}>
                          <div className="week-time-cell">{row.label}</div>
                          {weekDates.map((day) => (
                            <button
                              key={`${day.date}-${row.hour}`}
                              type="button"
                              className="week-grid-cell"
                              onPointerDown={(e) => handleCellPointerDown(e, day.date)}
                              onPointerUp={(e) => handleCellPointerUp(e, day.date)}
                              data-hour={row.hour}
                            />
                          ))}
                        </React.Fragment>
                      ))}
                      {weekDates.map((day, index) => (
                        (eventsByDate[day.date] || []).map((event) => {
                          const [startHour, startMinutes] = (event.start_time || '00:00').split(':').map(Number);
                          const startTotal = startHour * 60 + (startMinutes || 0);
                          const duration = Number(event.duration_mins) || 60;
                          const top = 56 + (startTotal / 60) * CALENDAR_ROW_HEIGHT;
                          const height = Math.max(30, (duration / 60) * CALENDAR_ROW_HEIGHT);
                          const dragDelta = dragInfo?.event?.id === event.id ? dragInfo.deltaMinutes || 0 : 0;
                          const offsetTop = dragInfo?.type === 'move' && dragInfo.event.id === event.id
                            ? (dragDelta / 60) * CALENDAR_ROW_HEIGHT
                            : 0;
                          const resizeDelta = dragInfo?.type === 'resize' && dragInfo.event.id === event.id
                            ? dragDelta
                            : 0;
                          return (
                            <button
                              key={event.id}
                              type="button"
                              className={`event-block week-event-block ${dragInfo?.event?.id === event.id ? 'dragging' : ''}`}
                              style={{
                                top: `${top + offsetTop}px`,
                                height: `${Math.max(30, height + (resizeDelta / 60) * CALENDAR_ROW_HEIGHT)}px`,
                                left: `calc(120px + (${index} * ((100% - 120px) / 7)) + 8px)`,
                                width: `calc((100% - 120px) / 7 - 16px)`,
                                background: eventColors[event.event_type],
                              }}
                              onPointerDown={(e) => handleEventPointerDown(e, event)}
                              onPointerUp={(e) => handleEventPointerUp(e, event)}
                            >
                              <strong>{event.title || event.event_type.replace(/ .*/, '')}</strong>
                              <small>{event.start_time || 'All day'}</small>
                              <div className="resize-handle" onPointerDown={(e) => { e.stopPropagation(); handleEventResizeStart(e, event); }} />
                            </button>
                          );
                        })
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {scheduleView === 'day' && (
                <div className="day-view">
                  <div className="day-view-header schedule-nav-row">
                    <button className="icon-button" onClick={() => changeDay(-1)}>‹</button>
                    <div>
                      <span className="day-title">{new Date(currentDay).toLocaleDateString(undefined, { weekday: 'long' })}</span>
                      <strong>{formatDateFull(selectedDate)}</strong>
                    </div>
                    <button className="icon-button" onClick={() => changeDay(1)}>›</button>
                  </div>
                  <div className="day-grid-wrapper" ref={weekGridRef}>
                    <div className="day-grid day-calendar-grid">
                      {hourlyGrid.map((row) => (
                        <React.Fragment key={`day-row-${row.hour}`}>
                          <div className="day-time-cell">{row.label}</div>
                          <button
                            key={`${row.hour}-cell`}
                            type="button"
                            className="day-grid-cell"
                            onPointerDown={(e) => handleCellPointerDown(e, currentDay)}
                            onPointerUp={(e) => handleCellPointerUp(e, currentDay)}
                            data-hour={row.hour}
                          />
                        </React.Fragment>
                      ))}
                      <div className="day-grid-events">
                        {(currentDayEvents || []).map((event) => {
                          const [startHour, startMinutes] = (event.start_time || '00:00').split(':').map(Number);
                          const startTotal = startHour * 60 + (startMinutes || 0);
                          const duration = Number(event.duration_mins) || 60;
                          const top = (startTotal / 60) * CALENDAR_ROW_HEIGHT;
                          const height = Math.max(30, (duration / 60) * CALENDAR_ROW_HEIGHT);
                          const dragDelta = dragInfo?.event?.id === event.id ? dragInfo.deltaMinutes || 0 : 0;
                          const offsetTop = dragInfo?.type === 'move' && dragInfo.event.id === event.id
                            ? (dragDelta / 60) * CALENDAR_ROW_HEIGHT
                            : 0;
                          const resizeDelta = dragInfo?.type === 'resize' && dragInfo.event.id === event.id
                            ? dragDelta
                            : 0;
                          return (
                            <button
                              key={event.id}
                              type="button"
                              className={`event-block day-event-block ${dragInfo?.event?.id === event.id ? 'dragging' : ''}`}
                              style={{
                                top: `${top + offsetTop}px`,
                                height: `${Math.max(30, height + (resizeDelta / 60) * CALENDAR_ROW_HEIGHT)}px`,
                                background: eventColors[event.event_type],
                              }}
                              onPointerDown={(e) => handleEventPointerDown(e, event)}
                              onPointerUp={(e) => handleEventPointerUp(e, event)}
                            >
                              <strong>{event.title || event.event_type.replace(/ .*/, '')}</strong>
                              <small>{event.start_time || 'All day'}</small>
                              <div className="resize-handle" onPointerDown={(e) => { e.stopPropagation(); handleEventResizeStart(e, event); }} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'analytics' && (
          <section className="panel-grid analytics-grid">
            <div className="panel">
              <h2>Analytics</h2>
              <p>Analytics will appear here once workout logs and meal history are in place.</p>
            </div>
          </section>
        )}

        {eventModalVisible && (
          <div className="modal-overlay" onClick={() => setEventModalVisible(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>Add calendar event</h3>
              <label>Category</label>
              <select name="category" value={scheduleForm.category} onChange={handleEventFormChange}>
                {eventTypeOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              <label>Date</label>
              <input type="date" name="date" value={scheduleForm.date} onChange={handleEventFormChange} />
              <label>Start time</label>
              <input type="time" name="start_time" value={scheduleForm.start_time} onChange={handleEventFormChange} />
              {scheduleForm.category === 'Work' && (
                <>
                  <label>Duration (mins)</label>
                  <input type="number" name="duration_mins" value={scheduleForm.duration_mins} onChange={handleEventFormChange} placeholder="60" />
                </>
              )}
              {scheduleForm.category === 'Training' && (
                <>
                  <label>Workout</label>
                  <select name="ref_workout_id" value={scheduleForm.ref_workout_id} onChange={handleEventFormChange}>
                    <option value="">Choose workout</option>
                    {workouts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <label>Duration</label>
                  <input type="text" value={`${getSelectedWorkoutDuration() || 'Auto'}`} disabled />
                </>
              )}
              {scheduleForm.category === 'Meal' && (
                <>
                  <label>Recipe</label>
                  <select name="ref_recipe_id" value={scheduleForm.ref_recipe_id} onChange={handleEventFormChange}>
                    <option value="">Choose recipe</option>
                    {recipes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <label>Duration</label>
                  <input type="text" value={`${getSelectedRecipeDuration() || 'Auto'}`} disabled />
                </>
              )}
              {scheduleForm.category === 'Commute' && (
                <>
                  <label>Duration (mins)</label>
                  <input type="number" name="duration_mins" value={scheduleForm.duration_mins} onChange={handleEventFormChange} placeholder="30" />
                </>
              )}
              {scheduleForm.category === 'Social' && (
                <>
                  <label>Minimum duration (mins)</label>
                  <input type="number" name="min_duration" value={scheduleForm.min_duration} onChange={handleEventFormChange} placeholder="30" />
                  <label>Maximum duration (mins)</label>
                  <input type="number" name="max_duration" value={scheduleForm.max_duration} onChange={handleEventFormChange} placeholder="90" />
                </>
              )}
              <label>Notes</label>
              <textarea name="notes" value={scheduleForm.notes} onChange={handleEventFormChange} rows={3} />
              <div className="modal-actions">
                <button className="secondary-button" onClick={() => setEventModalVisible(false)}>Cancel</button>
                <button className="primary-button" onClick={handleSaveEvent}>Save event</button>
              </div>
            </div>
          </div>
        )}

        {exerciseModalVisible && (
          <div className="modal-overlay" onClick={() => setExerciseModalVisible(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>{editingExercise ? 'Edit exercise' : 'Add exercise'}</h3>
              <label>Name</label>
              <input value={exerciseForm.name} onChange={(e) => setExerciseForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Barbell Back Squat" />
              <label>Category</label>
              <input value={exerciseForm.category} onChange={(e) => setExerciseForm((prev) => ({ ...prev, category: e.target.value }))} placeholder="Lower body" />
              <label>Optional 1RM</label>
              <input value={exerciseForm.one_rm} onChange={(e) => setExerciseForm((prev) => ({ ...prev, one_rm: e.target.value }))} placeholder="225" />
              <div className="modal-actions">
                <button className="secondary-button" onClick={() => setExerciseModalVisible(false)}>Cancel</button>
                <button className="primary-button" onClick={handleSaveExercise}>{editingExercise ? 'Save changes' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}

        {ingredientModalVisible && (
          <div className="modal-overlay" onClick={() => setIngredientModalVisible(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>{editingIngredient ? 'Edit ingredient' : 'Add ingredient'}</h3>
              <label>Name</label>
              <input value={ingredientForm.name} onChange={(e) => setIngredientForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Chicken Breast" />
              <label>Calories / 100g</label>
              <input value={ingredientForm.kcal} onChange={(e) => setIngredientForm((prev) => ({ ...prev, kcal: e.target.value }))} placeholder="165" />
              <label>Cost / 100g</label>
              <input value={ingredientForm.cost} onChange={(e) => setIngredientForm((prev) => ({ ...prev, cost: e.target.value }))} placeholder="1.80" />
              <label>Category</label>
              <input value={ingredientForm.category} onChange={(e) => setIngredientForm((prev) => ({ ...prev, category: e.target.value }))} placeholder="Meat & Poultry" />
              <div className="modal-actions">
                <button className="secondary-button" onClick={() => setIngredientModalVisible(false)}>Cancel</button>
                <button className="primary-button" onClick={handleSaveIngredient}>{editingIngredient ? 'Save changes' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}

        {selectedEvent && !eventModalVisible && (
          <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>Event details</h3>
              <p><strong>{selectedEvent.title}</strong></p>
              <p>{selectedEvent.event_type}</p>
              <p>{selectedEvent.event_date} {selectedEvent.start_time || ''}</p>
              <p>Duration: {selectedEvent.duration_mins || '60'} min</p>
              <p>{selectedEvent.notes || 'No notes'}</p>
              <div className="modal-actions">
                <button className="secondary-button" onClick={() => setSelectedEvent(null)}>Close</button>
                <button className="secondary-button" onClick={() => openEventEdit(selectedEvent)}>Edit</button>
                <button className="action-delete" onClick={() => handleDeleteEvent(selectedEvent.id)}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
