import customtkinter as ctk
import datetime
import calendar

# Set the theme and color options
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

class FootballApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        # Configure window
        self.title("Athletic Performance & Life Dashboard")
        self.geometry("1200x750")

        # App State for Calendar Tracking
        self.today = datetime.date.today()
        self.current_cal_view = "Week"
        
        # Legend Map
        self.event_meta = {
            "Workout": {"color": "#2563EB", "title": "Schedule Workout Block"},
            "Meal": {"color": "#059669", "title": "Schedule Performance Fuel"},
            "Work": {"color": "#D97706", "title": "Schedule Work Block"},
            "Commute": {"color": "#4B5563", "title": "Schedule Transit"},
            "Social": {"color": "#7C3AED", "title": "Schedule Social / Recovery"}
        }

        # Mock Database
        self.schedule_db = {}
        t_str = self.today.strftime("%Y-%m-%d")
        self.schedule_db[t_str] = [
            {"time": "08:00 AM", "type": "Workout", "title": "Euro Combine Prep: Power Block", "color": "#2563EB"},
            {"time": "12:00 PM", "type": "Meal", "title": "Mass Gainer Shake v1", "color": "#059669"},
            {"time": "02:00 PM", "type": "Work", "title": "Film Study / Networking", "color": "#D97706"},
            {"time": "06:00 PM", "type": "Commute", "title": "Transit to Facility", "color": "#4B5563"},
            {"time": "07:30 PM", "type": "Social", "title": "Recovery / Dinner", "color": "#7C3AED"}
        ]

        # Configure grid layout
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        # ----------------- SIDEBAR NAVIGATION -----------------
        self.sidebar_frame = ctk.CTkFrame(self, width=220, corner_radius=0)
        self.sidebar_frame.grid(row=0, column=0, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(5, weight=1)

        self.logo_label = ctk.CTkLabel(self.sidebar_frame, text="PERFORMANCE HQ", font=ctk.CTkFont(size=20, weight="bold"))
        self.logo_label.grid(row=0, column=0, padx=20, pady=(20, 30))

        self.btn_home = ctk.CTkButton(self.sidebar_frame, text="Dashboard Home", anchor="w", command=self.show_home_view)
        self.btn_home.grid(row=1, column=0, padx=20, pady=10, sticky="ew")

        self.btn_training = ctk.CTkButton(self.sidebar_frame, text="🏋️ Training & Exercises", anchor="w", command=self.show_training_view)
        self.btn_training.grid(row=2, column=0, padx=20, pady=10, sticky="ew")

        self.btn_diet = ctk.CTkButton(self.sidebar_frame, text="🥗 Diet & Nutrition", anchor="w", command=self.show_diet_view)
        self.btn_diet.grid(row=3, column=0, padx=20, pady=10, sticky="ew")

        self.btn_calendar = ctk.CTkButton(self.sidebar_frame, text="📅 Schedule & Life", anchor="w", command=self.show_calendar_view)
        self.btn_calendar.grid(row=4, column=0, padx=20, pady=10, sticky="ew")

        self.main_frame = None
        self.show_home_view()

    # ----------------- VIEW SWITCHING LOGIC -----------------
    def close_modal(self):
        """Helper to instantly destroy the popup modal if it exists to keep navigation clean."""
        if hasattr(self, 'modal') and self.modal.winfo_exists():
            self.modal.destroy()

    def reset_main_frame(self):
        self.close_modal()
        if self.main_frame is not None:
            self.main_frame.grid_forget()
            self.main_frame.destroy()
        self.main_frame = ctk.CTkFrame(self, corner_radius=15)
        self.main_frame.grid(row=0, column=1, padx=20, pady=20, sticky="nsew")

    def show_home_view(self):
        self.reset_main_frame()
        self.main_frame.grid_columnconfigure(0, weight=1)
        self.main_frame.grid_rowconfigure(2, weight=1)
        
        title = ctk.CTkLabel(self.main_frame, text="Chucky in da house. What up.", font=ctk.CTkFont(size=26, weight="bold"))
        title.grid(row=0, column=0, padx=30, pady=(30, 10), sticky="w")
        
        subtitle = ctk.CTkLabel(self.main_frame, text="Track your metrics, plan your blocks, and execute.", font=ctk.CTkFont(size=14), text_color="gray")
        subtitle.grid(row=1, column=0, padx=30, pady=(0, 30), sticky="w")

        cards_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        cards_frame.grid(row=2, column=0, padx=30, pady=10, sticky="nsew")
        cards_frame.grid_columnconfigure((0, 1, 2), weight=1)

        card_t = ctk.CTkFrame(cards_frame, height=150)
        card_t.grid(row=0, column=0, padx=10, pady=10, sticky="nsew")
        ctk.CTkLabel(card_t, text="Next Session", font=ctk.CTkFont(weight="bold")).pack(pady=10)
        ctk.CTkLabel(card_t, text="Lower Body Power\nBlock 1 • 2:00 PM", text_color="gray").pack(pady=5)

        card_d = ctk.CTkFrame(cards_frame, height=150)
        card_d.grid(row=0, column=1, padx=10, pady=10, sticky="nsew")
        ctk.CTkLabel(card_d, text="Nutrition Target", font=ctk.CTkFont(weight="bold")).pack(pady=10)
        ctk.CTkLabel(card_d, text="Energy: 1,200 / 3,800 kcal\nBudget Tracking Active", text_color="gray").pack(pady=5)

        card_c = ctk.CTkFrame(cards_frame, height=150)
        card_c.grid(row=0, column=2, padx=10, pady=10, sticky="nsew")
        ctk.CTkLabel(card_c, text="Today's Focus", font=ctk.CTkFont(weight="bold")).pack(pady=10)
        ctk.CTkLabel(card_c, text="3 Meetings • 1 Training\nFlex Schedule Active", text_color="gray").pack(pady=5)

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

        builder_panel = ctk.CTkFrame(tab_create, border_width=1, border_color="#1F6AA5")
        builder_panel.grid(row=0, column=0, padx=(5, 10), pady=10, sticky="nsew")
        builder_panel.grid_rowconfigure(3, weight=1)
        builder_panel.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(builder_panel, text="Recipe Blueprint Sandbox", font=ctk.CTkFont(size=15, weight="bold"), text_color="#1F6AA5").grid(row=0, column=0, padx=15, pady=10, sticky="w")

        name_frame = ctk.CTkFrame(builder_panel, fg_color="transparent")
        name_frame.grid(row=1, column=0, padx=15, pady=5, sticky="ew")
        name_frame.grid_columnconfigure(0, weight=1)
        ctk.CTkEntry(name_frame, placeholder_text="Recipe Name").grid(row=0, column=0, padx=(0, 5), sticky="ew")
        ctk.CTkEntry(name_frame, width=120, placeholder_text="Duration (mins)").grid(row=0, column=1, sticky="e")

        aggregator_box = ctk.CTkFrame(builder_panel, fg_color="#1A242F", height=50)
        aggregator_box.grid(row=2, column=0, padx=15, pady=10, sticky="ew")
        aggregator_box.grid_columnconfigure((0, 1), weight=1)
        ctk.CTkLabel(aggregator_box, text="Total Energy: 0 kcal", font=ctk.CTkFont(size=13, weight="bold")).grid(row=0, column=0, pady=10)
        ctk.CTkLabel(aggregator_box, text="Estimated Cost: $0.00", font=ctk.CTkFont(size=13, weight="bold"), text_color="#7CCD7C").grid(row=0, column=1, pady=10)

        sandbox_scroll = ctk.CTkScrollableFrame(builder_panel, label_text="Current Ingredients")
        sandbox_scroll.grid(row=3, column=0, padx=15, pady=5, sticky="nsew")
        sandbox_scroll.grid_columnconfigure(0, weight=1)
        
        mock_ing_row = ctk.CTkFrame(sandbox_scroll, fg_color="#242424")
        mock_ing_row.grid(row=0, column=0, padx=5, pady=3, sticky="ew")
        ctk.CTkLabel(mock_ing_row, text="Extra Lean Ground Beef (250g)", font=ctk.CTkFont(size=12)).pack(side="left", padx=10, pady=5)
        ctk.CTkLabel(mock_ing_row, text="530 kcal • $3.25", font=ctk.CTkFont(size=12), text_color="gray").pack(side="right", padx=10, pady=5)

        search_frame = ctk.CTkFrame(builder_panel, fg_color="transparent")
        search_frame.grid(row=4, column=0, padx=15, pady=10, sticky="ew")
        search_frame.grid_columnconfigure(0, weight=1)
        ctk.CTkEntry(search_frame, placeholder_text="🔎 Search Master Database...").grid(row=0, column=0, padx=(0, 5), sticky="ew")
        ctk.CTkEntry(search_frame, width=70, placeholder_text="Qty (g)").grid(row=0, column=1, padx=5)
        ctk.CTkButton(search_frame, text="➕ Add", width=60, fg_color="#2E7D32").grid(row=0, column=2, padx=(5, 0))
        ctk.CTkButton(builder_panel, text="💾 Save/Commit Recipe", fg_color="#1F6AA5", font=ctk.CTkFont(weight="bold")).grid(row=5, column=0, padx=15, pady=15, sticky="ew")

        custom_panel = ctk.CTkFrame(tab_create)
        custom_panel.grid(row=0, column=1, padx=(10, 5), pady=10, sticky="nsew")
        custom_panel.grid_columnconfigure(0, weight=1)
        ctk.CTkLabel(custom_panel, text="Register New Ingredient", font=ctk.CTkFont(size=15, weight="bold")).grid(row=0, column=0, padx=15, pady=10, sticky="w")
        ctk.CTkEntry(custom_panel, placeholder_text="e.g. Bison Flank").grid(row=1, column=0, padx=15, pady=5, sticky="ew")
        ctk.CTkEntry(custom_panel, placeholder_text="Calories").grid(row=2, column=0, padx=15, pady=5, sticky="ew")
        ctk.CTkEntry(custom_panel, placeholder_text="Cost").grid(row=3, column=0, padx=15, pady=5, sticky="ew")
        ctk.CTkButton(custom_panel, text="🚀 Inject into Master DB", fg_color="#E65100").grid(row=4, column=0, padx=15, pady=15, sticky="ew")

        search_bar_frame = ctk.CTkFrame(tab_view, fg_color="transparent")
        search_bar_frame.grid(row=0, column=0, padx=15, pady=15, sticky="ew")
        search_bar_frame.grid_columnconfigure(0, weight=1)
        ctk.CTkEntry(search_bar_frame, placeholder_text="🔎 Search Recipes...").grid(row=0, column=0, padx=(0, 10), sticky="ew")
        ctk.CTkButton(search_bar_frame, text="Search", width=150, fg_color="#1F6AA5").grid(row=0, column=1)

        db_scroll = ctk.CTkScrollableFrame(tab_view, label_text="Database Library")
        db_scroll.grid(row=1, column=0, padx=15, pady=(0, 15), sticky="nsew")
        db_scroll.grid_columnconfigure(0, weight=1)

        mock_database_recipes = [("Mass Gainer Shake v1", "1,150 kcal • Cost: $3.40 • 5 mins"), ("Ground Beef & Rice Block", "850 kcal • Cost: $4.10 • 20 mins")]
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

        header_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        header_frame.grid(row=0, column=0, padx=30, pady=(20, 5), sticky="ew")
        ctk.CTkLabel(header_frame, text="Training Blueprint Builder 🏈", font=ctk.CTkFont(size=24, weight="bold")).pack(side="left")

        self.train_tabs = ctk.CTkTabview(self.main_frame)
        self.train_tabs.grid(row=1, column=0, padx=30, pady=(0, 20), sticky="nsew")
        
        tab_create = self.train_tabs.add("Build Workout")
        tab_view = self.train_tabs.add("Saved Workouts")
        
        tab_create.grid_columnconfigure(0, weight=4)
        tab_create.grid_columnconfigure(1, weight=3)
        tab_create.grid_rowconfigure(0, weight=1)
        
        tab_view.grid_columnconfigure(0, weight=1)
        tab_view.grid_rowconfigure(1, weight=1)

        builder_panel = ctk.CTkFrame(tab_create, border_width=1, border_color="#1F6AA5")
        builder_panel.grid(row=0, column=0, padx=(5, 10), pady=10, sticky="nsew")
        builder_panel.grid_rowconfigure(2, weight=1)
        builder_panel.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(builder_panel, text="Workout Blueprint Sandbox", font=ctk.CTkFont(size=15, weight="bold"), text_color="#1F6AA5").grid(row=0, column=0, padx=15, pady=10, sticky="w")

        name_frame = ctk.CTkFrame(builder_panel, fg_color="transparent")
        name_frame.grid(row=1, column=0, padx=15, pady=5, sticky="ew")
        name_frame.grid_columnconfigure(0, weight=1)
        ctk.CTkEntry(name_frame, placeholder_text="Workout Name").grid(row=0, column=0, padx=(0,5), sticky="ew")
        ctk.CTkEntry(name_frame, width=120, placeholder_text="Duration (mins)").grid(row=0, column=1, sticky="e")

        sandbox_scroll = ctk.CTkScrollableFrame(builder_panel, label_text="Routine Architecture")
        sandbox_scroll.grid(row=2, column=0, padx=15, pady=10, sticky="nsew")
        sandbox_scroll.grid_columnconfigure(0, weight=1)

        mock_exercises = [("Barbell Back Squat", "4 Sets x 5 Reps @ 85% 1RM"), ("Romanian Deadlift", "3 Sets x 8 Reps @ 275 lbs")]
        for idx, (ex, det) in enumerate(mock_exercises):
            ex_row = ctk.CTkFrame(sandbox_scroll, fg_color="#242424")
            ex_row.grid(row=idx, column=0, padx=5, pady=3, sticky="ew")
            ctk.CTkLabel(ex_row, text=ex, font=ctk.CTkFont(size=12, weight="bold")).pack(side="left", padx=10, pady=5)
            ctk.CTkLabel(ex_row, text=det, font=ctk.CTkFont(size=12), text_color="gray").pack(side="right", padx=10, pady=5)

        add_frame = ctk.CTkFrame(builder_panel, fg_color="transparent")
        add_frame.grid(row=3, column=0, padx=15, pady=10, sticky="ew")
        add_frame.grid_columnconfigure(0, weight=2)
        add_frame.grid_columnconfigure((1,2,3), weight=1)

        ctk.CTkOptionMenu(add_frame, values=["Barbell Back Squat", "Deadlift", "Bench Press"]).grid(row=0, column=0, padx=(0,5), sticky="ew")
        ctk.CTkEntry(add_frame, placeholder_text="Sets").grid(row=0, column=1, padx=5, sticky="ew")
        ctk.CTkEntry(add_frame, placeholder_text="Reps").grid(row=0, column=2, padx=5, sticky="ew")
        ctk.CTkEntry(add_frame, placeholder_text="Lbs/%").grid(row=0, column=3, padx=5, sticky="ew")
        ctk.CTkButton(add_frame, text="➕ Add", width=60, fg_color="#2E7D32").grid(row=0, column=4, padx=(5,0))
        ctk.CTkButton(builder_panel, text="💾 Save Workout Blueprint", fg_color="#1F6AA5", font=ctk.CTkFont(weight="bold")).grid(row=4, column=0, padx=15, pady=15, sticky="ew")

        vault_panel = ctk.CTkFrame(tab_create)
        vault_panel.grid(row=0, column=1, padx=(10, 5), pady=10, sticky="nsew")
        vault_panel.grid_columnconfigure(0, weight=1)
        vault_panel.grid_rowconfigure(2, weight=1)

        ctk.CTkLabel(vault_panel, text="1RM Reference Vault", font=ctk.CTkFont(size=15, weight="bold")).grid(row=0, column=0, padx=15, pady=(15,5), sticky="w")
        onerm_box = ctk.CTkFrame(vault_panel, fg_color="#1A242F")
        onerm_box.grid(row=1, column=0, padx=15, pady=5, sticky="ew")
        onerm_box.grid_columnconfigure(0, weight=1)
        ctk.CTkOptionMenu(onerm_box, values=["Barbell Back Squat", "Deadlift"]).grid(row=0, column=0, padx=10, pady=10, sticky="ew")
        ctk.CTkLabel(onerm_box, text="Current 1RM:", font=ctk.CTkFont(size=11)).grid(row=1, column=0, pady=(0, 2))
        ctk.CTkLabel(onerm_box, text="455 lbs", font=ctk.CTkFont(size=18, weight="bold"), text_color="#7CCD7C").grid(row=2, column=0, pady=(0, 10))

        history_scroll = ctk.CTkScrollableFrame(vault_panel, label_text="Historical Log")
        history_scroll.grid(row=2, column=0, padx=15, pady=15, sticky="nsew")
        history_scroll.grid_columnconfigure(0, weight=1)
        mock_hist = [("June 25", "4x5 @ 355 lbs"), ("June 18", "5x5 @ 345 lbs")]
        for idx, (dt, det) in enumerate(mock_hist):
            h_card = ctk.CTkFrame(history_scroll, fg_color="#2B2B2B")
            h_card.grid(row=idx, column=0, padx=5, pady=4, sticky="ew")
            ctk.CTkLabel(h_card, text=dt, font=ctk.CTkFont(size=12, weight="bold"), text_color="#1F6AA5").pack(anchor="w", padx=10, pady=(4,1))
            ctk.CTkLabel(h_card, text=det, font=ctk.CTkFont(size=11)).pack(anchor="w", padx=10, pady=(1,4))

        search_bar_frame = ctk.CTkFrame(tab_view, fg_color="transparent")
        search_bar_frame.grid(row=0, column=0, padx=15, pady=15, sticky="ew")
        search_bar_frame.grid_columnconfigure(0, weight=1)
        ctk.CTkEntry(search_bar_frame, placeholder_text="🔎 Search Saved Workouts...").grid(row=0, column=0, padx=(0, 10), sticky="ew")
        ctk.CTkButton(search_bar_frame, text="Search", width=100, fg_color="#1F6AA5").grid(row=0, column=1)

        db_scroll = ctk.CTkScrollableFrame(tab_view, label_text="Workout Database Library")
        db_scroll.grid(row=1, column=0, padx=15, pady=(0, 15), sticky="nsew")
        db_scroll.grid_columnconfigure(0, weight=1)

        mock_workouts = [("Lower Body Power - Phase 1", "4 Exercises • Est. Duration: 75 mins"), ("Upper Body Hypertrophy", "6 Exercises • Est. Duration: 60 mins")]
        for idx, (w_name, w_det) in enumerate(mock_workouts):
            w_card = ctk.CTkFrame(db_scroll, fg_color="#2B2B2B")
            w_card.grid(row=idx, column=0, padx=10, pady=6, sticky="ew")
            w_card.grid_columnconfigure(0, weight=1)
            ctk.CTkLabel(w_card, text=w_name, font=ctk.CTkFont(size=14, weight="bold")).grid(row=0, column=0, padx=15, pady=(8, 2), sticky="w")
            ctk.CTkLabel(w_card, text=w_det, font=ctk.CTkFont(size=12), text_color="gray").grid(row=1, column=0, padx=15, pady=(0, 8), sticky="w")
            ctk.CTkButton(w_card, text="📝 Edit Setup", width=100, height=28, fg_color="#3A3A3A").grid(row=0, column=1, rowspan=2, padx=15, pady=8, sticky="e")

    # =================================================================
    # SCHEDULE & CALENDAR MODULE
    # =================================================================
    def parse_hour(self, time_str):
        try:
            return datetime.datetime.strptime(time_str, "%I:%M %p").hour
        except ValueError:
            return 0

    def force_mac_scroll(self, scroll_widget):
        """Fixes Mac trackpad deadzones by explicitly binding all child frames to the master canvas."""
        canvas = scroll_widget._parent_canvas
        def _on_mousewheel(event):
            # Mac delta is naturally inverted in Tkinter compared to Windows
            canvas.yview_scroll(int(-1 * event.delta), "units")
            
        def _bind_all_children(widget):
            widget.bind("<MouseWheel>", _on_mousewheel, add="+")
            for child in widget.winfo_children():
                _bind_all_children(child)
                
        # Bind the master scroll frame and all its contents
        _bind_all_children(scroll_widget._parent_frame)

    def show_calendar_view(self):
        self.reset_main_frame()
        self.main_frame.grid_columnconfigure(0, weight=1)
        self.main_frame.grid_rowconfigure(2, weight=1)

        # Header Row
        header_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        header_frame.grid(row=0, column=0, padx=30, pady=(20, 5), sticky="ew")
        header_frame.grid_columnconfigure(1, weight=1)
        
        ctk.CTkLabel(header_frame, text="Master Timeline 📅", font=ctk.CTkFont(size=24, weight="bold")).grid(row=0, column=0, sticky="w")
        
        # Date Tracking Toggles
        toggle_frame = ctk.CTkFrame(header_frame, fg_color="transparent")
        toggle_frame.grid(row=0, column=1, padx=20)
        
        m_color = "#1F6AA5" if self.current_cal_view == "Month" else "#3A3A3A"
        w_color = "#1F6AA5" if self.current_cal_view == "Week" else "#3A3A3A"
        d_color = "#1F6AA5" if self.current_cal_view == "Day" else "#3A3A3A"

        ctk.CTkButton(toggle_frame, text="Month", width=60, fg_color=m_color, hover_color="#4A4A4A", command=lambda: self.switch_cal_view("Month")).pack(side="left", padx=2)
        ctk.CTkButton(toggle_frame, text="Week", width=60, fg_color=w_color, hover_color="#4A4A4A", command=lambda: self.switch_cal_view("Week")).pack(side="left", padx=2)
        ctk.CTkButton(toggle_frame, text="Day", width=60, fg_color=d_color, hover_color="#4A4A4A", command=lambda: self.switch_cal_view("Day")).pack(side="left", padx=2)

        # Popup Trigger Button
        ctk.CTkButton(header_frame, text="➕ Add Event", fg_color="#E65100", font=ctk.CTkFont(weight="bold"), command=self.open_add_event_modal).grid(row=0, column=2, sticky="e")

        # Color Legend Row
        legend_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        legend_frame.grid(row=1, column=0, padx=30, pady=(0, 10), sticky="ew")
        
        for name, data in self.event_meta.items():
            wrap = ctk.CTkFrame(legend_frame, fg_color="transparent")
            wrap.pack(side="left", padx=(0, 20))
            ctk.CTkFrame(wrap, width=12, height=12, fg_color=data["color"], corner_radius=6).pack(side="left", padx=(0, 5))
            ctk.CTkLabel(wrap, text=name, font=ctk.CTkFont(size=12)).pack(side="left")

        self.cal_content_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        self.cal_content_frame.grid(row=2, column=0, padx=30, pady=(0, 30), sticky="nsew")
        self.cal_content_frame.grid_columnconfigure(0, weight=1)
        self.cal_content_frame.grid_rowconfigure(0, weight=1)

        self.render_active_calendar()

    def switch_cal_view(self, view_name):
        self.current_cal_view = view_name
        self.show_calendar_view()

    def render_active_calendar(self):
        for widget in self.cal_content_frame.winfo_children():
            widget.destroy()
            
        t_str = self.today.strftime("%Y-%m-%d")
        daily_events = self.schedule_db.get(t_str, [])

        if self.current_cal_view == "Day":
            scroll = ctk.CTkScrollableFrame(self.cal_content_frame, label_text=f"Timeline for {self.today.strftime('%A, %b %d')}")
            scroll.grid(row=0, column=0, sticky="nsew")
            scroll.grid_columnconfigure(1, weight=1)

            first_hour = 23
            for hour in range(24):
                h_dt = datetime.datetime.strptime(str(hour), "%H")
                h_str = h_dt.strftime("%I %p").lstrip('0')
                
                row_frame = ctk.CTkFrame(scroll, fg_color="transparent", border_width=1, border_color="#2B2B2B")
                row_frame.grid(row=hour, column=0, columnspan=2, sticky="ew", pady=1)
                row_frame.grid_columnconfigure(1, weight=1)
                
                ctk.CTkLabel(row_frame, text=h_str, width=60, font=ctk.CTkFont(weight="bold", size=12), text_color="gray").grid(row=0, column=0, padx=10, pady=15, sticky="n")
                
                ev_container = ctk.CTkFrame(row_frame, fg_color="transparent")
                ev_container.grid(row=0, column=1, sticky="nsew", padx=10, pady=5)
                
                hour_events = [ev for ev in daily_events if self.parse_hour(ev["time"]) == hour]
                if hour_events and hour < first_hour:
                    first_hour = hour
                
                for ev in hour_events:
                    block = ctk.CTkFrame(ev_container, fg_color="#242424")
                    block.pack(fill="x", pady=2)
                    ctk.CTkFrame(block, width=6, fg_color=ev["color"], corner_radius=0).pack(side="left", fill="y")
                    info = ctk.CTkFrame(block, fg_color="transparent")
                    info.pack(side="left", fill="both", expand=True, padx=10, pady=5)
                    ctk.CTkLabel(info, text=f"{ev['time']} - {ev['title']} ({ev['type']})", font=ctk.CTkFont(size=12, weight="bold"), text_color=ev["color"]).pack(anchor="w")

            # Apply Mac scrolling and Auto-Jump
            self.force_mac_scroll(scroll)
            scroll.after(100, lambda: scroll._parent_canvas.yview_moveto(max(0, (first_hour - 1) / 24.0)))

        elif self.current_cal_view == "Week":
            scroll = ctk.CTkScrollableFrame(self.cal_content_frame, label_text="Current Week Time Grid")
            scroll.grid(row=0, column=0, sticky="nsew")
            
            scroll.grid_columnconfigure(0, weight=0) 
            for i in range(1, 8):
                scroll.grid_columnconfigure(i, weight=1) 
                
            ctk.CTkLabel(scroll, text="Time", font=ctk.CTkFont(weight="bold", text_color="gray")).grid(row=0, column=0, padx=5, pady=10)
            for i in range(7):
                day_offset = self.today + datetime.timedelta(days=i - self.today.weekday())
                bg_col = "#1F6AA5" if day_offset == self.today else "transparent"
                header = ctk.CTkFrame(scroll, fg_color=bg_col, corner_radius=4)
                header.grid(row=0, column=i+1, padx=2, pady=5, sticky="ew")
                ctk.CTkLabel(header, text=day_offset.strftime("%a %b %d"), font=ctk.CTkFont(weight="bold", size=12)).pack(pady=5)
                
            first_hour = 23
            for hour in range(24):
                # FIX: Explicit minsize ensures empty rows don't collapse
                scroll.grid_rowconfigure(hour+1, minsize=65) 
                h_dt = datetime.datetime.strptime(str(hour), "%H")
                h_str = h_dt.strftime("%I %p").lstrip('0')
                
                ctk.CTkLabel(scroll, text=h_str, font=ctk.CTkFont(size=11, text_color="gray")).grid(row=hour+1, column=0, padx=5, pady=2, sticky="n")
                
                for i in range(7):
                    day_offset = self.today + datetime.timedelta(days=i - self.today.weekday())
                    d_str = day_offset.strftime("%Y-%m-%d")
                    day_events = self.schedule_db.get(d_str, []) if day_offset == self.today else []
                    hour_events = [ev for ev in day_events if self.parse_hour(ev["time"]) == hour]
                    
                    cell = ctk.CTkFrame(scroll, fg_color="transparent", border_width=1, border_color="#2B2B2B")
                    cell.grid(row=hour+1, column=i+1, padx=1, pady=1, sticky="nsew")
                    
                    # Invisible spacer to physically prop the cell open if it's empty
                    ctk.CTkFrame(cell, width=0, height=65, fg_color="transparent").pack(side="left") 
                    
                    if hour_events:
                        if hour < first_hour:
                            first_hour = hour
                        for ev in hour_events:
                            ev_box = ctk.CTkFrame(cell, fg_color=ev["color"], corner_radius=4)
                            ev_box.pack(fill="x", padx=2, pady=2)
                            ctk.CTkLabel(ev_box, text=f"{ev['title']}", font=ctk.CTkFont(size=10, weight="bold")).pack(pady=2, padx=4)

            self.force_mac_scroll(scroll)
            scroll.after(100, lambda: scroll._parent_canvas.yview_moveto(max(0, (first_hour - 1) / 24.0)))

        elif self.current_cal_view == "Month":
            scroll = ctk.CTkScrollableFrame(self.cal_content_frame, label_text=f"Month View: {self.today.strftime('%B %Y')}")
            scroll.grid(row=0, column=0, sticky="nsew")
            
            for i in range(7):
                scroll.grid_columnconfigure(i, weight=1)
                ctk.CTkLabel(scroll, text=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i], font=ctk.CTkFont(weight="bold")).grid(row=0, column=i, pady=5)
            
            month_days = calendar.monthcalendar(self.today.year, self.today.month)
            for r_idx, week in enumerate(month_days):
                scroll.grid_rowconfigure(r_idx+1, minsize=100)
                for c_idx, day_num in enumerate(week):
                    if day_num != 0:
                        d_box = ctk.CTkFrame(scroll, border_width=1, border_color="#3A3A3A")
                        d_box.grid(row=r_idx+1, column=c_idx, padx=2, pady=2, sticky="nsew")
                        ctk.CTkFrame(d_box, width=0, height=100, fg_color="transparent").pack(side="left") 
                        
                        txt_col = "#7CCD7C" if day_num == self.today.day else "white"
                        ctk.CTkLabel(d_box, text=str(day_num), font=ctk.CTkFont(weight="bold"), text_color=txt_col).place(relx=0.9, rely=0.1, anchor="ne")
                        
                        if day_num == self.today.day:
                            for ev in daily_events[:3]:
                                ctk.CTkFrame(d_box, height=6, fg_color=ev["color"], corner_radius=2).pack(fill="x", padx=5, pady=2, anchor="s")
                                
            self.force_mac_scroll(scroll)

    # ----------------- MODAL OVERLAY LOGIC -----------------
    def open_add_event_modal(self):
        self.close_modal()
        
        self.modal = ctk.CTkFrame(self.main_frame, width=450, border_width=2, border_color="#1F6AA5", corner_radius=15, fg_color="#1A242F")
        self.modal.place(relx=0.5, rely=0.5, anchor="center")
        
        header_frame = ctk.CTkFrame(self.modal, fg_color="transparent")
        header_frame.pack(fill="x", padx=20, pady=(20, 10))
        
        ctk.CTkLabel(header_frame, text="Construct Event", font=ctk.CTkFont(size=18, weight="bold")).pack(side="left")
        btn_close = ctk.CTkButton(header_frame, text="✕", width=30, fg_color="transparent", hover_color="#c62828", text_color="white", command=self.modal.destroy)
        btn_close.pack(side="right")

        ctk.CTkLabel(self.modal, text="Select Event Architecture:", font=ctk.CTkFont(weight="bold")).pack(anchor="w", padx=20, pady=(5, 5))
        
        self.type_dropdown = ctk.CTkOptionMenu(self.modal, values=list(self.event_meta.keys()), command=self.update_modal_fields)
        self.type_dropdown.pack(fill="x", padx=20, pady=(0, 15))

        self.dynamic_inputs = ctk.CTkFrame(self.modal, fg_color="transparent")
        self.dynamic_inputs.pack(fill="both", expand=True, padx=20, pady=(5, 25))
        self.dynamic_inputs.grid_columnconfigure(0, weight=1)

        self.update_modal_fields("Workout")

    def update_modal_fields(self, choice):
        for widget in self.dynamic_inputs.winfo_children():
            widget.destroy()

        meta = self.event_meta[choice]
        ctk.CTkLabel(self.dynamic_inputs, text=meta["title"], font=ctk.CTkFont(size=14, weight="bold"), text_color=meta["color"]).grid(row=0, column=0, pady=(5, 15), sticky="w")

        if choice == "Workout":
            ctk.CTkLabel(self.dynamic_inputs, text="Load Blueprint Template:").grid(row=1, column=0, sticky="w")
            ctk.CTkOptionMenu(self.dynamic_inputs, values=["Lower Body Power - Phase 1", "Upper Body Hypertrophy"]).grid(row=2, column=0, pady=(0, 15), sticky="ew")
            ctk.CTkLabel(self.dynamic_inputs, text="Start Time (e.g. 02:00 PM):").grid(row=3, column=0, sticky="w")
            ctk.CTkEntry(self.dynamic_inputs, placeholder_text="HH:MM AM/PM").grid(row=4, column=0, pady=(0, 15), sticky="ew")

        elif choice == "Meal":
            ctk.CTkLabel(self.dynamic_inputs, text="Load Recipe Payload:").grid(row=1, column=0, sticky="w")
            ctk.CTkOptionMenu(self.dynamic_inputs, values=["Mass Gainer Shake v1", "Ground Beef & Rice Block"]).grid(row=2, column=0, pady=(0, 15), sticky="ew")
            ctk.CTkLabel(self.dynamic_inputs, text="Target Consumption Time:").grid(row=3, column=0, sticky="w")
            ctk.CTkEntry(self.dynamic_inputs, placeholder_text="HH:MM AM/PM").grid(row=4, column=0, pady=(0, 15), sticky="ew")

        elif choice == "Work":
            ctk.CTkLabel(self.dynamic_inputs, text="Start Time:").grid(row=1, column=0, sticky="w")
            ctk.CTkEntry(self.dynamic_inputs, placeholder_text="HH:MM AM/PM").grid(row=2, column=0, pady=(0, 15), sticky="ew")
            ctk.CTkLabel(self.dynamic_inputs, text="Duration (mins):").grid(row=3, column=0, sticky="w")
            ctk.CTkEntry(self.dynamic_inputs, placeholder_text="0").grid(row=4, column=0, pady=(0, 15), sticky="ew")

        elif choice == "Commute":
            ctk.CTkLabel(self.dynamic_inputs, text="Target Arrival Time:").grid(row=1, column=0, sticky="w")
            ctk.CTkEntry(self.dynamic_inputs, placeholder_text="HH:MM AM/PM").grid(row=2, column=0, pady=(0, 15), sticky="ew")
            ctk.CTkLabel(self.dynamic_inputs, text="Estimated Duration (mins):").grid(row=3, column=0, sticky="w")
            ctk.CTkEntry(self.dynamic_inputs, placeholder_text="0").grid(row=4, column=0, pady=(0, 15), sticky="ew")

        elif choice == "Social":
            ctk.CTkLabel(self.dynamic_inputs, text="Start Time:").grid(row=1, column=0, sticky="w")
            ctk.CTkEntry(self.dynamic_inputs, placeholder_text="HH:MM AM/PM").grid(row=2, column=0, pady=(0, 15), sticky="ew")
            ctk.CTkLabel(self.dynamic_inputs, text="Max Duration Constraint (mins):").grid(row=3, column=0, sticky="w")
            ctk.CTkEntry(self.dynamic_inputs, placeholder_text="0").grid(row=4, column=0, pady=(0, 15), sticky="ew")

        ctk.CTkButton(self.dynamic_inputs, text="Commit to Timeline", fg_color=meta["color"], font=ctk.CTkFont(weight="bold"), command=self.close_modal).grid(row=5, column=0, pady=(10, 0), sticky="ew")


if __name__ == "__main__":
    app = FootballApp()
    app.mainloop()