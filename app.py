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
        """Re-creates the main container frame to prevent widget destruction conflicts on Python 3.14."""
        if self.main_frame is not None:
            self.main_frame.grid_forget()
            self.main_frame.destroy()
        
        self.main_frame = ctk.CTkFrame(self, corner_radius=15)
        # Fixed typography bug here: changed py=20 to pady=20
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

        # ----------------- HEADER & TITLE -----------------
        header_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        header_frame.grid(row=0, column=0, padx=30, pady=(20, 5), sticky="ew")
        
        title = ctk.CTkLabel(header_frame, text="Recipe Lab & Meal Planner 🍴", font=ctk.CTkFont(size=24, weight="bold"))
        title.pack(side="left")

        # ----------------- SUB-NAVIGATION TAB VIEW -----------------
        self.diet_tabs = ctk.CTkTabview(self.main_frame)
        self.diet_tabs.grid(row=1, column=0, padx=30, pady=(0, 20), sticky="nsew")
        
        # Create tabs
        tab_create = self.diet_tabs.add("Create Recipe")
        tab_view = self.diet_tabs.add("View Recipes")
        
        # Configure tab inner layouts
        tab_create.grid_columnconfigure(0, weight=4)
        tab_create.grid_columnconfigure(1, weight=3)
        tab_create.grid_rowconfigure(0, weight=1)
        
        tab_view.grid_columnconfigure(0, weight=1)
        tab_view.grid_rowconfigure(1, weight=1)

        # =================================================================
        # 1) TAB: CREATE RECIPE (DEFAULT SANDBOX LAYER)
        # =================================================================
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

        # Clean Real-time Aggregator Box (Only Energy and Cost)
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

        btn_push_ing = ctk.CTkButton(search_frame, text="➕ Add", width=60, fg_color="#2E7D32", hover_color="#1B5E20")
        btn_push_ing.grid(row=0, column=2, padx=(5, 0))

        self.btn_save_recipe = ctk.CTkButton(builder_panel, text="💾 Save/Commit Recipe to Database Collection", fg_color="#1F6AA5", font=ctk.CTkFont(weight="bold"))
        self.btn_save_recipe.grid(row=5, column=0, padx=15, pady=15, sticky="ew")

        # Simplified Register New Ingredient Form
        custom_panel = ctk.CTkFrame(tab_create)
        custom_panel.grid(row=0, column=1, padx=(10, 5), pady=10, sticky="nsew")
        custom_panel.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(custom_panel, text="Register New Ingredient", font=ctk.CTkFont(size=15, weight="bold")).grid(row=0, column=0, padx=15, pady=10, sticky="w")
        
        ctk.CTkLabel(custom_panel, text="Ingredient Name:", font=ctk.CTkFont(size=11)).grid(row=1, column=0, padx=15, pady=(5, 0), sticky="w")
        self.new_ing_name = ctk.CTkEntry(custom_panel, placeholder_text="e.g. Bison Flank Steak")
        self.new_ing_name.grid(row=2, column=0, padx=15, pady=(0, 10), sticky="ew")

        ctk.CTkLabel(custom_panel, text="Calories (per 100g):", font=ctk.CTkFont(size=11)).grid(row=3, column=0, padx=15, pady=(5, 0), sticky="w")
        self.new_ing_cal = ctk.CTkEntry(custom_panel, placeholder_text="0")
        self.new_ing_cal.grid(row=4, column=0, padx=15, pady=(0, 10), sticky="ew")

        ctk.CTkLabel(custom_panel, text="Approx. Cost (per 100g / package):", font=ctk.CTkFont(size=11)).grid(row=5, column=0, padx=15, pady=(5, 0), sticky="w")
        self.new_ing_cost = ctk.CTkEntry(custom_panel, placeholder_text="$0.00")
        self.new_ing_cost.grid(row=6, column=0, padx=15, pady=(0, 15), sticky="ew")

        self.btn_register_ing = ctk.CTkButton(custom_panel, text="🚀 Inject into Master DB", fg_color="#E65100", hover_color="#BF360C")
        self.btn_register_ing.grid(row=7, column=0, padx=15, pady=10, sticky="ew")

        # =================================================================
        # 2) TAB: VIEW RECIPES (DATABASE EXPLORER & SEARCH PORTAL)
        # =================================================================
        search_bar_frame = ctk.CTkFrame(tab_view, fg_color="transparent")
        search_bar_frame.grid(row=0, column=0, padx=15, pady=15, sticky="ew")
        search_bar_frame.grid_columnconfigure(0, weight=1)

        self.entry_recipe_keyword_search = ctk.CTkEntry(search_bar_frame, placeholder_text="🔎 Live Keyword Query Filter (e.g. Beef, Shake...)")
        self.entry_recipe_keyword_search.grid(row=0, column=0, padx=(0, 10), sticky="ew")
        
        btn_run_search = ctk.CTkButton(search_bar_frame, text="Search Engine Query", width=150, fg_color="#1F6AA5")
        btn_run_search.grid(row=0, column=1)

        db_scroll = ctk.CTkScrollableFrame(tab_view, label_text="Committed Master Recipe Database")
        db_scroll.grid(row=1, column=0, padx=15, pady=(0, 15), sticky="nsew")
        db_scroll.grid_columnconfigure(0, weight=1)

        mock_database_recipes = [
            ("Mass Gainer Shake v1", "1,150 kcal  •  Estimated Matrix Cost: $3.40"),
            ("Ground Beef & Rice Block", "850 kcal  •  Estimated Matrix Cost: $4.10"),
            ("Pre-Workout Cream of Rice", "410 kcal  •  Estimated Matrix Cost: $1.20"),
            ("Oven Baked Chicken & Sweet Potato", "680 kcal  •  Estimated Matrix Cost: $3.85"),
        ]

        for idx, (r_name, r_details) in enumerate(mock_database_recipes):
            db_card = ctk.CTkFrame(db_scroll, fg_color="#2B2B2B")
            db_card.grid(row=idx, column=0, padx=10, pady=6, sticky="ew")
            db_card.grid_columnconfigure(0, weight=1)

            ctk.CTkLabel(db_card, text=r_name, font=ctk.CTkFont(size=14, weight="bold")).grid(row=0, column=0, padx=15, pady=(8, 2), sticky="w")
            ctk.CTkLabel(db_card, text=r_details, font=ctk.CTkFont(size=12), text_color="lightgray").grid(row=1, column=0, padx=15, pady=(0, 8), sticky="w")
            
            btn_db_edit = ctk.CTkButton(db_card, text="📝 Edit Recipe Parameters", width=160, height=28, fg_color="#3A3A3A", hover_color="#4A4A4A")
            btn_db_edit.grid(row=0, column=1, rowspan=2, padx=15, pady=8, sticky="e")

    def show_training_view(self):
        self.reset_main_frame()
        self.main_frame.grid_columnconfigure(0, weight=1)
        title = ctk.CTkLabel(self.main_frame, text="Training 🏈", font=ctk.CTkFont(size=24, weight="bold"))
        title.grid(row=0, column=0, padx=30, pady=30, sticky="w")
        lbl = ctk.CTkLabel(self.main_frame, text="[Training UI Layout Component Layer - Pending Deep Dive]", text_color="gray")
        lbl.grid(row=1, column=0, padx=30, pady=20)

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