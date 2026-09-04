import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import {
  parseISODateLocal,
  formatDate,
  getOrdinal,
  formatDateFull,
  addDays,
  startOfWeek,
  monthRange,
  getMonthGrid,
  getWeekDays,
  getWeekdayIndex,
  getWeekRange,
  getMonthTitle,
  getHourlyGrid,
  clampedMinutes,
  CALENDAR_ROW_HEIGHT,
} from './utils/dateUtils';
import {
  fetchJson,
  getSettings,
  updateSettings,
  toggleIngredientInventory,
  createGroceryList,
  getActiveGroceryList,
  getAllGroceryLists,
  updateGroceryList,
  deleteGroceryList,
  estimateCommute,
  getAuthToken,
} from './services/api';
import { SideNav, TopBar } from './components/Navbar';
import Login from './components/Login/Login';
import Dashboard from './components/Dashboard/Dashboard';
import MealPlanner from './components/MealPlanner/MealPlanner';
import Training from './components/Training/Training';
import Schedule from './components/Schedule/Schedule';
// import Analytics from './components/Analytics/Analytics';
import EventModal from './components/Modals/EventModal';
import ExerciseModal from './components/Modals/ExerciseModal';
import IngredientModal from './components/Modals/IngredientModal';
import EventDetailsModal from './components/Modals/EventDetailsModal';
import SettingsModal from './components/Modals/SettingsModal';
import PartialShopModal from './components/Modals/PartialShopModal';
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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAuthToken());
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
  const dragInfoRef = useRef(null);
  dragInfoRef.current = dragInfo;
  const [userSettings, setUserSettings] = useState(null);
  const [activeGroceryList, setActiveGroceryList] = useState(null);
  const [allGroceryLists, setAllGroceryLists] = useState([]);
  const [weeklyTemplate, setWeeklyTemplate] = useState([]);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [partialModalOpen, setPartialModalOpen] = useState(false);
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
    if (isAuthenticated) {
      refreshAll();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && !localStorage.getItem('test_data_seeded')) {
      fetchJson('/testdata')
        .then(() => {
          localStorage.setItem('test_data_seeded', 'true');
          console.log('Test data seeded successfully.');
        })
        .catch((err) => console.error('Failed to seed test data:', err));
    }
  }, [isAuthenticated]);

  // Fetch initial core data
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (isAuthenticated) {
      loadScheduleRange();
    }
  }, [scheduleView, selectedDate, isAuthenticated]);

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

  // fetchJson imported from services/api

  async function refreshAll() {
    try {
      await Promise.all([
        fetchIngredients(),
        fetchExercises(),
        fetchRecipes(),
        fetchWorkouts(),
        fetchUserSettings(),
        fetchActiveGrocery(),
        fetchAllGroceryLists(),
        fetchWeeklyTemplate(),
      ]);
      await loadScheduleRange();
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  async function fetchUserSettings() {
    try {
      const data = await getSettings();
      setUserSettings(data);
      return data;
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchActiveGrocery() {
    try {
      const data = await getActiveGroceryList();
      setActiveGroceryList(data);
      return data;
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchAllGroceryLists() {
    try {
      const data = await getAllGroceryLists();
      setAllGroceryLists(data.lists || []);
      return data.lists || [];
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchWeeklyTemplate() {
    try {
      const data = await fetchJson('/schedule/template');
      setWeeklyTemplate(data || []);
      return data || [];
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSaveSettings(newSettings) {
    try {
      const updated = await updateSettings(newSettings);
      setUserSettings(updated);
      setStatusMessage('Settings saved.');
    } catch (err) {
      setStatusMessage(err.message);
    }
  }

  async function handleToggleInventory(ingredientId, inStock) {
    try {
      await toggleIngredientInventory(ingredientId, inStock ? 1 : 0);
      setIngredients((prev) =>
        prev.map((ing) => (ing.id === ingredientId ? { ...ing, in_inventory: inStock ? 1 : 0 } : ing))
      );
      setStatusMessage(inStock ? 'Marked in stock.' : 'Marked out of stock.');
    } catch (err) {
      setStatusMessage(err.message);
    }
  }

  async function handleGenerateGroceryList(startDate, endDate, weekLabel) {
    try {
      const allEvents = await fetchJson(`/calendar?start_date=${startDate || '2020-01-01'}&end_date=${endDate || '2030-12-31'}`);
      const mealEvents = (Array.isArray(allEvents) ? allEvents : events).filter((ev) => ev.event_type === 'Meal');
      const allIngredients = ingredients.length > 0 ? ingredients : await fetchJson('/ingredients');
      const requiredMap = {};
      for (const ev of mealEvents) {
        if (ev.ref_recipe_id) {
          const ings = await fetchRecipeIngredients(ev.ref_recipe_id);
          for (const item of ings) {
            const ingId = Number(item.id || item.ingredient_id);
            const ingData = allIngredients.find((i) => Number(i.id) === ingId) || item;
            const isStocked = Boolean(Number(ingData.in_inventory));
            if (!isStocked && ingId) {
              if (!requiredMap[ingId]) {
                requiredMap[ingId] = {
                  id: ingId,
                  name: ingData.name || item.name || 'Ingredient',
                  category: ingData.category || item.category || 'General',
                  grams: 0,
                  checked: false,
                };
              }
              requiredMap[ingId].grams += Number(item.quantity_g || item.grams) || 0;
            }
          }
        }
      }
      const itemsList = Object.values(requiredMap);
      await createGroceryList(weekLabel || 'Weekly Shop', JSON.stringify(itemsList));
      await fetchActiveGrocery();
      await fetchAllGroceryLists();
      setActiveTab('dashboard');
      if (itemsList.length === 0) {
        if (mealEvents.length === 0) {
          setStatusMessage('Grocery list created (No meals scheduled for this date range)!');
        } else {
          setStatusMessage('Grocery list created (All meal ingredients are already in stock)!');
        }
      } else {
        setStatusMessage(`Grocery list generated with ${itemsList.length} ingredient(s) from scheduled meals!`);
      }
    } catch (err) {
      setStatusMessage(err.message);
    }
  }

  async function handleCompleteGroceryShop(listId, itemsJson) {
    try {
      if (itemsJson) {
        let items = [];
        try { items = JSON.parse(itemsJson); } catch (e) { items = []; }
        for (const item of items) {
          if (item.id) {
            try {
              await toggleIngredientInventory(item.id, 1);
            } catch (err) { console.error(err); }
          }
        }
        await fetchIngredients();
      }
      await updateGroceryList(listId, { status: 'completed' });
      setActiveGroceryList(null);
      await fetchAllGroceryLists();
      setStatusMessage('Grocery shop completed! Items marked in stock.');
    } catch (err) {
      setStatusMessage(err.message);
    }
  }

  async function handleSavePartialShop(listId, items) {
    try {
      for (const item of items) {
        if (item.checked && item.id) {
          try {
            await toggleIngredientInventory(item.id, 1);
          } catch (err) { console.error(err); }
        }
      }
      await fetchIngredients();
      await updateGroceryList(listId, { items_json: JSON.stringify(items) });
      await fetchActiveGrocery();
      await fetchAllGroceryLists();
      setPartialModalOpen(false);
      setStatusMessage('Partial grocery shop saved!');
    } catch (err) {
      setStatusMessage(err.message);
    }
  }

  async function handleDeleteGrocery(listId) {
    if (!window.confirm('Delete this grocery list?')) return;
    try {
      await deleteGroceryList(listId);
      setActiveGroceryList(null);
      await fetchAllGroceryLists();
      setStatusMessage('Grocery list deleted.');
    } catch (err) {
      setStatusMessage(err.message);
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
    // Clear the exercise cache so stale data is never served after edits
    setWorkoutExercises({});
    await Promise.all(data.map((workout) => fetchWorkoutExercisesForce(workout.id)));
    return data;
  }

  async function fetchWorkoutExercisesForce(workoutId) {
    if (!workoutId) return [];
    const data = await fetchJson(`/workouts/${workoutId}/exercises`);
    setWorkoutExercises((prev) => ({ ...prev, [workoutId]: data }));
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

  function handleEventFormChange(e) {
    const { name, value, type, checked } = e.target;
    setScheduleForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function openEventModal(category, startTime, date) {
    setSelectedEvent(null);
    setScheduleForm({
      title: '',
      category: category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Work',
      date: date || formatDate(selectedDate),
      start_time: startTime || '09:00',
      duration_mins: '60',
      ref_workout_id: '',
      ref_recipe_id: '',
      notes: '',
      location: '',
      commute_mode: 'walk',
    });
    setEventModalVisible(true);
  }

  function openEventEdit(event) {
    setScheduleForm({
      title: event.title || '',
      category: event.event_type || 'Work',
      date: event.event_date || formatDate(selectedDate),
      start_time: event.start_time || '09:00',
      duration_mins: event.duration_mins?.toString() || '60',
      ref_workout_id: event.ref_workout_id?.toString() || '',
      ref_recipe_id: event.ref_recipe_id?.toString() || '',
      notes: event.notes || '',
      location: event.location_type || '',
      commute_mode: 'walk',
      id: event.id,
      is_completed: event.is_completed,
    });
    setSelectedEvent(event);
    setEventModalVisible(true);
  }

  function openEventDetails(event) {
    setSelectedEvent(event);
  }

  async function handleDeleteEvent(eventId) {
    if (!window.confirm('Delete this event?')) return;
    try {
      await fetchJson(`/calendar/${eventId}`, { method: 'DELETE' });
      await loadScheduleRange();
      setStatusMessage('Event deleted.');
      if (selectedEvent && selectedEvent.id === eventId) {
        setSelectedEvent(null);
      }
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  async function handleSaveEvent(e) {
    if (e && e.preventDefault) e.preventDefault();
    try {
      const method = selectedEvent ? 'PUT' : 'POST';
      const url = selectedEvent ? `/calendar/${selectedEvent.id}` : '/calendar';
      
      let locType = scheduleForm.location || undefined;
      let dest = scheduleForm.location || 'Gym';
      if (scheduleForm.category === 'Training' && scheduleForm.ref_workout_id) {
        const w = workouts.find((item) => item.id === Number(scheduleForm.ref_workout_id));
        if (w && w.location_type) {
          locType = w.location_type;
          dest = w.location_type === 'gym' ? (userSettings?.gym_address || 'Gym') :
                 w.location_type === 'field' ? (userSettings?.field_address || 'Field') :
                 w.location_type === 'home' ? (userSettings?.home_address || 'Home') : w.location_type;
        }
      } else if (scheduleForm.location) {
        const locLower = scheduleForm.location.toLowerCase();
        if (locLower.includes('gym')) dest = userSettings?.gym_address || scheduleForm.location;
        else if (locLower.includes('field') || locLower.includes('pitch')) dest = userSettings?.field_address || scheduleForm.location;
        else if (locLower.includes('home')) dest = userSettings?.home_address || 'Home';
      }

      let finalTitle = (scheduleForm.title || '').trim();
      if (scheduleForm.category === 'Work') {
        finalTitle = 'Work';
      } else if (scheduleForm.category === 'Training') {
        const w = workouts.find((item) => item.id === Number(scheduleForm.ref_workout_id));
        finalTitle = w ? w.name : 'Training';
      } else if (scheduleForm.category === 'Meal') {
        finalTitle = finalTitle || 'Meal';
      } else {
        finalTitle = finalTitle || scheduleForm.category || 'Event';
      }

      await fetchJson(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle,
          event_type: scheduleForm.category,
          event_date: scheduleForm.date,
          start_time: scheduleForm.start_time || undefined,
          duration_mins: Number(scheduleForm.duration_mins) || undefined,
          ref_workout_id: scheduleForm.ref_workout_id ? Number(scheduleForm.ref_workout_id) : undefined,
          ref_recipe_id: scheduleForm.ref_recipe_id ? Number(scheduleForm.ref_recipe_id) : undefined,
          notes: (scheduleForm.notes || '').trim() || undefined,
          location_type: locType,
        }),
      });

      await loadScheduleRange();
      setEventModalVisible(false);
      setSelectedEvent(null);
      setStatusMessage(selectedEvent ? 'Event updated.' : 'Event added.');
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  function handleExerciseModalOpen() {
    setExerciseForm({ name: '', category: '', one_rm: '' });
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
      in_inventory: ingredient.in_inventory || 0,
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
          in_inventory: ingredientForm.in_inventory || 0,
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
    setIngredientForm({ name: '', kcal: '', cost: '', category: '', in_inventory: 0 });
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
          in_inventory: ingredientForm.in_inventory || 0,
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
          weight: prev.percent ? (prev.weight_mode === 'raw' ? `${prev.percent.trim()} lbs` : `${prev.percent.trim()}%`) : '',
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
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  }

  async function saveWorkout() {
    if (!workoutForm.name.trim() || !workoutForm.items.length) {
      setStatusMessage('Add a workout name and at least one exercise.');
      return;
    }
    try {
      const method = workoutForm.id ? 'PUT' : 'POST';
      const url = workoutForm.id ? `/workouts/${workoutForm.id}` : '/workouts';
      await fetchJson(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workoutForm.name.trim(),
          duration_mins: Number(workoutForm.duration_mins) || 45,
          exercise_list: workoutForm.items,
          location_type: workoutForm.location_type || 'gym',
        }),
      });
      setWorkoutForm({ id: null, name: '', duration_mins: '', exercise_id: '', sets: '', reps: '', percent: '', weight_mode: 'percent', items: [] });
      await fetchWorkouts();
      setStatusMessage('Workout saved.');
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  function editWorkout(workout) {
    const items = workoutExercises[workout.id] || [];
    setWorkoutForm({
      id: workout.id,
      name: workout.name,
      duration_mins: workout.duration_mins?.toString() || '',
      exercise_id: '',
      sets: '',
      reps: '',
      percent: '',
      weight_mode: 'percent',
      items: items.map((item) => ({
        exercise_id: item.exercise_id,
        name: item.name,
        sets: item.sets,
        reps: item.reps,
        weight: item.weight || '',
      })),
    });
    setTrainingTab('build');
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
      const method = recipeForm.id ? 'PUT' : 'POST';
      const url = recipeForm.id ? `/recipes/${recipeForm.id}` : '/recipes';
      await fetchJson(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: recipeForm.name.trim(),
          ingredient_list: recipeForm.items.map((item) => ({
            ingredient_id: item.ingredient_id,
            quantity_g: item.quantity_g,
          })),
          time_to_cook_mins: recipeForm.time_to_cook_mins ? Number(recipeForm.time_to_cook_mins) : undefined,
          servings: 1,
          meal_type: recipeForm.meal_type || 'supper',
        }),
      });
      setRecipeForm({ id: null, name: '', time_to_cook_mins: '', meal_type: 'supper', ingredient_id: '', quantity_g: '', items: [] });
      // Clear cached ingredients for this recipe so stale data isn't served
      if (recipeForm.id) {
        setRecipeIngredients((prev) => {
          const updated = { ...prev };
          delete updated[recipeForm.id];
          return updated;
        });
      }
      await fetchRecipes();
      setStatusMessage('Recipe saved.');
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  function editRecipe(recipe) {
    fetchRecipeIngredients(recipe.id).then((ingredients) => {
      setRecipeForm({
        id: recipe.id,
        name: recipe.name,
        meal_type: recipe.meal_type || 'supper',
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
    if (event.target && event.target.closest && event.target.closest('.event-block')) {
      return;
    }
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
    if (event.target && event.target.closest && event.target.closest('.event-block')) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();

    const clickInfo = cellClickInfoRef.current;
    const duration = Date.now() - clickInfo.startTime;
    const distanceMovedX = Math.abs(event.clientX - clickInfo.startX);
    const distanceMovedY = Math.abs(event.clientY - clickInfo.startY);

    resetCellClickInfo();
    if (dragInfoRef.current || dragInfo) {
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

    const activeDrag = dragInfoRef.current || dragInfo;
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
    const activeDrag = dragInfoRef.current || dragInfo;
    if (!activeDrag) return;
    event.preventDefault();
    const deltaY = event.clientY - activeDrag.originY;
    const deltaX = activeDrag.type === 'move' ? event.clientX - activeDrag.originX : 0;
    const deltaMinutes = Math.round((deltaY / CALENDAR_ROW_HEIGHT) * 60 / 15) * 15;

    let newDate = activeDrag.event.event_date;
    let newStart = activeDrag.initialStart;
    let newDuration = activeDrag.initialDuration;

    if (activeDrag.type === 'move') {
      const gridRect = weekGridRef.current?.getBoundingClientRect();
      const availableWidth = gridRect ? gridRect.width - 120 : 0;
      const columnWidth = availableWidth / 7;
      const dayShift = columnWidth ? Math.round(deltaX / columnWidth) : 0;
      const newDayIndex = Math.min(6, Math.max(0, (activeDrag.initialDayIndex || 0) + dayShift));
      if (weekDates[newDayIndex]) {
        newDate = weekDates[newDayIndex].date;
      }
      const [originalHour, originalMinutes] = activeDrag.initialStart.split(':').map((value) => Number(value || 0));
      const totalMinutes = originalHour * 60 + originalMinutes + deltaMinutes;
      const clampedMinutes = Math.max(0, Math.min(23 * 60 + 45, totalMinutes));
      const newHour = Math.floor(clampedMinutes / 60);
      const newMinute = clampedMinutes % 60;
      newStart = `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
      setScheduleForm((prev) => ({ ...prev, start_time: newStart, date: newDate }));
    } else if (activeDrag.type === 'resize') {
      newDuration = Math.max(15, activeDrag.initialDuration + deltaMinutes);
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
    const activeDrag = dragInfoRef.current || dragInfo;
    if (!activeDrag) return undefined;
    const moveHandler = (event) => handlePointerMove(event);
    const upHandler = (event) => {
      completeEventPointerUp(event, dragInfoRef.current?.event);
    };
    window.addEventListener('pointermove', moveHandler);
    window.addEventListener('pointerup', upHandler);
    window.addEventListener('pointercancel', handlePointerCancel);
    return () => {
      window.removeEventListener('pointermove', moveHandler);
      window.removeEventListener('pointerup', upHandler);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [dragInfo ? true : false]);

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

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="app-shell">
      <SideNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="content">
        <TopBar
          activeTab={activeTab}
          theme={theme}
          setTheme={setTheme}
          onOpenSettings={() => setSettingsModalVisible(true)}
        />

        {statusMessage && <div className="toast">{statusMessage}</div>}

        {activeGroceryList && activeGroceryList.status === 'active' && (
          <div className="card" style={{ marginBottom: '20px', padding: '16px', borderLeft: '4px solid var(--primary)', background: 'var(--card-bg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <strong style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🛒 Active Grocery List: {activeGroceryList.week_label || 'Weekly Shop'}
                </strong>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Created on {new Date(activeGroceryList.created_at).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className="primary-button"
                  style={{ fontSize: '0.85rem', padding: '6px 14px', background: '#10b981', border: 'none', color: '#fff' }}
                  onClick={() => handleCompleteGroceryShop(activeGroceryList.id, activeGroceryList.items_json)}
                >
                  ✓ Shop complete
                </button>
                <button
                  className="secondary-button"
                  style={{ fontSize: '0.85rem', padding: '6px 14px' }}
                  onClick={() => setPartialModalOpen(true)}
                >
                  ✎ Shop partially complete
                </button>
                <button
                  className="secondary-button"
                  style={{ fontSize: '0.85rem', padding: '6px 14px', background: 'var(--primary)', color: '#fff', border: 'none' }}
                  onClick={() => {
                    setActiveTab('mealplan');
                  }}
                >
                  📋 Manage All Lists →
                </button>
                <button
                  className="icon-button"
                  style={{ color: '#ef4444', marginLeft: '4px' }}
                  title="Delete list"
                  onClick={() => handleDeleteGrocery(activeGroceryList.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            selectedDate={selectedDate}
            freeTimeLabel={freeTimeLabel}
            todayWorkouts={todayWorkouts}
            workouts={workouts}
            workoutExercises={workoutExercises}
            exercises={exercises}
            eventColors={eventColors}
            dashboardPerformance={dashboardPerformance}
            performanceFieldKey={performanceFieldKey}
            handlePerformanceChange={handlePerformanceChange}
            handleSavePerformance={handleSavePerformance}
            todayMeals={todayMeals}
            openEventDetails={openEventDetails}
            setActiveTab={setActiveTab}
            activeGroceryList={activeGroceryList}
            onCompleteGroceryShop={handleCompleteGroceryShop}
            onSavePartialShop={handleSavePartialShop}
            onDeleteGroceryList={handleDeleteGrocery}
          />
        )}

        {activeTab === 'mealplan' && (
          <MealPlanner
            plannerTab={plannerTab}
            setPlannerTab={setPlannerTab}
            recipeForm={recipeForm}
            setRecipeForm={setRecipeForm}
            handleIngredientModalOpen={handleIngredientModalOpen}
            ingredients={ingredients}
            addRecipeIngredient={addRecipeIngredient}
            removeRecipeIngredient={removeRecipeIngredient}
            saveRecipe={saveRecipe}
            recipes={recipes}
            editRecipe={editRecipe}
            deleteRecipe={deleteRecipe}
            ingredientLibrarySearch={ingredientLibrarySearch}
            setIngredientLibrarySearch={setIngredientLibrarySearch}
            filteredIngredients={filteredIngredients}
            openIngredientEdit={openIngredientEdit}
            handleDeleteIngredient={handleDeleteIngredient}
            onToggleInventory={handleToggleInventory}
            allGroceryLists={allGroceryLists}
            fetchAllGroceryLists={fetchAllGroceryLists}
            handleCompleteGroceryShop={handleCompleteGroceryShop}
            handleDeleteGrocery={handleDeleteGrocery}
            handleGenerateGroceryList={handleGenerateGroceryList}
            activeGroceryList={activeGroceryList}
          />
        )}

        {activeTab === 'training' && (
          <Training
            trainingTab={trainingTab}
            setTrainingTab={setTrainingTab}
            workoutForm={workoutForm}
            setWorkoutForm={setWorkoutForm}
            handleExerciseModalOpen={handleExerciseModalOpen}
            exercises={exercises}
            addWorkoutExercise={addWorkoutExercise}
            removeWorkoutExercise={removeWorkoutExercise}
            saveWorkout={saveWorkout}
            workouts={workouts}
            editWorkout={editWorkout}
            deleteWorkout={deleteWorkout}
            exerciseLibrarySearch={exerciseLibrarySearch}
            setExerciseLibrarySearch={setExerciseLibrarySearch}
            filteredExercises={filteredExercises}
            openExerciseEdit={openExerciseEdit}
            handleDeleteExercise={handleDeleteExercise}
          />
        )}

        {activeTab === 'schedule' && (
          <Schedule
            scheduleView={scheduleView}
            setScheduleView={setScheduleView}
            setSelectedDate={setSelectedDate}
            openEventModal={openEventModal}
            eventColors={eventColors}
            selectedDate={selectedDate}
            changeMonth={changeMonth}
            monthGrid={monthGrid}
            events={events}
            currentDay={currentDay}
            changeWeek={changeWeek}
            weekRangeLabel={weekRangeLabel}
            weekGridRef={weekGridRef}
            weekDates={weekDates}
            hourlyGrid={hourlyGrid}
            handleCellPointerDown={handleCellPointerDown}
            handleCellPointerUp={handleCellPointerUp}
            eventsByDate={eventsByDate}
            dragInfo={dragInfo}
            handleEventPointerDown={handleEventPointerDown}
            handleEventPointerUp={handleEventPointerUp}
            handleEventResizeStart={handleEventResizeStart}
            changeDay={changeDay}
            currentDayEvents={currentDayEvents}
            onGenerateGroceryList={handleGenerateGroceryList}
            weeklyTemplate={weeklyTemplate}
            fetchWeeklyTemplate={fetchWeeklyTemplate}
            recipes={recipes}
            refreshAll={refreshAll}
            workouts={workouts}
            workoutExercises={workoutExercises}
            userSettings={userSettings}
          />
        )}

        {/* {activeTab === 'analytics' && (
          <Analytics
            calendarEvents={events}
            workouts={workouts}
            exercises={exercises}
            workoutExercises={workoutExercises}
            fetchWorkoutExercises={fetchWorkoutExercises}
          />
        )} */}

        <EventModal
          eventModalVisible={eventModalVisible}
          setEventModalVisible={setEventModalVisible}
          scheduleForm={scheduleForm}
          setScheduleForm={setScheduleForm}
          handleEventFormChange={handleEventFormChange}
          eventTypeOptions={eventTypeOptions}
          workouts={workouts}
          getSelectedWorkoutDuration={getSelectedWorkoutDuration}
          recipes={recipes}
          getSelectedRecipeDuration={getSelectedRecipeDuration}
          handleSaveEvent={handleSaveEvent}
          userSettings={userSettings}
          exercises={exercises}
          workoutExercises={workoutExercises}
          loadEvents={loadScheduleRange}
        />

        <ExerciseModal
          exerciseModalVisible={exerciseModalVisible}
          setExerciseModalVisible={setExerciseModalVisible}
          editingExercise={editingExercise}
          exerciseForm={exerciseForm}
          setExerciseForm={setExerciseForm}
          handleSaveExercise={handleSaveExercise}
        />

        <IngredientModal
          ingredientModalVisible={ingredientModalVisible}
          setIngredientModalVisible={setIngredientModalVisible}
          editingIngredient={editingIngredient}
          ingredientForm={ingredientForm}
          setIngredientForm={setIngredientForm}
          handleSaveIngredient={handleSaveIngredient}
        />

        <EventDetailsModal
          selectedEvent={selectedEvent}
          eventModalVisible={eventModalVisible}
          setSelectedEvent={setSelectedEvent}
          openEventEdit={openEventEdit}
          handleDeleteEvent={handleDeleteEvent}
          workouts={workouts}
          workoutExercises={workoutExercises}
          exercises={exercises}
          loadEvents={loadScheduleRange}
          fetchWorkoutExercises={fetchWorkoutExercises}
        />

        <SettingsModal
          isOpen={settingsModalVisible}
          onClose={() => setSettingsModalVisible(false)}
          userSettings={userSettings}
          onSaveSettings={handleSaveSettings}
        />

        <PartialShopModal
          isOpen={partialModalOpen}
          onClose={() => setPartialModalOpen(false)}
          list={activeGroceryList}
          onSave={handleSavePartialShop}
        />
      </main>
    </div>
  );
}

export default App;
