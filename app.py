import customtkinter as ctk

# Set the theme and color options
ctk.set_appearance_mode("Dark")  # Modes: "System", "Dark", "Light"
ctk.set_default_color_theme("blue")  # Themes: "blue", "green", "dark-blue"

class FootballApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        # Configure window (Must not contain spaces in dimensions)
        self.title("Athletic Performance & Life Dashboard")
        self.geometry("1100x650")

        # Configure grid layout (1 row, 2 columns: Sidebar and Main Content)
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        # ----------------- SIDEBAR NAVIGATION -----------------
        self.sidebar_frame = ctk.CTkFrame(self, width=220, corner_radius=0)
        self.sidebar_frame.grid(row=0, column=0, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(5, weight=1) # Push lower elements down

        # App Title / Logo
        self.logo_label = ctk.CTkLabel(self.sidebar_frame, text="PERFORMANCE HQ", font=ctk.CTkFont(size=20, weight="bold"))
        self.logo_label.grid(row=0, column=0, padx=20, pady=(20, 30))

        # Navigation Buttons
        self.btn_home = ctk.CTkButton(self.sidebar_frame, text="Dashboard Home", anchor="w", command=self.show_home_view)
        self.btn_home.grid(row=1, column=0, padx=20, pady=10, sticky="ew")

        self.btn_training = ctk.CTkButton(self.sidebar_frame, text="🏋️ Training & Exercises", anchor="w", command=self.show_training_view)
        self.btn_training.grid(row=2, column=0, padx=20, pady=10, sticky="ew")

        self.btn_diet = ctk.CTkButton(self.sidebar_frame, text="🥗 Diet & Nutrition", anchor="w", command=self.show_diet_view)
        self.btn_diet.grid(row=3, column=0, padx=20, pady=10, sticky="ew")

        self.btn_calendar = ctk.CTkButton(self.sidebar_frame, text="📅 Schedule & Life", anchor="w", command=self.show_calendar_view)
        self.btn_calendar.grid(row=4, column=0, padx=20, pady=10, sticky="ew")

        # Initialize reference to main_frame
        self.main_frame = None
        self.show_home_view()

    # ----------------- VIEW SWITCHING LOGIC -----------------
    def reset_main_frame(self):
        """Re-creates the main container frame to prevent widget destruction conflicts."""
        if self.main_frame is not None:
            self.main_frame.grid_forget()
            self.main_frame.destroy()
        
        self.main_frame = ctk.CTkFrame(self, corner_radius=15)
        self.main_frame.grid(row=0, column=1, padx=20, pady=20, sticky="nsew")

    def show_home_view(self):
        self.reset_main_frame()
        self.main_frame.grid_columnconfigure(0, weight=1)
        self.main_frame.grid_rowconfigure(2, weight=1)
        
        # Title
        title = ctk.CTkLabel(self.main_frame, text="Chucky in da house. What up.", font=ctk.CTkFont(size=26, weight="bold"))
        title.grid(row=0, column=0, padx=30, pady=(30, 10), sticky="w")
        
        subtitle = ctk.CTkLabel(self.main_frame, text="Track your metrics, plan your blocks, and execute.", font=ctk.CTkFont(size=14), text_color="gray")
        subtitle.grid(row=1, column=0, padx=30, pady=(0, 30), sticky="w")

        # Quick Overview Cards Layout
        cards_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        cards_frame.grid(row=2, column=0, padx=30, pady=10, sticky="nsew")
        cards_frame.grid_columnconfigure((0, 1, 2), weight=1)

        # Card 1: Training Next Up
        card_t = ctk.CTkFrame(cards_frame, height=150)
        card_t.grid(row=0, column=0, padx=10, pady=10, sticky="nsew")
        ctk.CTkLabel(card_t, text="Next Session", font=ctk.CTkFont(weight="bold")).pack(pady=10)
        card_t_lbl = ctk.CTkLabel(card_t, text="Lower Body Power\nBlock 1 • 2:00 PM", text_color="gray")
        card_t_lbl.pack(pady=5)

        # Card 2: Nutrition Summary
        card_d = ctk.CTkFrame(cards_frame, height=150)
        card_d.grid(row=0, column=1, padx=10, pady=10, sticky="nsew")
        ctk.CTkLabel(card_d, text="Nutrition Target", font=ctk.CTkFont(weight="bold")).pack(pady=10)
        card_d_lbl = ctk.CTkLabel(card_d, text="Energy: 1,200 / 3,800 kcal\nBudget Tracking Active", text_color="gray")
        card_d_lbl.pack(pady=5)

        # Card 3: Daily Schedule
        card_c = ctk.CTkFrame(cards_frame, height=150)
        card_c.grid(row=0, column=2, padx=10, pady=10, sticky="nsew")
        ctk.CTkLabel(card_c, text="Today's Focus", font=ctk.CTkFont(weight="bold")).pack(pady=10)
        card_c_lbl = ctk.CTkLabel(card_c, text="3 Meetings • 1 Training\nFlex Schedule Active", text_color="gray")
        card_c_lbl.pack(pady=5)

    def show_diet_view(self):
        self.reset_main_frame()
        self.main_frame.grid_columnconfigure(0, weight=1)
        self.main_frame.grid_rowconfigure(1, weight=1)

        header_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        header_frame.grid(row=0, column=0, padx=30, pady=(20, 5), sticky="ew")
        
        title = ctk.CTkLabel(header_frame, text="Recipe Lab & Meal Planner 🍴", font=ctk.CTkFont(size=24, weight="bold"))
        title.pack(side="left")

        self.diet_tabs = ctk.CTkTabview(self.main_frame)
        self.diet_tabs.grid(row=1, column=0, padx=30, pady=(0, 20), sticky="nsew")
        
        tab_create = self.diet_tabs.add("Create Recipe")
        tab_view = self.diet_tabs.add("View Recipes")
        
        tab_create.grid_columnconfigure(0, weight=4)
        tab_create.grid_columnconfigure(1, weight=3)
        tab_create.grid_rowconfigure(0, weight=1)
        
        tab_view.grid_columnconfigure(0, weight=1)
        tab_view.grid_rowconfigure(1, weight=1)

        # Diet - Tab 1
        builder_panel = ctk.CTkFrame(tab_create, border_width=1, border_color="#1F6AA5")
        builder_panel.grid(row=0, column=0, padx=(5, 10), pady=10, sticky="nsew")
        builder_panel.grid_rowconfigure(3, weight=1)
        builder_panel.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(builder_panel, text="Recipe Blueprint Sandbox", font=ctk.CTkFont(size=15, weight="bold"), text_color="#1F6AA5").grid(row=0, column=0, padx=15, pady=10, sticky="w")

        name_frame = ctk.CTkFrame(builder_panel, fg_color="transparent")
        name_frame.grid(row=1, column=0, padx=15, pady=5, sticky="ew")
        name_frame.grid_columnconfigure(0, weight=1)
        
        self.entry_recipe_name = ctk.CTkEntry(name_frame, placeholder_text="Enter Recipe Name (e.g., Post-Workout Steak Bowl)")
        self.entry_recipe_name.grid(row=0, column=0, sticky="ew")

        aggregator_box = ctk.CTkFrame(builder_panel, fg_color="#1A242F", height=50)
        aggregator_box.grid(row=2, column=0, padx=15, pady=10, sticky="ew")
        aggregator_box.grid_columnconfigure((0, 1), weight=1)
        
        self.lbl_running_calories = ctk.CTkLabel(aggregator_box, text="Total Energy: 0 kcal", font=ctk.CTkFont(size=13, weight="bold"))
        self.lbl_running_calories.grid(row=0, column=0, pady=10)
        self.lbl_running_cost = ctk.CTkLabel(aggregator_box, text="Estimated Cost: $0.00", font=ctk.CTkFont(size=13, weight="bold"), text_color="#7CCD7C")
        self.lbl_running_cost.grid(row=0, column=1, pady=10)

        sandbox_scroll = ctk.CTkScrollableFrame(builder_panel, label_text="Current Ingredients in Formula")
        sandbox_scroll.grid(row=3, column=0, padx=15, pady=5, sticky="nsew")
        sandbox_scroll.grid_columnconfigure(0, weight=1)
        
        mock_ing_row = ctk.CTkFrame(sandbox_scroll, fg_color="#242424")
        mock_ing_row.grid(row=0, column=0, padx=5, pady=3, sticky="ew")
        ctk.CTkLabel(mock_ing_row, text="Extra Lean Ground Beef (250g)", font=ctk.CTkFont(size=12)).pack(side="left", padx=10, pady=5)
        ctk.CTkLabel(mock_ing_row, text="530 kcal • $3.25", font=ctk.CTkFont(size=12), text_color="gray").pack(side="right", padx=10, pady=5)

        search_frame = ctk.CTkFrame(builder_panel, fg_color="transparent")
        search_frame.grid(row=4, column=0, padx=15, pady=10, sticky="ew")
        search_frame.grid_columnconfigure(0, weight=1)
        
        self.entry_search_ing = ctk.CTkEntry(search_frame, placeholder_text="🔎 Search Master Database for Ingredient...")
        self.entry_search_ing.grid(row=0, column=0, padx=(0, 5), sticky="ew")
        self.entry_ing_qty = ctk.CTkEntry(search_frame, width=70, placeholder_text="Qty (g)")
        self.entry_ing_qty.grid(row=0, column=1, padx=5)
        ctk.CTkButton(search_frame, text="➕ Add", width=60, fg_color="#2E7D32", hover_color="#1B5E20").grid(row=0, column=2, padx=(5, 0))

        ctk.CTkButton(builder_panel, text="💾 Save/Commit Recipe", fg_color="#1F6AA5", font=ctk.CTkFont(weight="bold")).grid(row=5, column=0, padx=15, pady=15, sticky="ew")

        custom_panel = ctk.CTkFrame(tab_create)
        custom_panel.grid(row=0, column=1, padx=(10, 5), pady=10, sticky="nsew")
        custom_panel.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(custom_panel, text="Register New Ingredient", font=ctk.CTkFont(size=15, weight="bold")).grid(row=0, column=0, padx=15, pady=10, sticky="w")
        ctk.CTkLabel(custom_panel, text="Ingredient Name:", font=ctk.CTkFont(size=11)).grid(row=1, column=0, padx=15, pady=(5, 0), sticky="w")
        ctk.CTkEntry(custom_panel, placeholder_text="e.g. Bison Flank").grid(row=2, column=0, padx=15, pady=(0, 10), sticky="ew")
        ctk.CTkLabel(custom_panel, text="Calories:", font=ctk.CTkFont(size=11)).grid(row=3, column=0, padx=15, pady=(5, 0), sticky="w")
        ctk.CTkEntry(custom_panel, placeholder_text="0").grid(row=4, column=0, padx=15, pady=(0, 10), sticky="ew")
        ctk.CTkLabel(custom_panel, text="Cost:", font=ctk.CTkFont(size=11)).grid(row=5, column=0, padx=15, pady=(5, 0), sticky="w")
        ctk.CTkEntry(custom_panel, placeholder_text="$0.00").grid(row=6, column=0, padx=15, pady=(0, 15), sticky="ew")
        ctk.CTkButton(custom_panel, text="🚀 Inject into Master DB", fg_color="#E65100", hover_color="#BF360C").grid(row=7, column=0, padx=15, pady=10, sticky="ew")

        # Diet - Tab 2
        search_bar_frame = ctk.CTkFrame(tab_view, fg_color="transparent")
        search_bar_frame.grid(row=0, column=0, padx=15, pady=15, sticky="ew")
        search_bar_frame.grid_columnconfigure(0, weight=1)
        ctk.CTkEntry(search_bar_frame, placeholder_text="🔎 Search Recipes...").grid(row=0, column=0, padx=(0, 10), sticky="ew")
        ctk.CTkButton(search_bar_frame, text="Search", width=150, fg_color="#1F6AA5").grid(row=0, column=1)

        db_scroll = ctk.CTkScrollableFrame(tab_view, label_text="Committed Master Recipe Database")
        db_scroll.grid(row=1, column=0, padx=15, pady=(0, 15), sticky="nsew")
        db_scroll.grid_columnconfigure(0, weight=1)

        mock_database_recipes = [
            ("Mass Gainer Shake v1", "1,150 kcal  •  Cost: $3.40"),
            ("Ground Beef & Rice Block", "850 kcal  •  Cost: $4.10"),
        ]
        for idx, (r_name, r_details) in enumerate(mock_database_recipes):
            db_card = ctk.CTkFrame(db_scroll, fg_color="#2B2B2B")
            db_card.grid(row=idx, column=0, padx=10, pady=6, sticky="ew")
            db_card.grid_columnconfigure(0, weight=1)
            ctk.CTkLabel(db_card, text=r_name, font=ctk.CTkFont(size=14, weight="bold")).grid(row=0, column=0, padx=15, pady=(8, 2), sticky="w")
            ctk.CTkLabel(db_card, text=r_details, font=ctk.CTkFont(size=12), text_color="lightgray").grid(row=1, column=0, padx=15, pady=(0, 8), sticky="w")
            ctk.CTkButton(db_card, text="📝 Edit", width=100, height=28, fg_color="#3A3A3A").grid(row=0, column=1, rowspan=2, padx=15, pady=8, sticky="e")

    def show_training_view(self):
        self.reset_main_frame()
        self.main_frame.grid_columnconfigure(0, weight=1)
        self.main_frame.grid_rowconfigure(1, weight=1)

        # ----------------- HEADER & TITLE -----------------
        header_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        header_frame.grid(row=0, column=0, padx=30, pady=(20, 5), sticky="ew")
        title = ctk.CTkLabel(header_frame, text="Training Blueprint Builder 🏈", font=ctk.CTkFont(size=24, weight="bold"))
        title.pack(side="left")

        # ----------------- SUB-NAVIGATION TAB VIEW -----------------
        self.train_tabs = ctk.CTkTabview(self.main_frame)
        self.train_tabs.grid(row=1, column=0, padx=30, pady=(0, 20), sticky="nsew")
        
        tab_create = self.train_tabs.add("Build Workout")
        tab_view = self.train_tabs.add("Saved Workouts")
        
        tab_create.grid_columnconfigure(0, weight=4)
        tab_create.grid_columnconfigure(1, weight=3)
        tab_create.grid_rowconfigure(0, weight=1)
        
        tab_view.grid_columnconfigure(0, weight=1)
        tab_view.grid_rowconfigure(1, weight=1)

        # =================================================================
        # TAB 1: BUILD WORKOUT (LEFT - SANDBOX)
        # =================================================================
        builder_panel = ctk.CTkFrame(tab_create, border_width=1, border_color="#1F6AA5")
        builder_panel.grid(row=0, column=0, padx=(5, 10), pady=10, sticky="nsew")
        builder_panel.grid_rowconfigure(2, weight=1)
        builder_panel.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(builder_panel, text="Workout Blueprint Sandbox", font=ctk.CTkFont(size=15, weight="bold"), text_color="#1F6AA5").grid(row=0, column=0, padx=15, pady=10, sticky="w")

        # Workout Name Entry
        name_frame = ctk.CTkFrame(builder_panel, fg_color="transparent")
        name_frame.grid(row=1, column=0, padx=15, pady=5, sticky="ew")
        name_frame.grid_columnconfigure(0, weight=1)
        self.entry_workout_name = ctk.CTkEntry(name_frame, placeholder_text="Enter Workout Name (e.g., Lower Body Power - Phase 1)")
        self.entry_workout_name.grid(row=0, column=0, sticky="ew")

        # Routine Architecture List
        sandbox_scroll = ctk.CTkScrollableFrame(builder_panel, label_text="Routine Architecture")
        sandbox_scroll.grid(row=2, column=0, padx=15, pady=10, sticky="nsew")
        sandbox_scroll.grid_columnconfigure(0, weight=1)

        mock_exercises = [
            ("Barbell Back Squat", "4 Sets x 5 Reps @ Target: 85% 1RM"),
            ("Romanian Deadlift", "3 Sets x 8 Reps @ Target: 275 lbs")
        ]
        for idx, (ex, det) in enumerate(mock_exercises):
            ex_row = ctk.CTkFrame(sandbox_scroll, fg_color="#242424")
            ex_row.grid(row=idx, column=0, padx=5, pady=3, sticky="ew")
            ctk.CTkLabel(ex_row, text=ex, font=ctk.CTkFont(size=12, weight="bold")).pack(side="left", padx=10, pady=5)
            ctk.CTkLabel(ex_row, text=det, font=ctk.CTkFont(size=12), text_color="gray").pack(side="right", padx=10, pady=5)

        # Add Exercise Controls
        add_frame = ctk.CTkFrame(builder_panel, fg_color="transparent")
        add_frame.grid(row=3, column=0, padx=15, pady=10, sticky="ew")
        add_frame.grid_columnconfigure(0, weight=2)
        add_frame.grid_columnconfigure((1,2,3), weight=1)

        self.add_ex_drop = ctk.CTkOptionMenu(add_frame, values=["Barbell Back Squat", "Deadlift", "Bench Press", "Power Clean", "Nordic Curl"])
        self.add_ex_drop.grid(row=0, column=0, padx=(0,5), sticky="ew")

        self.add_ex_sets = ctk.CTkEntry(add_frame, placeholder_text="Sets")
        self.add_ex_sets.grid(row=0, column=1, padx=5, sticky="ew")

        self.add_ex_reps = ctk.CTkEntry(add_frame, placeholder_text="Reps")
        self.add_ex_reps.grid(row=0, column=2, padx=5, sticky="ew")

        self.add_ex_weight = ctk.CTkEntry(add_frame, placeholder_text="Target Lbs/%")
        self.add_ex_weight.grid(row=0, column=3, padx=5, sticky="ew")

        btn_add_ex = ctk.CTkButton(add_frame, text="➕ Add", width=60, fg_color="#2E7D32", hover_color="#1B5E20")
        btn_add_ex.grid(row=0, column=4, padx=(5,0))

        # Save Button
        btn_save_workout = ctk.CTkButton(builder_panel, text="💾 Save Workout Blueprint", fg_color="#1F6AA5", font=ctk.CTkFont(weight="bold"))
        btn_save_workout.grid(row=4, column=0, padx=15, pady=15, sticky="ew")

        # =================================================================
        # TAB 1: BUILD WORKOUT (RIGHT - 1RM REFERENCE VAULT)
        # =================================================================
        vault_panel = ctk.CTkFrame(tab_create)
        vault_panel.grid(row=0, column=1, padx=(10, 5), pady=10, sticky="nsew")
        vault_panel.grid_columnconfigure(0, weight=1)
        vault_panel.grid_rowconfigure(2, weight=1)

        ctk.CTkLabel(vault_panel, text="1RM Reference Vault", font=ctk.CTkFont(size=15, weight="bold")).grid(row=0, column=0, padx=15, pady=(15,5), sticky="w")

        onerm_box = ctk.CTkFrame(vault_panel, fg_color="#1A242F")
        onerm_box.grid(row=1, column=0, padx=15, pady=5, sticky="ew")
        onerm_box.grid_columnconfigure(0, weight=1)

        self.vault_drop = ctk.CTkOptionMenu(onerm_box, values=["Barbell Back Squat", "Deadlift", "Bench Press", "Power Clean"])
        self.vault_drop.grid(row=0, column=0, padx=10, pady=10, sticky="ew")

        ctk.CTkLabel(onerm_box, text="Current 1RM:", font=ctk.CTkFont(size=11)).grid(row=1, column=0, pady=(0, 2))
        ctk.CTkLabel(onerm_box, text="455 lbs", font=ctk.CTkFont(size=18, weight="bold"), text_color="#7CCD7C").grid(row=2, column=0, pady=(0, 10))

        history_scroll = ctk.CTkScrollableFrame(vault_panel, label_text="Historical Log (Squat)")
        history_scroll.grid(row=2, column=0, padx=15, pady=15, sticky="nsew")
        history_scroll.grid_columnconfigure(0, weight=1)

        mock_hist = [("June 25", "4x5 @ 355 lbs"), ("June 18", "5x5 @ 345 lbs"), ("June 04", "1x1 @ 455 lbs (PR)")]
        for idx, (dt, det) in enumerate(mock_hist):
            h_card = ctk.CTkFrame(history_scroll, fg_color="#2B2B2B")
            h_card.grid(row=idx, column=0, padx=5, pady=4, sticky="ew")
            ctk.CTkLabel(h_card, text=dt, font=ctk.CTkFont(size=12, weight="bold"), text_color="#1F6AA5").pack(anchor="w", padx=10, pady=(4,1))
            ctk.CTkLabel(h_card, text=det, font=ctk.CTkFont(size=11)).pack(anchor="w", padx=10, pady=(1,4))

        # =================================================================
        # TAB 2: SAVED WORKOUTS (DATABASE)
        # =================================================================
        search_bar_frame = ctk.CTkFrame(tab_view, fg_color="transparent")
        search_bar_frame.grid(row=0, column=0, padx=15, pady=15, sticky="ew")
        search_bar_frame.grid_columnconfigure(0, weight=1)

        self.entry_workout_search = ctk.CTkEntry(search_bar_frame, placeholder_text="🔎 Search Saved Workouts...")
        self.entry_workout_search.grid(row=0, column=0, padx=(0, 10), sticky="ew")
        ctk.CTkButton(search_bar_frame, text="Search", width=100, fg_color="#1F6AA5").grid(row=0, column=1)

        db_scroll = ctk.CTkScrollableFrame(tab_view, label_text="Workout Database Library")
        db_scroll.grid(row=1, column=0, padx=15, pady=(0, 15), sticky="nsew")
        db_scroll.grid_columnconfigure(0, weight=1)

        mock_workouts = [
            ("Lower Body Power - Phase 1", "4 Exercises • Est. Duration: 75 mins"),
            ("Upper Body Hypertrophy", "6 Exercises • Est. Duration: 60 mins"),
            ("Speed & Agility Field Work", "Track Work • Est. Duration: 45 mins"),
        ]

        for idx, (w_name, w_det) in enumerate(mock_workouts):
            w_card = ctk.CTkFrame(db_scroll, fg_color="#2B2B2B")
            w_card.grid(row=idx, column=0, padx=10, pady=6, sticky="ew")
            w_card.grid_columnconfigure(0, weight=1)
            ctk.CTkLabel(w_card, text=w_name, font=ctk.CTkFont(size=14, weight="bold")).grid(row=0, column=0, padx=15, pady=(8, 2), sticky="w")
            ctk.CTkLabel(w_card, text=w_det, font=ctk.CTkFont(size=12), text_color="gray").grid(row=1, column=0, padx=15, pady=(0, 8), sticky="w")
            btn_w_edit = ctk.CTkButton(w_card, text="📝 Edit Setup", width=100, height=28, fg_color="#3A3A3A")
            btn_w_edit.grid(row=0, column=1, rowspan=2, padx=15, pady=8, sticky="e")

    def show_calendar_view(self):
        self.reset_main_frame()
        self.main_frame.grid_columnconfigure(0, weight=1)
        title = ctk.CTkLabel(self.main_frame, text="Schedule 📅", font=ctk.CTkFont(size=24, weight="bold"))
        title.grid(row=0, column=0, padx=30, pady=30, sticky="w")
        lbl = ctk.CTkLabel(self.main_frame, text="[Calendar UI Layout Component Layer - Pending Deep Dive]", text_color="gray")
        lbl.grid(row=1, column=0, padx=30, pady=20)


if __name__ == "__main__":
    app = FootballApp()
    app.mainloop()