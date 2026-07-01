import customtkinter as ctk
import tkinter as tk
from tkinter import messagebox
from datetime import datetime, date, timedelta

from database import DatabaseManager

# Matplotlib embedded charts for the Analytics view
import matplotlib
matplotlib.use("Agg")  # backend is swapped to TkAgg lazily below once Tk root exists
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.figure import Figure

# Set the theme and color options
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

BG = "#2B2B2B"
ACCENT = "#1F6AA5"
GOOD = "#7CCD7C"


class FootballApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        # Configure window
        self.title("Athletic Performance & Life Dashboard")
        self.geometry("1100x650")

        # Configure grid layout
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        # ----------------- REAL DATABASE -----------------
        self.db = DatabaseManager()

        # In-progress "sandbox" state for whatever is currently being built.
        # These are cleared out every time a recipe/workout is saved.
        self.current_recipe_ingredients = []  # [{ingredient_id, name, qty, kcal, cost}]
        self.current_workout_exercises = []   # [{exercise_id, name, sets, reps, weight}]

        # ----------------- SIDEBAR NAVIGATION -----------------
        self.sidebar_frame = ctk.CTkFrame(self, width=220, corner_radius=0)
        self.sidebar_frame.grid(row=0, column=0, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(6, weight=1)

        self.logo_label = ctk.CTkLabel(self.sidebar_frame, text="PERFORMANCE HQ", font=ctk.CTkFont(size=20, weight="bold"))
        self.logo_label.grid(row=0, column=0, padx=20, pady=(20, 30))

        self.btn_home = ctk.CTkButton(self.sidebar_frame, text="Dashboard Home", anchor="w", command=self.show_home_view)
        self.btn_home.grid(row=1, column=0, padx=20, pady=10, sticky="ew")

        self.btn_training = ctk.CTkButton(self.sidebar_frame, text="Training", anchor="w", command=self.show_training_view)
        self.btn_training.grid(row=2, column=0, padx=20, pady=10, sticky="ew")

        self.btn_diet = ctk.CTkButton(self.sidebar_frame, text="Meal Planner", anchor="w", command=self.show_diet_view)
        self.btn_diet.grid(row=3, column=0, padx=20, pady=10, sticky="ew")

        self.btn_calendar = ctk.CTkButton(self.sidebar_frame, text="Schedule", anchor="w", command=self.show_calendar_view)
        self.btn_calendar.grid(row=4, column=0, padx=20, pady=10, sticky="ew")

        self.btn_analytics = ctk.CTkButton(self.sidebar_frame, text="Analytics 📊", anchor="w", command=self.show_analytics_view)
        self.btn_analytics.grid(row=5, column=0, padx=20, pady=10, sticky="ew")

        self.main_frame = None
        self.current_cal_view = "Week"
        self.current_cal_anchor = date.today()  # date currently in view, used for prev/next navigation
        self.show_home_view()

    # ==================================================================
    # VIEW SWITCHING LOGIC
    # ==================================================================
    def reset_main_frame(self):
        if self.main_frame is not None:
            self.main_frame.grid_forget()
            self.main_frame.destroy()

        self.main_frame = ctk.CTkFrame(self, corner_radius=15)
        self.main_frame.grid(row=0, column=1, padx=20, pady=20, sticky="nsew")

    # ==================================================================
    # HOME
    # ==================================================================
    def show_home_view(self):
        self.reset_main_frame()
        self.main_frame.grid_columnconfigure(0, weight=1)
        self.main_frame.grid_rowconfigure(0, weight=0)   # banner strip (~5%)
        self.main_frame.grid_rowconfigure(1, weight=1)   # workout logger + meals (~95%, split 75/20)

        # ---- 5%: unscheduled-time banner ----
        self.home_banner = ctk.CTkFrame(self.main_frame, fg_color="#1A242F", corner_radius=8, height=42)
        self.home_banner.grid(row=0, column=0, padx=20, pady=(20, 10), sticky="ew")
        self.home_banner.grid_propagate(False)
        self.lbl_free_time = ctk.CTkLabel(self.home_banner, text="", font=ctk.CTkFont(size=13, weight="bold"), text_color=GOOD)
        self.lbl_free_time.pack(pady=10)
        self.refresh_free_time_banner()

        body = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        body.grid(row=1, column=0, padx=20, pady=(0, 20), sticky="nsew")
        body.grid_rowconfigure(0, weight=1)
        body.grid_columnconfigure(0, weight=75)  # workout logger ≈ 75%
        body.grid_columnconfigure(1, weight=20)  # meal list ≈ 20%

        # ---- 75%: today's workout logging interface ----
        self.workout_logger_panel = ctk.CTkFrame(body, corner_radius=12, border_width=1, border_color=ACCENT)
        self.workout_logger_panel.grid(row=0, column=0, padx=(0, 10), sticky="nsew")
        self.render_workout_logger()

        # ---- 20%: today's planned meals ----
        self.meals_panel = ctk.CTkFrame(body, corner_radius=12)
        self.meals_panel.grid(row=0, column=1, sticky="nsew")
        self.render_home_meals_panel()

    # ---- Home: 5% banner ----
    def refresh_free_time_banner(self):
        """Unscheduled minutes between 06:00 and 24:00 today, based on scheduled event durations."""
        today_str = date.today().isoformat()
        WINDOW_START_MIN = 6 * 60
        WINDOW_END_MIN = 24 * 60
        scheduled = 0
        for ev in self.db.get_events_for_day(today_str):
            if not ev["start_time"]:
                continue
            try:
                hh, mm = ev["start_time"].split(":")
                start_min = int(hh) * 60 + int(mm)
            except (ValueError, AttributeError):
                continue
            dur = ev["duration_mins"] or 30
            end_min = start_min + dur
            # Clip the event to the 6am-midnight window before counting it
            clipped_start = max(start_min, WINDOW_START_MIN)
            clipped_end = min(end_min, WINDOW_END_MIN)
            if clipped_end > clipped_start:
                scheduled += clipped_end - clipped_start

        free_minutes = max((WINDOW_END_MIN - WINDOW_START_MIN) - scheduled, 0)
        hrs, mins = divmod(free_minutes, 60)
        self.lbl_free_time.configure(text=f"🕒 {hrs}h {mins}m unscheduled between 6:00 AM – 12:00 AM today")

    # ---- Home: 75% workout logger ----
    def render_workout_logger(self):
        for w in self.workout_logger_panel.winfo_children():
            w.destroy()
        self.workout_logger_panel.grid_columnconfigure(0, weight=1)
        self.workout_logger_panel.grid_rowconfigure(2, weight=1)

        next_event = self.db.get_next_training_event()

        header = ctk.CTkFrame(self.workout_logger_panel, fg_color="transparent")
        header.grid(row=0, column=0, padx=20, pady=(20, 5), sticky="ew")
        ctk.CTkLabel(header, text="Today's Workout 🏋️", font=ctk.CTkFont(size=18, weight="bold"), text_color=ACCENT).pack(side="left")

        if not next_event:
            ctk.CTkLabel(self.workout_logger_panel, text="No workout planned.", font=ctk.CTkFont(size=14)).grid(row=1, column=0, padx=20, pady=10, sticky="w")
            ctk.CTkButton(self.workout_logger_panel, text="Go to Schedule →", fg_color="#3A3A3A",
                          command=self.show_calendar_view).grid(row=2, column=0, padx=20, pady=10, sticky="w")
            return

        workout = self.db.get_workout(next_event["ref_workout_id"])
        if not workout:
            ctk.CTkLabel(self.workout_logger_panel, text="The linked workout no longer exists.", font=ctk.CTkFont(size=14)).grid(row=1, column=0, padx=20, pady=10, sticky="w")
            return

        subtitle = ctk.CTkLabel(
            self.workout_logger_panel,
            text=f"{workout['name']}  •  {next_event['event_date']} {next_event['start_time'] or ''}".strip(),
            font=ctk.CTkFont(size=13), text_color="gray",
        )
        subtitle.grid(row=1, column=0, padx=20, pady=(0, 10), sticky="w")

        exercises = self.db.get_workout_exercises(workout["id"])
        self._logger_exercise_entries = []  # [{exercise_id, sets, reps, weight_entry, reps_entry}]

        scroll = ctk.CTkScrollableFrame(self.workout_logger_panel, fg_color="transparent")
        scroll.grid(row=2, column=0, padx=20, pady=(0, 10), sticky="nsew")
        scroll.grid_columnconfigure(0, weight=1)

        if not exercises:
            ctk.CTkLabel(scroll, text="This workout has no exercises.", text_color="gray").grid(row=0, column=0, pady=10)

        for idx, ex in enumerate(exercises):
            row = ctk.CTkFrame(scroll, fg_color="#242424", corner_radius=8)
            row.grid(row=idx, column=0, padx=5, pady=5, sticky="ew")
            row.grid_columnconfigure(0, weight=1)

            ctk.CTkLabel(row, text=ex["name"], font=ctk.CTkFont(size=14, weight="bold")).grid(row=0, column=0, padx=15, pady=(10, 2), sticky="w")
            planned = f"Planned: {ex['sets'] or '-'} sets x {ex['reps'] or '-'} reps @ {ex['weight'] if ex['weight'] is not None else '-'}"
            ctk.CTkLabel(row, text=planned, font=ctk.CTkFont(size=11), text_color="gray").grid(row=1, column=0, padx=15, pady=(0, 10), sticky="w")

            entry_frame = ctk.CTkFrame(row, fg_color="transparent")
            entry_frame.grid(row=0, column=1, rowspan=2, padx=15, pady=10, sticky="e")
            ctk.CTkLabel(entry_frame, text="Weight lifted:", font=ctk.CTkFont(size=11)).grid(row=0, column=0, padx=(0, 5))
            weight_entry = ctk.CTkEntry(entry_frame, width=80, placeholder_text=str(ex["weight"]) if ex["weight"] is not None else "lbs")
            weight_entry.grid(row=0, column=1, padx=(0, 10))
            ctk.CTkLabel(entry_frame, text="Reps:", font=ctk.CTkFont(size=11)).grid(row=0, column=2, padx=(0, 5))
            reps_entry = ctk.CTkEntry(entry_frame, width=50, placeholder_text=str(ex["reps"]) if ex["reps"] is not None else "")
            reps_entry.grid(row=0, column=3)

            self._logger_exercise_entries.append({
                "exercise_id": ex["exercise_id"], "sets": ex["sets"], "reps": ex["reps"],
                "weight": ex["weight"], "weight_entry": weight_entry, "reps_entry": reps_entry,
            })

        self.lbl_logger_status = ctk.CTkLabel(self.workout_logger_panel, text="", text_color="orange")
        self.lbl_logger_status.grid(row=3, column=0, padx=20, sticky="w")

        ctk.CTkButton(self.workout_logger_panel, text="✅ Complete Workout & Log Metrics", fg_color="#2E7D32",
                      hover_color="#1B5E20", font=ctk.CTkFont(weight="bold"), height=40,
                      command=lambda: self.complete_workout(next_event["id"])).grid(row=4, column=0, padx=20, pady=(5, 20), sticky="ew")

    def complete_workout(self, event_id):
        today_str = date.today().isoformat()
        for item in getattr(self, "_logger_exercise_entries", []):
            raw_weight = item["weight_entry"].get().strip()
            weight_val = None
            if raw_weight:
                try:
                    weight_val = float(raw_weight)
                except ValueError:
                    weight_val = None
            if weight_val is None:
                weight_val = item["weight"]  # fall back to planned target
            if weight_val is None:
                continue  # nothing usable to log for this exercise

            raw_reps = item["reps_entry"].get().strip()
            reps_val = int(raw_reps) if raw_reps.isdigit() else item["reps"]

            self.db.log_lift(item["exercise_id"], weight_val, sets=item["sets"], reps=reps_val, log_date=today_str)

        # The planned session is done — remove it so the dashboard surfaces the next one.
        self.db.delete_calendar_event(event_id)
        self.lbl_logger_status.configure(text="Workout logged. Nice work.", text_color=GOOD)
        self.render_workout_logger()
        self.refresh_free_time_banner()

    # ---- Home: 20% today's meals ----
    def render_home_meals_panel(self):
        for w in self.meals_panel.winfo_children():
            w.destroy()
        self.meals_panel.grid_columnconfigure(0, weight=1)
        self.meals_panel.grid_rowconfigure(1, weight=1)

        ctk.CTkLabel(self.meals_panel, text="Today's Meals 🍴", font=ctk.CTkFont(size=16, weight="bold"), text_color=ACCENT).grid(row=0, column=0, padx=15, pady=(15, 5), sticky="w")

        scroll = ctk.CTkScrollableFrame(self.meals_panel, fg_color="transparent")
        scroll.grid(row=1, column=0, padx=10, pady=(0, 15), sticky="nsew")
        scroll.grid_columnconfigure(0, weight=1)

        today_str = date.today().isoformat()
        meals = [e for e in self.db.get_events_for_day(today_str) if e["event_type"] == "🥗 Meal/Nutrition"]

        if not meals:
            ctk.CTkLabel(scroll, text="No meals planned today.", text_color="gray", wraplength=180, justify="left").grid(row=0, column=0, padx=5, pady=10, sticky="w")
            return

        for idx, meal in enumerate(meals):
            card = ctk.CTkButton(
                scroll, text=f"{meal['start_time'] or '--:--'}\n{meal['title']}", anchor="w",
                fg_color="#242424", hover_color="#2E7D32", font=ctk.CTkFont(size=12),
                command=lambda m=meal: self.show_meal_quicklook(m),
            )
            card.grid(row=idx, column=0, padx=5, pady=4, sticky="ew")

    def show_meal_quicklook(self, meal_event):
        if meal_event.get("ref_recipe_id"):
            self.show_recipe_details(meal_event["ref_recipe_id"], meal_event["title"])
        else:
            messagebox.showinfo(meal_event["title"], meal_event.get("notes") or "No further details for this meal.")

    # ==================================================================
    # DIET & NUTRITION
    # ==================================================================
    def show_diet_view(self):
        self.reset_main_frame()
        self.main_frame.grid_columnconfigure(0, weight=1)
        self.main_frame.grid_rowconfigure(1, weight=1)

        header_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        header_frame.grid(row=0, column=0, padx=30, pady=(20, 5), sticky="ew")
        ctk.CTkLabel(header_frame, text="Recipe Lab & Meal Planner 🍴", font=ctk.CTkFont(size=24, weight="bold")).pack(side="left")

        self.diet_tabs = ctk.CTkTabview(self.main_frame)
        self.diet_tabs.grid(row=1, column=0, padx=30, pady=(0, 20), sticky="nsew")

        tab_create = self.diet_tabs.add("Create Recipe")
        tab_view = self.diet_tabs.add("View Recipes")
        tab_create.grid_columnconfigure(0, weight=4)
        tab_create.grid_columnconfigure(1, weight=3)
        tab_create.grid_rowconfigure(0, weight=1)
        tab_view.grid_columnconfigure(0, weight=1)
        tab_view.grid_rowconfigure(1, weight=1)

        # Reset the recipe-in-progress every time this view is (re)built
        self.current_recipe_ingredients = []

        # ---------------- Tab 1: Create Recipe ----------------
        builder_panel = ctk.CTkFrame(tab_create, border_width=1, border_color=ACCENT)
        builder_panel.grid(row=0, column=0, padx=(5, 10), pady=10, sticky="nsew")
        builder_panel.grid_rowconfigure(3, weight=1)
        builder_panel.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(builder_panel, text="Recipe Builder", font=ctk.CTkFont(size=15, weight="bold"), text_color=ACCENT).grid(row=0, column=0, padx=15, pady=10, sticky="w")

        name_frame = ctk.CTkFrame(builder_panel, fg_color="transparent")
        name_frame.grid(row=1, column=0, padx=15, pady=5, sticky="ew")
        name_frame.grid_columnconfigure(0, weight=1)
        self.entry_recipe_name = ctk.CTkEntry(name_frame, placeholder_text="Enter Recipe Name (e.g., Post-Workout Smoothie)")
        self.entry_recipe_name.grid(row=0, column=0, sticky="ew")

        aggregator_box = ctk.CTkFrame(builder_panel, fg_color="#1A242F", height=50)
        aggregator_box.grid(row=2, column=0, padx=15, pady=10, sticky="ew")
        aggregator_box.grid_columnconfigure((0, 1), weight=1)
        self.lbl_running_calories = ctk.CTkLabel(aggregator_box, text="Total Energy: 0 kcal", font=ctk.CTkFont(size=13, weight="bold"))
        self.lbl_running_calories.grid(row=0, column=0, pady=10)
        self.lbl_running_cost = ctk.CTkLabel(aggregator_box, text="Estimated Cost: $0.00", font=ctk.CTkFont(size=13, weight="bold"), text_color=GOOD)
        self.lbl_running_cost.grid(row=0, column=1, pady=10)

        self.recipe_sandbox_scroll = ctk.CTkScrollableFrame(builder_panel, label_text="Ingredients in Recipe")
        self.recipe_sandbox_scroll.grid(row=3, column=0, padx=15, pady=5, sticky="nsew")
        self.recipe_sandbox_scroll.grid_columnconfigure(0, weight=1)
        self.render_recipe_sandbox()

        search_frame = ctk.CTkFrame(builder_panel, fg_color="transparent")
        search_frame.grid(row=4, column=0, padx=15, pady=10, sticky="ew")
        search_frame.grid_columnconfigure(0, weight=1)
        self.entry_search_ing = ctk.CTkEntry(search_frame, placeholder_text="🔎 Type exact/partial name from Database...")
        self.entry_search_ing.grid(row=0, column=0, padx=(0, 5), sticky="ew")
        self.entry_ing_qty = ctk.CTkEntry(search_frame, width=70, placeholder_text="Qty (g)")
        self.entry_ing_qty.grid(row=0, column=1, padx=5)
        ctk.CTkButton(search_frame, text="➕ Add", width=60, fg_color="#2E7D32", hover_color="#1B5E20",
                      command=self.add_ingredient_to_sandbox).grid(row=0, column=2, padx=(5, 0))

        self.lbl_diet_status = ctk.CTkLabel(builder_panel, text="", text_color="orange")
        self.lbl_diet_status.grid(row=5, column=0, padx=15, sticky="w")

        ctk.CTkButton(builder_panel, text="💾 Save Recipe", fg_color=ACCENT, font=ctk.CTkFont(weight="bold"),
                      command=self.save_recipe).grid(row=6, column=0, padx=15, pady=15, sticky="ew")

        # ---- Right column: register a brand new ingredient into the master DB ----
        custom_panel = ctk.CTkFrame(tab_create)
        custom_panel.grid(row=0, column=1, padx=(10, 5), pady=10, sticky="nsew")
        custom_panel.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(custom_panel, text="Register New Ingredient", font=ctk.CTkFont(size=15, weight="bold")).grid(row=0, column=0, padx=15, pady=10, sticky="w")
        ctk.CTkLabel(custom_panel, text="Ingredient Name:", font=ctk.CTkFont(size=11)).grid(row=1, column=0, padx=15, pady=(5, 0), sticky="w")
        self.entry_new_ing_name = ctk.CTkEntry(custom_panel, placeholder_text="e.g. Chicken Breast")
        self.entry_new_ing_name.grid(row=2, column=0, padx=15, pady=(0, 10), sticky="ew")
        ctk.CTkLabel(custom_panel, text="Calories (per 100g):", font=ctk.CTkFont(size=11)).grid(row=3, column=0, padx=15, pady=(5, 0), sticky="w")
        self.entry_new_ing_kcal = ctk.CTkEntry(custom_panel, placeholder_text="0")
        self.entry_new_ing_kcal.grid(row=4, column=0, padx=15, pady=(0, 10), sticky="ew")
        ctk.CTkLabel(custom_panel, text="Cost (per 100g):", font=ctk.CTkFont(size=11)).grid(row=5, column=0, padx=15, pady=(5, 0), sticky="w")
        self.entry_new_ing_cost = ctk.CTkEntry(custom_panel, placeholder_text="$0.00")
        self.entry_new_ing_cost.grid(row=6, column=0, padx=15, pady=(0, 15), sticky="ew")
        ctk.CTkButton(custom_panel, text="Save to Database", fg_color="#E65100", hover_color="#BF360C",
                      command=self.register_ingredient).grid(row=7, column=0, padx=15, pady=10, sticky="ew")

        self.lbl_ing_status = ctk.CTkLabel(custom_panel, text="", text_color=GOOD)
        self.lbl_ing_status.grid(row=8, column=0, padx=15, pady=(0, 10), sticky="w")

        # ---------------- Tab 2: View Recipes ----------------
        search_bar_frame = ctk.CTkFrame(tab_view, fg_color="transparent")
        search_bar_frame.grid(row=0, column=0, padx=15, pady=15, sticky="ew")
        search_bar_frame.grid_columnconfigure(0, weight=1)
        self.entry_recipe_search = ctk.CTkEntry(search_bar_frame, placeholder_text="🔎 Search Recipes...")
        self.entry_recipe_search.grid(row=0, column=0, padx=(0, 10), sticky="ew")
        ctk.CTkButton(search_bar_frame, text="Search", width=150, fg_color=ACCENT,
                      command=lambda: self.refresh_recipe_list(self.entry_recipe_search.get())).grid(row=0, column=1)

        self.recipe_db_scroll = ctk.CTkScrollableFrame(tab_view, label_text="Committed Master Recipe Database")
        self.recipe_db_scroll.grid(row=1, column=0, padx=15, pady=(0, 15), sticky="nsew")
        self.recipe_db_scroll.grid_columnconfigure(0, weight=1)
        self.refresh_recipe_list()

    def render_recipe_sandbox(self):
        for w in self.recipe_sandbox_scroll.winfo_children():
            w.destroy()
        if not self.current_recipe_ingredients:
            ctk.CTkLabel(self.recipe_sandbox_scroll, text="No ingredients added yet.", text_color="gray").grid(row=0, column=0, padx=5, pady=8)
        for idx, item in enumerate(self.current_recipe_ingredients):
            row = ctk.CTkFrame(self.recipe_sandbox_scroll, fg_color="#242424")
            row.grid(row=idx, column=0, padx=5, pady=3, sticky="ew")
            row.grid_columnconfigure(0, weight=1)
            ctk.CTkLabel(row, text=f"{item['name']} ({item['qty']:.0f}g)", font=ctk.CTkFont(size=12)).grid(row=0, column=0, sticky="w", padx=10, pady=5)
            ctk.CTkLabel(row, text=f"{item['kcal']:.0f} kcal • ${item['cost']:.2f}", font=ctk.CTkFont(size=12), text_color="gray").grid(row=0, column=1, padx=10, pady=5)
            ctk.CTkButton(row, text="✕", width=28, fg_color="#5A1F1F", hover_color="#7A2727",
                          command=lambda i=idx: self.remove_ingredient_from_sandbox(i)).grid(row=0, column=2, padx=(0, 10))

        total_kcal = sum(i["kcal"] for i in self.current_recipe_ingredients)
        total_cost = sum(i["cost"] for i in self.current_recipe_ingredients)
        self.lbl_running_calories.configure(text=f"Total Energy: {total_kcal:.0f} kcal")
        self.lbl_running_cost.configure(text=f"Estimated Cost: ${total_cost:.2f}")

    def add_ingredient_to_sandbox(self):
        name_query = self.entry_search_ing.get().strip()
        qty_raw = self.entry_ing_qty.get().strip()
        if not name_query:
            self.lbl_diet_status.configure(text="Enter an ingredient name to search for.")
            return
        try:
            qty = float(qty_raw)
            if qty <= 0:
                raise ValueError
        except ValueError:
            self.lbl_diet_status.configure(text="Enter a valid quantity in grams.")
            return

        matches = self.db.search_ingredients(name_query)
        if not matches:
            self.lbl_diet_status.configure(text=f"No ingredient matching '{name_query}'. Register it on the right first.")
            return

        ing = matches[0]  # take best/first match
        factor = qty / 100.0
        self.current_recipe_ingredients.append({
            "ingredient_id": ing["id"],
            "name": ing["name"],
            "qty": qty,
            "kcal": ing["kcal_per_100g"] * factor,
            "cost": ing["cost_per_100g"] * factor,
        })
        self.entry_search_ing.delete(0, "end")
        self.entry_ing_qty.delete(0, "end")
        self.lbl_diet_status.configure(text=f"Added {ing['name']}." + (" (multiple matches found, used closest)" if len(matches) > 1 else ""))
        self.render_recipe_sandbox()

    def remove_ingredient_from_sandbox(self, idx):
        del self.current_recipe_ingredients[idx]
        self.render_recipe_sandbox()

    def register_ingredient(self):
        name = self.entry_new_ing_name.get().strip()
        try:
            kcal = float(self.entry_new_ing_kcal.get().strip())
            cost = float(self.entry_new_ing_cost.get().strip().lstrip("$"))
        except ValueError:
            self.lbl_ing_status.configure(text="Calories and cost must be numbers.", text_color="orange")
            return
        if not name:
            self.lbl_ing_status.configure(text="Enter an ingredient name.", text_color="orange")
            return
        try:
            self.db.add_ingredient(name, kcal, cost)
        except Exception as e:
            self.lbl_ing_status.configure(text=f"Could not save (duplicate name?): {e}", text_color="orange")
            return
        self.entry_new_ing_name.delete(0, "end")
        self.entry_new_ing_kcal.delete(0, "end")
        self.entry_new_ing_cost.delete(0, "end")
        self.lbl_ing_status.configure(text=f"'{name}' added to database.", text_color=GOOD)

    def save_recipe(self):
        name = self.entry_recipe_name.get().strip()
        if not name:
            self.lbl_diet_status.configure(text="Give the recipe a name before saving.")
            return
        if not self.current_recipe_ingredients:
            self.lbl_diet_status.configure(text="Add at least one ingredient before saving.")
            return
        ingredient_list = [{"ingredient_id": i["ingredient_id"], "quantity_g": i["qty"]} for i in self.current_recipe_ingredients]
        self.db.add_recipe(name, ingredient_list)
        self.entry_recipe_name.delete(0, "end")
        self.current_recipe_ingredients = []
        self.render_recipe_sandbox()
        self.lbl_diet_status.configure(text=f"'{name}' saved to Master Recipe Database.", text_color=GOOD)
        self.refresh_recipe_list()

    def refresh_recipe_list(self, query=""):
        for w in self.recipe_db_scroll.winfo_children():
            w.destroy()
        recipes = self.db.search_recipes(query) if query else self.db.get_all_recipes()
        if not recipes:
            ctk.CTkLabel(self.recipe_db_scroll, text="No recipes saved yet — build one in the Create Recipe tab.", text_color="gray").grid(row=0, column=0, padx=10, pady=10)
            return
        for idx, r in enumerate(recipes):
            db_card = ctk.CTkFrame(self.recipe_db_scroll, fg_color="#2B2B2B")
            db_card.grid(row=idx, column=0, padx=10, pady=6, sticky="ew")
            db_card.grid_columnconfigure(0, weight=1)
            ctk.CTkLabel(db_card, text=r["name"], font=ctk.CTkFont(size=14, weight="bold")).grid(row=0, column=0, padx=15, pady=(8, 2), sticky="w")
            details = f"{r['total_kcal']:.0f} kcal  •  Cost: ${r['cost']:.2f}  •  {r['time_to_cook_mins']} min"
            ctk.CTkLabel(db_card, text=details, font=ctk.CTkFont(size=12), text_color="lightgray").grid(row=1, column=0, padx=15, pady=(0, 8), sticky="w")
            ctk.CTkButton(db_card, text="🔍 Details", width=100, height=28, fg_color="#3A3A3A",
                          command=lambda rid=r["id"], rname=r["name"]: self.show_recipe_details(rid, rname)).grid(row=0, column=1, rowspan=2, padx=(0, 8), pady=8, sticky="e")
            ctk.CTkButton(db_card, text="🗑", width=36, height=28, fg_color="#5A1F1F", hover_color="#7A2727",
                          command=lambda rid=r["id"]: self.delete_recipe_and_refresh(rid)).grid(row=0, column=2, rowspan=2, padx=(0, 15), pady=8, sticky="e")

    def delete_recipe_and_refresh(self, recipe_id):
        try:
            self.db.delete_recipe(recipe_id)
            self.refresh_recipe_list()
        except Exception:
            messagebox.showerror("Delete Error", "Cannot delete this item: it is currently being used in a calendar event.")

    def show_recipe_details(self, recipe_id, recipe_name):
        popup = ctk.CTkToplevel(self)
        popup.title(recipe_name)
        popup.geometry("360x400")
        popup.transient(self)
        popup.grab_set()
        ctk.CTkLabel(popup, text=recipe_name, font=ctk.CTkFont(size=18, weight="bold")).pack(pady=(15, 10))
        for ing in self.db.get_recipe_ingredients(recipe_id):
            row = ctk.CTkFrame(popup, fg_color="#242424")
            row.pack(fill="x", padx=15, pady=3)
            ctk.CTkLabel(row, text=f"{ing['name']} ({ing['quantity_g']:.0f}g)").pack(side="left", padx=10, pady=6)

    # ==================================================================
    # TRAINING & EXERCISES
    # ==================================================================
    def show_training_view(self):
        self.reset_main_frame()
        self.main_frame.grid_columnconfigure(0, weight=1)
        self.main_frame.grid_rowconfigure(1, weight=1)

        header_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        header_frame.grid(row=0, column=0, padx=30, pady=(20, 5), sticky="ew")
        title = ctk.CTkLabel(header_frame, text="Training Strategy 🏈", font=ctk.CTkFont(size=24, weight="bold"))
        title.pack(side="left")

        self.train_tabs = ctk.CTkTabview(self.main_frame)
        self.train_tabs.grid(row=1, column=0, padx=30, pady=(0, 20), sticky="nsew")

        tab_create = self.train_tabs.add("Build Workout")
        tab_view = self.train_tabs.add("Saved Workouts")
        tab_create.grid_columnconfigure(0, weight=4)
        tab_create.grid_columnconfigure(1, weight=3)
        tab_create.grid_rowconfigure(0, weight=1)
        tab_view.grid_columnconfigure(0, weight=1)
        tab_view.grid_rowconfigure(1, weight=1)

        self.current_workout_exercises = []

        # ---------------- Tab 1: BUILD WORKOUT ----------------
        builder_panel = ctk.CTkFrame(tab_create, border_width=1, border_color=ACCENT)
        builder_panel.grid(row=0, column=0, padx=(5, 10), pady=10, sticky="nsew")
        builder_panel.grid_rowconfigure(2, weight=1)
        builder_panel.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(builder_panel, text="Workout Builder", font=ctk.CTkFont(size=15, weight="bold"), text_color=ACCENT).grid(row=0, column=0, padx=15, pady=10, sticky="w")

        name_frame = ctk.CTkFrame(builder_panel, fg_color="transparent")
        name_frame.grid(row=1, column=0, padx=15, pady=5, sticky="ew")
        name_frame.grid_columnconfigure(0, weight=1)
        self.entry_workout_name = ctk.CTkEntry(name_frame, placeholder_text="Enter Workout Name (e.g., Lower Body Power - Phase 1)")
        self.entry_workout_name.grid(row=0, column=0, sticky="ew")

        self.workout_sandbox_scroll = ctk.CTkScrollableFrame(builder_panel, label_text="Exercises in Workout")
        self.workout_sandbox_scroll.grid(row=2, column=0, padx=15, pady=10, sticky="nsew")
        self.workout_sandbox_scroll.grid_columnconfigure(0, weight=1)
        self.render_workout_sandbox()

        add_frame = ctk.CTkFrame(builder_panel, fg_color="transparent")
        add_frame.grid(row=3, column=0, padx=15, pady=10, sticky="ew")
        add_frame.grid_columnconfigure(0, weight=2)
        add_frame.grid_columnconfigure((1, 2, 3), weight=1)

        exercise_names = self.get_exercise_names(seed_if_empty=True)
        self.add_ex_drop = ctk.CTkOptionMenu(add_frame, values=exercise_names)
        self.add_ex_drop.grid(row=0, column=0, padx=(0, 5), sticky="ew")
        self.add_ex_sets = ctk.CTkEntry(add_frame, placeholder_text="Sets")
        self.add_ex_sets.grid(row=0, column=1, padx=5, sticky="ew")
        self.add_ex_reps = ctk.CTkEntry(add_frame, placeholder_text="Reps")
        self.add_ex_reps.grid(row=0, column=2, padx=5, sticky="ew")
        self.add_ex_weight = ctk.CTkEntry(add_frame, placeholder_text="Target Lbs/%")
        self.add_ex_weight.grid(row=0, column=3, padx=5, sticky="ew")
        ctk.CTkButton(add_frame, text="➕ Add", width=60, fg_color="#2E7D32", hover_color="#1B5E20",
                      command=self.add_exercise_to_sandbox).grid(row=0, column=4, padx=(5, 0))

        new_ex_frame = ctk.CTkFrame(builder_panel, fg_color="transparent")
        new_ex_frame.grid(row=4, column=0, padx=15, pady=(0, 5), sticky="ew")
        new_ex_frame.grid_columnconfigure(0, weight=1)
        self.entry_new_exercise = ctk.CTkEntry(new_ex_frame, placeholder_text="New exercise not in the list? Type it here...")
        self.entry_new_exercise.grid(row=0, column=0, sticky="ew", padx=(0, 5))
        ctk.CTkButton(new_ex_frame, text="＋ New Exercise", width=130, fg_color="#3A3A3A",
                      command=self.register_exercise).grid(row=0, column=1)

        self.lbl_train_status = ctk.CTkLabel(builder_panel, text="", text_color="orange")
        self.lbl_train_status.grid(row=5, column=0, padx=15, sticky="w")

        ctk.CTkButton(builder_panel, text="💾 Save Workout", fg_color=ACCENT, font=ctk.CTkFont(weight="bold"),
                      command=self.save_workout).grid(row=6, column=0, padx=15, pady=15, sticky="ew")

        # ---- Right column: 1RM vault ----
        vault_panel = ctk.CTkFrame(tab_create)
        vault_panel.grid(row=0, column=1, padx=(10, 5), pady=10, sticky="nsew")
        vault_panel.grid_columnconfigure(0, weight=1)
        vault_panel.grid_rowconfigure(3, weight=1)
        ctk.CTkLabel(vault_panel, text="Strength Reference Vault", font=ctk.CTkFont(size=15, weight="bold")).grid(row=0, column=0, padx=15, pady=(15, 5), sticky="w")

        onerm_box = ctk.CTkFrame(vault_panel, fg_color="#1A242F")
        onerm_box.grid(row=1, column=0, padx=15, pady=5, sticky="ew")
        onerm_box.grid_columnconfigure(0, weight=1)
        self.vault_drop = ctk.CTkOptionMenu(onerm_box, values=exercise_names, command=self.refresh_vault)
        self.vault_drop.grid(row=0, column=0, padx=10, pady=10, sticky="ew")
        ctk.CTkLabel(onerm_box, text="Estimated 1RM (from last log):", font=ctk.CTkFont(size=11)).grid(row=1, column=0, pady=(0, 2))
        self.lbl_1rm = ctk.CTkLabel(onerm_box, text="No logs yet", font=ctk.CTkFont(size=18, weight="bold"), text_color=GOOD)
        self.lbl_1rm.grid(row=2, column=0, pady=(0, 10))

        log_frame = ctk.CTkFrame(vault_panel, fg_color="transparent")
        log_frame.grid(row=2, column=0, padx=15, pady=(0, 10), sticky="ew")
        log_frame.grid_columnconfigure((0, 1, 2), weight=1)
        self.entry_log_weight = ctk.CTkEntry(log_frame, placeholder_text="Weight")
        self.entry_log_weight.grid(row=0, column=0, padx=2, sticky="ew")
        self.entry_log_sets = ctk.CTkEntry(log_frame, placeholder_text="Sets")
        self.entry_log_sets.grid(row=0, column=1, padx=2, sticky="ew")
        self.entry_log_reps = ctk.CTkEntry(log_frame, placeholder_text="Reps")
        self.entry_log_reps.grid(row=0, column=2, padx=2, sticky="ew")
        ctk.CTkButton(vault_panel, text="📈 Log Today's Lift", fg_color="#2E7D32", hover_color="#1B5E20",
                      command=self.log_lift_entry).grid(row=3, column=0, padx=15, pady=(0, 10), sticky="ew")

        self.vault_history_scroll = ctk.CTkScrollableFrame(vault_panel, label_text="Historical Log")
        self.vault_history_scroll.grid(row=4, column=0, padx=15, pady=15, sticky="nsew")
        self.vault_history_scroll.grid_columnconfigure(0, weight=1)
        vault_panel.grid_rowconfigure(4, weight=1)

        if exercise_names:
            self.refresh_vault(exercise_names[0])

        # ---------------- Tab 2: SAVED WORKOUTS ----------------
        search_bar_frame = ctk.CTkFrame(tab_view, fg_color="transparent")
        search_bar_frame.grid(row=0, column=0, padx=15, pady=15, sticky="ew")
        search_bar_frame.grid_columnconfigure(0, weight=1)
        self.entry_workout_search = ctk.CTkEntry(search_bar_frame, placeholder_text="🔎 Search Saved Workouts...")
        self.entry_workout_search.grid(row=0, column=0, padx=(0, 10), sticky="ew")
        ctk.CTkButton(search_bar_frame, text="Search", width=100, fg_color=ACCENT,
                      command=lambda: self.refresh_workout_list(self.entry_workout_search.get())).grid(row=0, column=1)

        self.workout_db_scroll = ctk.CTkScrollableFrame(tab_view, label_text="Workout Database Library")
        self.workout_db_scroll.grid(row=1, column=0, padx=15, pady=(0, 15), sticky="nsew")
        self.workout_db_scroll.grid_columnconfigure(0, weight=1)
        self.refresh_workout_list()

    def get_exercise_names(self, seed_if_empty=False):
        exercises = self.db.get_all_exercises()
        if not exercises and seed_if_empty:
            # Give a first-time user a starting library instead of an empty dropdown
            for name in ["Barbell Back Squat", "Deadlift", "Bench Press", "Power Clean", "Nordic Curl"]:
                self.db.add_exercise(name)
            exercises = self.db.get_all_exercises()
        return [e["name"] for e in exercises]

    def render_workout_sandbox(self):
        for w in self.workout_sandbox_scroll.winfo_children():
            w.destroy()
        if not self.current_workout_exercises:
            ctk.CTkLabel(self.workout_sandbox_scroll, text="No exercises added yet.", text_color="gray").grid(row=0, column=0, padx=5, pady=8)
        for idx, ex in enumerate(self.current_workout_exercises):
            ex_row = ctk.CTkFrame(self.workout_sandbox_scroll, fg_color="#242424")
            ex_row.grid(row=idx, column=0, padx=5, pady=3, sticky="ew")
            ex_row.grid_columnconfigure(0, weight=1)
            ctk.CTkLabel(ex_row, text=ex["name"], font=ctk.CTkFont(size=12, weight="bold")).grid(row=0, column=0, sticky="w", padx=10, pady=5)
            det = f"{ex['sets']} Sets x {ex['reps']} Reps @ Target: {ex['weight']}"
            ctk.CTkLabel(ex_row, text=det, font=ctk.CTkFont(size=12), text_color="gray").grid(row=0, column=1, padx=10, pady=5)
            ctk.CTkButton(ex_row, text="✕", width=28, fg_color="#5A1F1F", hover_color="#7A2727",
                          command=lambda i=idx: self.remove_exercise_from_sandbox(i)).grid(row=0, column=2, padx=(0, 10))

    def add_exercise_to_sandbox(self):
        name = self.add_ex_drop.get()
        try:
            sets = int(self.add_ex_sets.get().strip())
            reps = int(self.add_ex_reps.get().strip())
        except ValueError:
            self.lbl_train_status.configure(text="Sets and reps must be whole numbers.")
            return
        weight_raw = self.add_ex_weight.get().strip() or "0"

        exercise = self.db.get_exercise_by_name(name)
        if not exercise:
            self.lbl_train_status.configure(text="Select a valid exercise from the library.")
            return

        self.current_workout_exercises.append({
            "exercise_id": exercise["id"], "name": name, "sets": sets, "reps": reps, "weight": weight_raw
        })
        self.add_ex_sets.delete(0, "end")
        self.add_ex_reps.delete(0, "end")
        self.add_ex_weight.delete(0, "end")
        self.lbl_train_status.configure(text=f"Added {name}.")
        self.render_workout_sandbox()

    def remove_exercise_from_sandbox(self, idx):
        del self.current_workout_exercises[idx]
        self.render_workout_sandbox()

    def register_exercise(self):
        name = self.entry_new_exercise.get().strip()
        if not name:
            self.lbl_train_status.configure(text="Type a name for the new exercise first.")
            return
        self.db.get_or_create_exercise(name)
        self.entry_new_exercise.delete(0, "end")
        names = self.get_exercise_names()
        self.add_ex_drop.configure(values=names)
        self.add_ex_drop.set(name)
        self.vault_drop.configure(values=names)
        self.lbl_train_status.configure(text=f"'{name}' added to the exercise library.")

    def save_workout(self):
        name = self.entry_workout_name.get().strip()
        if not name:
            self.lbl_train_status.configure(text="Give the workout a name before saving.")
            return
        if not self.current_workout_exercises:
            self.lbl_train_status.configure(text="Add at least one exercise before saving.")
            return

        exercise_list = []
        for ex in self.current_workout_exercises:
            try:
                weight_val = float(str(ex["weight"]).rstrip("%lbs "))
            except ValueError:
                weight_val = None
            exercise_list.append({"exercise_id": ex["exercise_id"], "sets": ex["sets"], "reps": ex["reps"], "weight": weight_val})

        self.db.add_workout(name, exercise_list)
        self.entry_workout_name.delete(0, "end")
        self.current_workout_exercises = []
        self.render_workout_sandbox()
        self.lbl_train_status.configure(text=f"'{name}' saved to Workout Database.", text_color=GOOD)
        self.refresh_workout_list()

    def refresh_vault(self, exercise_name):
        exercise = self.db.get_exercise_by_name(exercise_name)
        for w in self.vault_history_scroll.winfo_children():
            w.destroy()
        if not exercise:
            self.lbl_1rm.configure(text="No logs yet")
            return
        estimate = self.db.get_current_1rm_estimate(exercise["id"])
        self.lbl_1rm.configure(text=f"{estimate} lbs" if estimate else "No logs yet")

        history = list(reversed(self.db.get_lift_history(exercise["id"], limit=20)))
        if not history:
            ctk.CTkLabel(self.vault_history_scroll, text="No lifts logged for this exercise yet.", text_color="gray").grid(row=0, column=0, padx=5, pady=8)
            return
        for idx, h in enumerate(history):
            h_card = ctk.CTkFrame(self.vault_history_scroll, fg_color="#2B2B2B")
            h_card.grid(row=idx, column=0, padx=5, pady=4, sticky="ew")
            ctk.CTkLabel(h_card, text=h["log_date"], font=ctk.CTkFont(size=12, weight="bold"), text_color=ACCENT).pack(anchor="w", padx=10, pady=(4, 1))
            det = f"{h['sets'] or '-'}x{h['reps'] or '-'} @ {h['weight']} lbs"
            ctk.CTkLabel(h_card, text=det, font=ctk.CTkFont(size=11)).pack(anchor="w", padx=10, pady=(1, 4))

    def log_lift_entry(self):
        exercise_name = self.vault_drop.get()
        exercise = self.db.get_exercise_by_name(exercise_name)
        if not exercise:
            return
        try:
            weight = float(self.entry_log_weight.get().strip())
        except ValueError:
            return
        sets = self.entry_log_sets.get().strip()
        reps = self.entry_log_reps.get().strip()
        self.db.log_lift(exercise["id"], weight, sets=int(sets) if sets.isdigit() else None,
                          reps=int(reps) if reps.isdigit() else None)
        self.entry_log_weight.delete(0, "end")
        self.entry_log_sets.delete(0, "end")
        self.entry_log_reps.delete(0, "end")
        self.refresh_vault(exercise_name)

    def refresh_workout_list(self, query=""):
        for w in self.workout_db_scroll.winfo_children():
            w.destroy()
        workouts = self.db.search_workouts(query) if query else self.db.get_all_workouts()
        if not workouts:
            ctk.CTkLabel(self.workout_db_scroll, text="No workouts saved yet — build one in the Build Workout tab.", text_color="gray").grid(row=0, column=0, padx=10, pady=10)
            return
        for idx, w_row in enumerate(workouts):
            exercises = self.db.get_workout_exercises(w_row["id"])
            w_card = ctk.CTkFrame(self.workout_db_scroll, fg_color="#2B2B2B")
            w_card.grid(row=idx, column=0, padx=10, pady=6, sticky="ew")
            w_card.grid_columnconfigure(0, weight=1)
            ctk.CTkLabel(w_card, text=w_row["name"], font=ctk.CTkFont(size=14, weight="bold")).grid(row=0, column=0, padx=15, pady=(8, 2), sticky="w")
            det = f"{len(exercises)} Exercises • Est. Duration: {w_row['duration_mins']} mins"
            ctk.CTkLabel(w_card, text=det, font=ctk.CTkFont(size=12), text_color="gray").grid(row=1, column=0, padx=15, pady=(0, 8), sticky="w")
            ctk.CTkButton(w_card, text="🗑", width=36, height=28, fg_color="#5A1F1F", hover_color="#7A2727",
                          command=lambda wid=w_row["id"]: self.delete_workout_and_refresh(wid)).grid(row=0, column=1, rowspan=2, padx=15, pady=8, sticky="e")

    def delete_workout_and_refresh(self, workout_id):
        try:
            self.db.delete_workout(workout_id)
            self.refresh_workout_list()
        except Exception:
            messagebox.showerror("Delete Error", "Cannot delete this item: it is currently being used in a calendar event.")

    # ==================================================================
    # CALENDAR / SCHEDULE SYSTEM & MODALS
    # ==================================================================
    def show_calendar_view(self):
        self.reset_main_frame()
        self.main_frame.grid_columnconfigure(0, weight=1)
        self.main_frame.grid_rowconfigure(2, weight=1)

        title = ctk.CTkLabel(self.main_frame, text="Schedule 📅", font=ctk.CTkFont(size=24, weight="bold"))
        title.grid(row=0, column=0, padx=30, pady=(30, 5), sticky="w")

        toggle_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        toggle_frame.grid(row=1, column=0, padx=30, pady=(0, 10), sticky="ew")
        toggle_frame.grid_columnconfigure(5, weight=1)

        views = ["Day", "Week", "Month"]
        for idx, v in enumerate(views):
            color = ACCENT if getattr(self, "current_cal_view", "Week") == v else "#3A3A3A"
            btn = ctk.CTkButton(toggle_frame, text=v, width=60, fg_color=color, hover_color="#4A4A4A",
                                 command=lambda view=v: self.switch_cal_view(view))
            btn.grid(row=0, column=idx, padx=(0, 5), sticky="w")

        ctk.CTkButton(toggle_frame, text="◀", width=36, fg_color="#3A3A3A", command=lambda: self.shift_cal_anchor(-1)).grid(row=0, column=3, padx=(10, 2))
        ctk.CTkButton(toggle_frame, text="Today", width=60, fg_color="#3A3A3A", command=self.reset_cal_anchor).grid(row=0, column=4, padx=2)
        ctk.CTkButton(toggle_frame, text="▶", width=36, fg_color="#3A3A3A", command=lambda: self.shift_cal_anchor(1)).grid(row=0, column=5, padx=(2, 10), sticky="w")

        btn_add_event = ctk.CTkButton(toggle_frame, text="➕ Add Event", fg_color="#2E7D32", hover_color="#1B5E20", command=self.open_add_event_modal)
        btn_add_event.grid(row=0, column=6, padx=5, sticky="e")

        self.cal_container = ctk.CTkFrame(self.main_frame, fg_color=BG, corner_radius=10)
        self.cal_container.grid(row=2, column=0, padx=30, pady=(0, 30), sticky="nsew")
        self.cal_container.grid_columnconfigure(0, weight=1)
        self.cal_container.grid_rowconfigure(0, weight=1)

        self.cal_canvas = tk.Canvas(self.cal_container, bg=BG, highlightthickness=0)
        self.cal_canvas.grid(row=0, column=0, sticky="nsew", padx=10, pady=10)
        self.cal_canvas.bind("<Configure>", lambda e: self.render_active_calendar())
        self.render_active_calendar()

    def shift_cal_anchor(self, direction):
        delta = {"Day": 1, "Week": 7, "Month": 30}[self.current_cal_view]
        self.current_cal_anchor += timedelta(days=delta * direction)
        self.render_active_calendar()

    def reset_cal_anchor(self):
        self.current_cal_anchor = date.today()
        self.render_active_calendar()

    def open_add_event_modal(self):
        """Opens a popup modal window to create a new calendar event with dynamic fields"""
        modal = ctk.CTkToplevel(self)
        modal.title("Add New Schedule Event")
        modal.geometry("480x650")
        modal.transient(self)
        modal.grab_set()

        ctk.CTkLabel(modal, text="Create New Event", font=ctk.CTkFont(size=20, weight="bold")).pack(pady=(20, 15))

        ctk.CTkLabel(modal, text="Event Title:", font=ctk.CTkFont(weight="bold")).pack(anchor="w", padx=25)
        self.entry_ev_title = ctk.CTkEntry(modal, placeholder_text="e.g. Phase 1 Power, Commute to Gym, etc.")
        self.entry_ev_title.pack(fill="x", padx=25, pady=(5, 15))

        ctk.CTkLabel(modal, text="Date (YYYY-MM-DD):", font=ctk.CTkFont(weight="bold")).pack(anchor="w", padx=25)
        self.entry_ev_date = ctk.CTkEntry(modal, placeholder_text=date.today().isoformat())
        self.entry_ev_date.insert(0, self.current_cal_anchor.isoformat())
        self.entry_ev_date.pack(fill="x", padx=25, pady=(5, 15))

        ctk.CTkLabel(modal, text="Event Category / Type:", font=ctk.CTkFont(weight="bold")).pack(anchor="w", padx=25)
        self.event_types = ["🏋️ Training Session", "🚗 Commute", "🥗 Meal/Nutrition", "💼 Work / Meeting", "🗓️ Social / Life"]
        self.drop_ev_type = ctk.CTkOptionMenu(modal, values=self.event_types, command=self.update_dynamic_modal_fields)
        self.drop_ev_type.pack(fill="x", padx=25, pady=(5, 15))

        self.dynamic_fields_frame = ctk.CTkFrame(modal, fg_color="transparent")
        self.dynamic_fields_frame.pack(fill="x", padx=25, pady=(0, 15))

        ctk.CTkLabel(modal, text="Custom Fields / Notes:", font=ctk.CTkFont(weight="bold")).pack(anchor="w", padx=25)
        self.text_ev_notes = ctk.CTkTextbox(modal, height=60)
        self.text_ev_notes.pack(fill="x", padx=25, pady=(5, 10))

        self.lbl_event_status = ctk.CTkLabel(modal, text="", text_color="orange")
        self.lbl_event_status.pack(anchor="w", padx=25)

        btn_save = ctk.CTkButton(modal, text="💾 Save Event to Calendar", fg_color=ACCENT, font=ctk.CTkFont(weight="bold"), height=40,
                                  command=lambda: self.save_calendar_event(modal))
        btn_save.pack(fill="x", padx=25, pady=10)

        # Initialize default view
        self.update_dynamic_modal_fields(self.event_types[0])

    def auto_update_workout_duration(self, selected_workout_name):
        """Finds the selected workout in the database and auto-fills its stored duration"""
        workout = next((row for row in self.db.get_all_workouts() if row["name"] == selected_workout_name), None)
        if workout and hasattr(self, "dyn_val_duration") and self.dyn_val_duration.winfo_exists():
            self.dyn_val_duration.delete(0, "end")
            self.dyn_val_duration.insert(0, str(workout["duration_mins"]))

    def auto_update_meal_kcal(self, selected_recipe_name):
        recipe = next((r for r in self.db.get_all_recipes() if r["name"] == selected_recipe_name), None)
        if recipe and hasattr(self, "lbl_meal_kcal_preview"):
            self.lbl_meal_kcal_preview.configure(text=f"{recipe['total_kcal']:.0f} kcal • ${recipe['cost']:.2f}")

    def update_dynamic_modal_fields(self, selected_type):
        """Clears and rebuilds the input fields based on the selected event category"""
        for widget in self.dynamic_fields_frame.winfo_children():
            widget.destroy()

        self.dynamic_fields_frame.grid_columnconfigure((0, 1), weight=1)

        if selected_type == "🏋️ Training Session":
            workout_names = [w["name"] for w in self.db.get_all_workouts()]
            ctk.CTkLabel(self.dynamic_fields_frame, text="Select Workout:", font=ctk.CTkFont(weight="bold")).grid(row=0, column=0, sticky="w", pady=(0, 5))
            self.dyn_val_1 = ctk.CTkOptionMenu(self.dynamic_fields_frame, values=workout_names or ["No workouts saved"], command=self.auto_update_workout_duration)
            self.dyn_val_1.grid(row=1, column=0, sticky="ew", padx=(0, 10))

            ctk.CTkLabel(self.dynamic_fields_frame, text="Start Time:", font=ctk.CTkFont(weight="bold")).grid(row=0, column=1, sticky="w", pady=(0, 5))
            self.dyn_val_2 = ctk.CTkEntry(self.dynamic_fields_frame, placeholder_text="14:00")
            self.dyn_val_2.grid(row=1, column=1, sticky="ew")

            ctk.CTkLabel(self.dynamic_fields_frame, text="Duration (Mins):", font=ctk.CTkFont(weight="bold")).grid(row=2, column=1, sticky="w", pady=(10, 5))
            self.dyn_val_duration = ctk.CTkEntry(self.dynamic_fields_frame, placeholder_text="Auto-calculating...")
            self.dyn_val_duration.grid(row=3, column=1, sticky="ew")

            if workout_names:
                self.auto_update_workout_duration(workout_names[0])

        elif selected_type == "🚗 Commute":
            ctk.CTkLabel(self.dynamic_fields_frame, text="Target Arrival Time:", font=ctk.CTkFont(weight="bold")).grid(row=0, column=0, sticky="w", pady=(0, 5))
            self.dyn_val_1 = ctk.CTkEntry(self.dynamic_fields_frame, placeholder_text="09:00")
            self.dyn_val_1.grid(row=1, column=0, sticky="ew", padx=(0, 10))

            ctk.CTkLabel(self.dynamic_fields_frame, text="Duration (Mins):", font=ctk.CTkFont(weight="bold")).grid(row=0, column=1, sticky="w", pady=(0, 5))
            self.dyn_val_duration = ctk.CTkEntry(self.dynamic_fields_frame, placeholder_text="45")
            self.dyn_val_duration.grid(row=1, column=1, sticky="ew")

        elif selected_type == "🥗 Meal/Nutrition":
            meal_names = [m["name"] for m in self.db.get_all_recipes()]
            ctk.CTkLabel(self.dynamic_fields_frame, text="Select Meal:", font=ctk.CTkFont(weight="bold")).grid(row=0, column=0, sticky="w", pady=(0, 5))
            self.dyn_val_1 = ctk.CTkOptionMenu(self.dynamic_fields_frame, values=meal_names or ["No recipes saved"], command=self.auto_update_meal_kcal)
            self.dyn_val_1.grid(row=1, column=0, sticky="ew", padx=(0, 10))

            ctk.CTkLabel(self.dynamic_fields_frame, text="Start Time:", font=ctk.CTkFont(weight="bold")).grid(row=0, column=1, sticky="w", pady=(0, 5))
            self.dyn_val_2 = ctk.CTkEntry(self.dynamic_fields_frame, placeholder_text="12:30")
            self.dyn_val_2.grid(row=1, column=1, sticky="ew")

            ctk.CTkLabel(self.dynamic_fields_frame, text="Duration (Mins):", font=ctk.CTkFont(weight="bold")).grid(row=2, column=1, sticky="w", pady=(10, 5))
            self.dyn_val_duration = ctk.CTkEntry(self.dynamic_fields_frame, placeholder_text="30")
            self.dyn_val_duration.grid(row=3, column=1, sticky="ew")
            self.dyn_val_duration.insert(0, "30")

            self.lbl_meal_kcal_preview = ctk.CTkLabel(self.dynamic_fields_frame, text="", text_color=GOOD)
            self.lbl_meal_kcal_preview.grid(row=4, column=0, columnspan=2, sticky="w", pady=(8, 0))
            if meal_names:
                self.auto_update_meal_kcal(meal_names[0])

        elif selected_type == "💼 Work / Meeting":
            ctk.CTkLabel(self.dynamic_fields_frame, text="Start Time:", font=ctk.CTkFont(weight="bold")).grid(row=0, column=0, sticky="w", pady=(0, 5))
            self.dyn_val_1 = ctk.CTkEntry(self.dynamic_fields_frame, placeholder_text="09:00")
            self.dyn_val_1.grid(row=1, column=0, sticky="ew", padx=(0, 10))

            ctk.CTkLabel(self.dynamic_fields_frame, text="Duration (Mins):", font=ctk.CTkFont(weight="bold")).grid(row=0, column=1, sticky="w", pady=(0, 5))
            self.dyn_val_duration = ctk.CTkEntry(self.dynamic_fields_frame, placeholder_text="60")
            self.dyn_val_duration.grid(row=1, column=1, sticky="ew")

        elif selected_type == "🗓️ Social / Life":
            ctk.CTkLabel(self.dynamic_fields_frame, text="Start Time:", font=ctk.CTkFont(weight="bold")).grid(row=0, column=0, sticky="w", pady=(0, 5))
            self.dyn_val_1 = ctk.CTkEntry(self.dynamic_fields_frame, placeholder_text="19:00")
            self.dyn_val_1.grid(row=1, column=0, sticky="ew", padx=(0, 10))

            ctk.CTkLabel(self.dynamic_fields_frame, text="Max Duration (Mins):", font=ctk.CTkFont(weight="bold")).grid(row=0, column=1, sticky="w", pady=(0, 5))
            self.dyn_val_duration = ctk.CTkEntry(self.dynamic_fields_frame, placeholder_text="120")
            self.dyn_val_duration.grid(row=1, column=1, sticky="ew")

    def save_calendar_event(self, modal):
        title_text = self.entry_ev_title.get().strip()
        event_type = self.drop_ev_type.get()
        event_date_raw = self.entry_ev_date.get().strip()
        try:
            datetime.strptime(event_date_raw, "%Y-%m-%d")
        except ValueError:
            self.lbl_event_status.configure(text="Date must be in YYYY-MM-DD format.")
            return
        if not title_text:
            self.lbl_event_status.configure(text="Give the event a title.")
            return

        start_time = getattr(self, "dyn_val_2", None).get() if hasattr(self, "dyn_val_2") else None
        duration_raw = self.dyn_val_duration.get().strip() if hasattr(self, "dyn_val_duration") else ""
        duration = int(duration_raw) if duration_raw.isdigit() else None
        notes = self.text_ev_notes.get("0.0", "end").strip()

        ref_workout_id = None
        ref_recipe_id = None
        if event_type == "🏋️ Training Session" and hasattr(self, "dyn_val_1"):
            w = next((row for row in self.db.get_all_workouts() if row["name"] == self.dyn_val_1.get()), None)
            if w:
                ref_workout_id = w["id"]
        elif event_type == "🥗 Meal/Nutrition" and hasattr(self, "dyn_val_1"):
            r = next((row for row in self.db.get_all_recipes() if row["name"] == self.dyn_val_1.get()), None)
            if r:
                ref_recipe_id = r["id"]
                # A planned meal also counts as consumed nutrition for analytics purposes
                self.db.log_nutrition(r["total_kcal"], cost=r["cost"], log_date=event_date_raw)

        self.db.add_calendar_event(title_text, event_type, event_date_raw, start_time, duration,
                                    ref_workout_id, ref_recipe_id, notes)
        modal.destroy()
        self.render_active_calendar()

    # --- CALENDAR DRAWING CORE ---
    def switch_cal_view(self, view_name):
        self.current_cal_view = view_name
        self.show_calendar_view()

    def render_active_calendar(self):
        self.cal_canvas.delete("all")
        self.cal_canvas.update_idletasks()
        w = self.cal_canvas.winfo_width()
        h = self.cal_canvas.winfo_height()

        if w < 100: w = 800
        if h < 100: h = 500

        if getattr(self, "current_cal_view", "Week") == "Day":
            self.draw_day_grid(w, h)
        elif self.current_cal_view == "Week":
            self.draw_week_grid(w, h)
        elif self.current_cal_view == "Month":
            self.draw_month_grid(w, h)

    EVENT_COLORS = {
        "🏋️ Training Session": "#1F6AA5",
        "🚗 Commute": "#6D6D6D",
        "🥗 Meal/Nutrition": "#2E7D32",
        "💼 Work / Meeting": "#8E44AD",
        "🗓️ Social / Life": "#C0392B",
    }

    def _draw_event_block(self, x, y, width, height, event):
        color = self.EVENT_COLORS.get(event["event_type"], "#3A3A3A")
        self.cal_canvas.create_rectangle(x, y, x + width, y + max(height, 16), fill=color, outline="")
        label = event["title"]
        if event["start_time"]:
            label = f"{event['start_time']} {label}"
        self.cal_canvas.create_text(x + 4, y + 2, text=label, fill="white", font=("Arial", 9, "bold"), anchor="nw", width=max(width - 8, 10))

    def _event_time_to_y(self, start_y, row_height, start_time_str):
        if not start_time_str:
            return start_y
        try:
            hh, mm = start_time_str.split(":")
            return start_y + (int(hh) + int(mm) / 60.0) * row_height
        except (ValueError, AttributeError):
            return start_y

    def draw_day_grid(self, w, h):
        row_height = 40
        start_x = 60
        start_y = 40
        day_str = self.current_cal_anchor.isoformat()
        self.cal_canvas.create_text(w / 2, 20, text=f"Agenda — {self.current_cal_anchor.strftime('%A, %b %d')}", fill="white", font=("Arial", 14, "bold"))
        for hour in range(24):
            y_pos = start_y + (hour * row_height)
            self.cal_canvas.create_text(30, y_pos + (row_height / 2), text=f"{hour:02d}:00", fill="gray", font=("Arial", 10))
            self.cal_canvas.create_line(start_x, y_pos, w - 20, y_pos, fill="#3A3A3A")
        self.cal_canvas.create_line(start_x, start_y, start_x, start_y + (24 * row_height), fill="#3A3A3A")
        self.cal_canvas.create_line(w - 20, start_y, w - 20, start_y + (24 * row_height), fill="#3A3A3A")

        for ev in self.db.get_events_for_day(day_str):
            y = self._event_time_to_y(start_y, row_height, ev["start_time"])
            height = ((ev["duration_mins"] or 30) / 60.0) * row_height
            self._draw_event_block(start_x + 4, y, (w - 20 - start_x) - 8, height, ev)

        self.cal_canvas.config(scrollregion=(0, 0, w, start_y + (24 * row_height)))

    def draw_week_grid(self, w, h):
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        week_start = self.current_cal_anchor - timedelta(days=self.current_cal_anchor.weekday())
        start_x = 60
        start_y = 40
        col_width = (w - start_x - 20) / 7
        row_height = 40
        for i, day in enumerate(days):
            x = start_x + (i * col_width) + (col_width / 2)
            day_date = week_start + timedelta(days=i)
            self.cal_canvas.create_text(x, 20, text=f"{day} {day_date.day}", fill="white", font=("Arial", 12, "bold"))
        for hour in range(24):
            y_pos = start_y + (hour * row_height)
            self.cal_canvas.create_text(30, y_pos + (row_height / 2), text=f"{hour:02d}:00", fill="gray", font=("Arial", 10))
            self.cal_canvas.create_line(start_x, y_pos, start_x + (7 * col_width), y_pos, fill="#3A3A3A")
        for day_idx in range(8):
            x_pos = start_x + (day_idx * col_width)
            self.cal_canvas.create_line(x_pos, start_y, x_pos, start_y + (24 * row_height), fill="#3A3A3A")

        week_events = self.db.get_events_for_range(week_start.isoformat(), (week_start + timedelta(days=6)).isoformat())
        for ev in week_events:
            ev_date = datetime.strptime(ev["event_date"], "%Y-%m-%d").date()
            col = (ev_date - week_start).days
            if not (0 <= col < 7):
                continue
            x = start_x + (col * col_width) + 2
            y = self._event_time_to_y(start_y, row_height, ev["start_time"])
            height = ((ev["duration_mins"] or 30) / 60.0) * row_height
            self._draw_event_block(x, y, col_width - 4, height, ev)

        self.cal_canvas.config(scrollregion=(0, 0, w, start_y + (24 * row_height)))

    def draw_month_grid(self, w, h):
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        start_x = 20
        start_y = 40
        col_width = (w - 40) / 7
        row_height = (h - 60) / 5
        anchor = self.current_cal_anchor
        first_of_month = anchor.replace(day=1)
        self.cal_canvas.create_text(w / 2, 20, text=anchor.strftime("%B %Y"), fill="white", font=("Arial", 14, "bold"))
        for i, day in enumerate(days):
            x = start_x + (i * col_width) + (col_width / 2)
            self.cal_canvas.create_text(x, 20 + 20, text=day, fill="white", font=("Arial", 12, "bold"))
        start_y += 20
        for row in range(6):
            y_pos = start_y + (row * row_height)
            self.cal_canvas.create_line(start_x, y_pos, start_x + (7 * col_width), y_pos, fill="#3A3A3A")
        for col in range(8):
            x_pos = start_x + (col * col_width)
            self.cal_canvas.create_line(x_pos, start_y, x_pos, start_y + (5 * row_height), fill="#3A3A3A")

        # Pull the whole month's events once, then bucket by day for the dot indicators
        month_end = (first_of_month.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        month_events = self.db.get_events_for_range(first_of_month.isoformat(), month_end.isoformat())
        events_by_day = {}
        for ev in month_events:
            events_by_day.setdefault(ev["event_date"], []).append(ev)

        lead_blank = first_of_month.weekday()  # Monday = 0
        day_num = 1
        days_in_month = month_end.day
        for row in range(5):
            for col in range(7):
                cell_idx = row * 7 + col
                if cell_idx < lead_blank or day_num > days_in_month:
                    continue
                x_pos = start_x + (col * col_width) + 15
                y_pos = start_y + (row * row_height) + 15
                this_date = first_of_month.replace(day=day_num)
                is_today = this_date == date.today()
                self.cal_canvas.create_text(x_pos, y_pos, text=str(day_num),
                                             fill=ACCENT if is_today else "gray",
                                             font=("Arial", 10, "bold"))
                todays_events = events_by_day.get(this_date.isoformat(), [])
                for i, ev in enumerate(todays_events[:4]):
                    dot_x = x_pos - 8 + (i * 8)
                    color = self.EVENT_COLORS.get(ev["event_type"], "#3A3A3A")
                    self.cal_canvas.create_oval(dot_x, y_pos + 12, dot_x + 6, y_pos + 18, fill=color, outline="")
                day_num += 1

    # ==================================================================
    # ANALYTICS
    # ==================================================================
    def show_analytics_view(self):
        self.reset_main_frame()
        self.main_frame.grid_columnconfigure(0, weight=1)
        self.main_frame.grid_rowconfigure(1, weight=1)

        header_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        header_frame.grid(row=0, column=0, padx=30, pady=(20, 5), sticky="ew")
        ctk.CTkLabel(header_frame, text="Performance Analytics 📊", font=ctk.CTkFont(size=24, weight="bold")).pack(side="left")

        self.analytics_tabs = ctk.CTkTabview(self.main_frame)
        self.analytics_tabs.grid(row=1, column=0, padx=30, pady=(0, 20), sticky="nsew")
        tab_body = self.analytics_tabs.add("Bodyweight")
        tab_lift = self.analytics_tabs.add("Strength")
        tab_food = self.analytics_tabs.add("Nutrition")

        for t in (tab_body, tab_lift, tab_food):
            t.grid_columnconfigure(0, weight=1)
            t.grid_rowconfigure(1, weight=1)

        # ---------------- Bodyweight ----------------
        bw_controls = ctk.CTkFrame(tab_body, fg_color="transparent")
        bw_controls.grid(row=0, column=0, padx=10, pady=10, sticky="ew")
        self.entry_bw = ctk.CTkEntry(bw_controls, placeholder_text="Log today's weight (lbs)")
        self.entry_bw.pack(side="left", padx=(0, 10))
        ctk.CTkButton(bw_controls, text="📈 Log Weight", fg_color="#2E7D32", hover_color="#1B5E20",
                      command=self.log_bodyweight_entry).pack(side="left")
        self.bw_chart_frame = ctk.CTkFrame(tab_body, fg_color=BG)
        self.bw_chart_frame.grid(row=1, column=0, padx=10, pady=(0, 10), sticky="nsew")
        self.render_bodyweight_chart()

        # ---------------- Strength ----------------
        lift_controls = ctk.CTkFrame(tab_lift, fg_color="transparent")
        lift_controls.grid(row=0, column=0, padx=10, pady=10, sticky="ew")
        exercise_names = self.get_exercise_names(seed_if_empty=True)
        self.analytics_exercise_drop = ctk.CTkOptionMenu(lift_controls, values=exercise_names, command=self.render_lift_chart)
        self.analytics_exercise_drop.pack(side="left")
        self.lift_chart_frame = ctk.CTkFrame(tab_lift, fg_color=BG)
        self.lift_chart_frame.grid(row=1, column=0, padx=10, pady=(0, 10), sticky="nsew")
        if exercise_names:
            self.render_lift_chart(exercise_names[0])

        # ---------------- Nutrition ----------------
        self.food_chart_frame = ctk.CTkFrame(tab_food, fg_color=BG)
        self.food_chart_frame.grid(row=1, column=0, padx=10, pady=10, sticky="nsew")
        tab_food.grid_rowconfigure(1, weight=1)
        self.render_nutrition_chart()

    def _make_dark_figure(self):
        fig = Figure(figsize=(6, 3.2), dpi=100, facecolor=BG)
        ax = fig.add_subplot(111)
        ax.set_facecolor(BG)
        for spine in ax.spines.values():
            spine.set_color("#555555")
        ax.tick_params(colors="lightgray")
        ax.xaxis.label.set_color("lightgray")
        ax.yaxis.label.set_color("lightgray")
        ax.title.set_color("white")
        ax.grid(True, color="#3A3A3A", linewidth=0.5)
        return fig, ax

    def _embed_figure(self, fig, parent_frame):
        for w in parent_frame.winfo_children():
            w.destroy()
        canvas = FigureCanvasTkAgg(fig, master=parent_frame)
        canvas.draw()
        canvas.get_tk_widget().pack(fill="both", expand=True, padx=5, pady=5)

    def render_bodyweight_chart(self):
        history = self.db.get_bodyweight_history()
        fig, ax = self._make_dark_figure()
        if history:
            dates = [h["log_date"] for h in history]
            weights = [h["weight_lbs"] for h in history]
            ax.plot(dates, weights, color=GOOD, marker="o", linewidth=2)
            ax.set_title("Bodyweight Over Time")
            ax.set_ylabel("lbs")
            step = max(len(dates) // 8, 1)
            ax.set_xticks(dates[::step])
            ax.tick_params(axis="x", rotation=45)
        else:
            ax.text(0.5, 0.5, "No bodyweight logs yet", color="gray", ha="center", va="center", transform=ax.transAxes)
        fig.tight_layout()
        self._embed_figure(fig, self.bw_chart_frame)

    def log_bodyweight_entry(self):
        try:
            weight = float(self.entry_bw.get().strip())
        except ValueError:
            return
        self.db.log_bodyweight(weight)
        self.entry_bw.delete(0, "end")
        self.render_bodyweight_chart()

    def render_lift_chart(self, exercise_name):
        exercise = self.db.get_exercise_by_name(exercise_name)
        fig, ax = self._make_dark_figure()
        history = self.db.get_lift_history(exercise["id"]) if exercise else []
        if history:
            dates = [h["log_date"] for h in history]
            weights = [h["weight"] for h in history]
            ax.plot(dates, weights, color=ACCENT, marker="o", linewidth=2)
            ax.set_title(f"{exercise_name} — Weight Logged Over Time")
            ax.set_ylabel("lbs")
            step = max(len(dates) // 8, 1)
            ax.set_xticks(dates[::step])
            ax.tick_params(axis="x", rotation=45)
        else:
            ax.text(0.5, 0.5, "No lifts logged for this exercise yet", color="gray", ha="center", va="center", transform=ax.transAxes)
        fig.tight_layout()
        self._embed_figure(fig, self.lift_chart_frame)

    def render_nutrition_chart(self):
        history = self.db.get_nutrition_history()
        fig, ax = self._make_dark_figure()
        if history:
            dates = [h["log_date"] for h in history]
            kcal = [h["kcal"] for h in history]
            ax.bar(dates, kcal, color=ACCENT)
            ax.axhline(3800, color="orange", linestyle="--", linewidth=1, label="Target")
            ax.set_title("Daily Nutrition (kcal) — from planned meal events")
            ax.set_ylabel("kcal")
            ax.legend(facecolor=BG, labelcolor="lightgray")
            step = max(len(dates) // 8, 1)
            ax.set_xticks(dates[::step])
            ax.tick_params(axis="x", rotation=45)
        else:
            ax.text(0.5, 0.5, "No meals logged yet — add a Meal/Nutrition event\nfrom the Schedule tab", color="gray", ha="center", va="center", transform=ax.transAxes)
        fig.tight_layout()
        self._embed_figure(fig, self.food_chart_frame)


if __name__ == "__main__":
    matplotlib.use("TkAgg")
    app = FootballApp()
    app.mainloop()