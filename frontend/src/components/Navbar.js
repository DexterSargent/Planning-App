import React from 'react';

export function SideNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'mealplan', label: 'Meal Planner' },
    { id: 'training', label: 'Training' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'analytics', label: 'Analytics' },
  ];

  return (
    <aside className="side-nav">
      <div className="brand">Performance HQ</div>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={activeTab === tab.id ? 'active' : ''}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </aside>
  );
}

export function TopBar({ activeTab, theme, setTheme }) {
  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard';
      case 'mealplan': return 'Meal Planner';
      case 'training': return 'Training Lab';
      case 'schedule': return 'Schedule';
      case 'analytics': return 'Analytics';
      default: return 'Performance HQ';
    }
  };

  return (
    <header className="top-bar">
      <div>
        <h1>{getTitle()}</h1>
        <p className="subtitle">Organize your day by workouts, meals, and events.</p>
      </div>
      <div className="top-actions">
        <button
          className="secondary-button theme-toggle"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          {theme === 'light' ? 'Dark mode' : 'Light mode'}
        </button>
        <div className="status-pill">Live</div>
      </div>
    </header>
  );
}
