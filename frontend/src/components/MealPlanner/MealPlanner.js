import React, { useState, useEffect } from 'react';
import { updateGroceryList, deleteGroceryList, createGroceryList } from '../../services/api';

export default function MealPlanner({
  plannerTab,
  setPlannerTab,
  recipeForm,
  setRecipeForm,
  handleIngredientModalOpen,
  ingredients,
  addRecipeIngredient,
  removeRecipeIngredient,
  saveRecipe,
  recipes,
  editRecipe,
  deleteRecipe,
  ingredientLibrarySearch,
  setIngredientLibrarySearch,
  filteredIngredients,
  openIngredientEdit,
  handleDeleteIngredient,
  onToggleInventory,
  allGroceryLists = [],
  fetchAllGroceryLists,
  handleCompleteGroceryShop,
  handleDeleteGrocery,
  handleGenerateGroceryList,
  activeGroceryList,
}) {
  const [listFilter, setListFilter] = useState('active'); // 'active' or 'archived'
  const [customItemForm, setCustomItemForm] = useState({ listId: null, name: '', quantity_g: '' });
  const [newListTitle, setNewListTitle] = useState('');
  const [recipeIngredientSearch, setRecipeIngredientSearch] = useState('');

  // Discard changes if user switches tabs away from builder while editing
  useEffect(() => {
    if (plannerTab !== 'build' && recipeForm.id) {
      setRecipeForm({ id: null, name: '', meal_type: 'supper', time_to_cook_mins: '', ingredient_id: '', quantity_g: '', items: [] });
    }
  }, [plannerTab, recipeForm.id, setRecipeForm]);

  const builderFilteredIngredients = ingredients.filter((item) => {
    if (!recipeIngredientSearch) return true;
    return item.name.toLowerCase().includes(recipeIngredientSearch.toLowerCase()) || (item.category && item.category.toLowerCase().includes(recipeIngredientSearch.toLowerCase()));
  });

  const handleToggleListItem = async (list, itemIdx) => {
    try {
      const items = JSON.parse(list.items_json || '[]');
      if (items[itemIdx]) {
        items[itemIdx].checked = !items[itemIdx].checked;
        await updateGroceryList(list.id, {
          status: list.status,
          items_json: JSON.stringify(items),
        });
        if (fetchAllGroceryLists) fetchAllGroceryLists();
      }
    } catch (err) {
      console.error('Error toggling grocery item:', err);
    }
  };

  const handleRemoveListItem = async (list, itemIdx) => {
    try {
      const items = JSON.parse(list.items_json || '[]');
      items.splice(itemIdx, 1);
      await updateGroceryList(list.id, {
        status: list.status,
        items_json: JSON.stringify(items),
      });
      if (fetchAllGroceryLists) fetchAllGroceryLists();
    } catch (err) {
      console.error('Error removing grocery item:', err);
    }
  };

  const handleAddCustomItem = async (list) => {
    if (!customItemForm.name.trim() || customItemForm.listId !== list.id) return;
    try {
      const items = JSON.parse(list.items_json || '[]');
      items.push({
        name: customItemForm.name.trim(),
        quantity_g: Number(customItemForm.quantity_g) || 1,
        checked: false,
      });
      await updateGroceryList(list.id, {
        status: list.status,
        items_json: JSON.stringify(items),
      });
      setCustomItemForm({ listId: null, name: '', quantity_g: '' });
      if (fetchAllGroceryLists) fetchAllGroceryLists();
    } catch (err) {
      console.error('Error adding custom grocery item:', err);
    }
  };

  const handleCreateManualList = async (e) => {
    e?.preventDefault();
    if (!newListTitle.trim()) return;
    try {
      await createGroceryList(newListTitle.trim(), JSON.stringify([]));
      setNewListTitle('');
      setListFilter('active');
      if (fetchAllGroceryLists) fetchAllGroceryLists();
    } catch (err) {
      console.error('Error creating manual grocery list:', err);
    }
  };

  const handleStatusToggle = async (list) => {
    try {
      const newStatus = list.status === 'completed' ? 'pending' : 'completed';
      if (newStatus === 'completed' && handleCompleteGroceryShop) {
        handleCompleteGroceryShop(list.id);
      } else {
        await updateGroceryList(list.id, { status: newStatus });
        if (fetchAllGroceryLists) fetchAllGroceryLists();
      }
    } catch (err) {
      console.error('Error toggling list status:', err);
    }
  };

  const handleConfirmDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this grocery list?')) {
      try {
        if (handleDeleteGrocery) {
          handleDeleteGrocery(id);
        } else {
          await deleteGroceryList(id);
          if (fetchAllGroceryLists) fetchAllGroceryLists();
        }
      } catch (err) {
        console.error('Error deleting list:', err);
      }
    }
  };

  const filteredLists = allGroceryLists.filter((l) =>
    listFilter === 'active' ? l.status !== 'completed' : l.status === 'completed'
  );

  return (
    <section className="tabbed-layout">
      <div className="sub-tabs">
        <button
          className={plannerTab === 'build' ? 'active' : ''}
          onClick={() => setPlannerTab('build')}
        >
          Recipe Builder
        </button>
        <button
          className={plannerTab === 'list' ? 'active' : ''}
          onClick={() => setPlannerTab('list')}
        >
          My Recipes
        </button>
        <button
          className={plannerTab === 'ingredients' ? 'active' : ''}
          onClick={() => setPlannerTab('ingredients')}
        >
          Ingredients
        </button>
        <button
          className={plannerTab === 'groceries' ? 'active' : ''}
          onClick={() => setPlannerTab('groceries')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          🛒 Grocery Lists
          {allGroceryLists.filter((l) => l.status !== 'completed').length > 0 && (
            <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '0.75rem' }}>
              {allGroceryLists.filter((l) => l.status !== 'completed').length}
            </span>
          )}
        </button>
      </div>

      {plannerTab === 'build' ? (
        <div className="form-grid">
          <div className="panel form-card">
            <h2>Recipe details</h2>
            <label>Name</label>
            <input
              name="name"
              value={recipeForm.name}
              onChange={(e) =>
                setRecipeForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Post-workout bowl"
            />
            <label>Estimated cook time (mins)</label>
            <input
              name="time_to_cook_mins"
              value={recipeForm.time_to_cook_mins}
              onChange={(e) =>
                setRecipeForm((prev) => ({ ...prev, time_to_cook_mins: e.target.value }))
              }
              placeholder="25"
            />
            <label style={{ marginTop: '12px' }}>Meal Type (Select all that apply)</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '8px 0 16px 0' }}>
              {['Breakfast', 'Lunch', 'Supper', 'Snack'].map((type) => {
                const currentTypes = (recipeForm.meal_type || 'supper')
                  .split(',')
                  .map((s) => s.trim().toLowerCase());
                const isSelected = currentTypes.includes(type.toLowerCase());
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      let newTypes;
                      if (isSelected) {
                        newTypes = currentTypes.filter((t) => t !== type.toLowerCase());
                      } else {
                        newTypes = [...currentTypes, type.toLowerCase()];
                      }
                      if (newTypes.length === 0) newTypes = ['supper'];
                      setRecipeForm((prev) => ({ ...prev, meal_type: newTypes.join(', ') }));
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '16px',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--primary)' : 'var(--input-bg)',
                      color: isSelected ? '#fff' : 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: isSelected ? 600 : 400,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isSelected ? '✓ ' : '+ '}{type}
                  </button>
                );
              })}
            </div>
            <div className="divider" />
            <div className="inline-action-row">
              <span>Ingredients</span>
              <button className="secondary-button" onClick={handleIngredientModalOpen}>
                Add ingredient
              </button>
            </div>
            <div style={{ margin: '8px 0' }}>
              <input
                type="text"
                placeholder="🔍 Search ingredients by title or category..."
                value={recipeIngredientSearch}
                onChange={(e) => setRecipeIngredientSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
              />
            </div>
            <select
              name="ingredient_id"
              value={recipeForm.ingredient_id}
              onChange={(e) =>
                setRecipeForm((prev) => ({ ...prev, ingredient_id: e.target.value }))
              }
            >
              <option value="">Choose ingredient ({builderFilteredIngredients.length} matching options)</option>
              {builderFilteredIngredients.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} {item.in_inventory ? '(In Stock)' : ''} {item.category ? `[${item.category}]` : ''}
                </option>
              ))}
            </select>
            <input
              name="quantity_g"
              value={recipeForm.quantity_g}
              onChange={(e) =>
                setRecipeForm((prev) => ({ ...prev, quantity_g: e.target.value }))
              }
              placeholder="Amount in grams"
            />
            <button className="secondary-button" onClick={addRecipeIngredient}>
              Add to recipe
            </button>
            <div className="list-group compact">
              {recipeForm.items.map((item, index) => (
                <div key={index} className="entity-card">
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.quantity_g}g ·{' '}
                      {Math.round((item.kcal_per_100g * item.quantity_g) / 100)} kcal
                    </span>
                  </div>
                  <button
                    className="action-delete"
                    onClick={() => removeRecipeIngredient(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button className="primary-button" onClick={saveRecipe}>
              Save recipe
            </button>
          </div>
        </div>
      ) : plannerTab === 'list' ? (
        <div className="panel list-card">
          <div className="section-title">
            <h2>My saved recipes</h2>
            <button className="secondary-button" onClick={() => setPlannerTab('build')}>
              New recipe
            </button>
          </div>
          <div className="event-list">
            {recipes.length ? (
              recipes.map((recipe) => (
                <div key={recipe.id} className="entity-card">
                  <div>
                    <strong>{recipe.name}</strong>
                    <span>
                      {recipe.total_kcal} kcal · ${recipe.cost.toFixed(2)}
                      {recipe.meal_type && (
                        <span style={{ display: 'inline-block', marginLeft: '8px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600 }}>
                          {recipe.meal_type}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="action-row">
                    <button onClick={() => editRecipe(recipe)}>Edit</button>
                    <button
                      className="action-delete"
                      onClick={() => deleteRecipe(recipe.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No recipes yet.</div>
            )}
          </div>
        </div>
      ) : plannerTab === 'ingredients' ? (
        <div className="panel list-card">
          <div className="section-title">
            <h2>Ingredient library</h2>
            <button className="primary-button" onClick={handleIngredientModalOpen}>
              Add ingredient
            </button>
          </div>
          <div className="search-row">
            <input
              value={ingredientLibrarySearch}
              onChange={(e) => setIngredientLibrarySearch(e.target.value)}
              placeholder="Search ingredients"
            />
          </div>
          <div className="exercise-list-scroll">
            {filteredIngredients.length ? (
              filteredIngredients.map((ingredient) => (
                <div key={ingredient.id} className="entity-card">
                  <div>
                    <strong>{ingredient.name}</strong>
                    <span>{ingredient.kcal_per_100g} kcal / 100g</span>
                  </div>
                  <div className="action-row" style={{ alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px', marginRight: '8px' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(ingredient.in_inventory)}
                        onChange={() => onToggleInventory && onToggleInventory(ingredient.id, !ingredient.in_inventory)}
                      />
                      In Stock
                    </label>
                    <button onClick={() => openIngredientEdit(ingredient)}>Edit</button>
                    <button
                      className="action-delete"
                      onClick={() => handleDeleteIngredient(ingredient.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No ingredients found.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="panel list-card">
          <div className="section-title" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0 }}>Grocery Lists Manager</h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                View, check items, add custom items, or archive your shopping lists
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="secondary-button"
                style={{
                  background: listFilter === 'active' ? 'var(--primary)' : 'transparent',
                  color: listFilter === 'active' ? '#fff' : 'var(--text)',
                  borderColor: listFilter === 'active' ? 'var(--primary)' : 'var(--border)',
                }}
                onClick={() => setListFilter('active')}
              >
                📝 Active ({allGroceryLists.filter((l) => l.status !== 'completed').length})
              </button>
              <button
                type="button"
                className="secondary-button"
                style={{
                  background: listFilter === 'archived' ? 'var(--primary)' : 'transparent',
                  color: listFilter === 'archived' ? '#fff' : 'var(--text)',
                  borderColor: listFilter === 'archived' ? 'var(--primary)' : 'var(--border)',
                }}
                onClick={() => setListFilter('archived')}
              >
                🗄️ Completed / Archived ({allGroceryLists.filter((l) => l.status === 'completed').length})
              </button>
            </div>
          </div>

          {/* Create Custom Manual List Bar */}
          <form onSubmit={handleCreateManualList} style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'var(--bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <input
              style={{ flex: 1, margin: 0 }}
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              placeholder="Create a custom list (e.g. Weekend BBQ, Costco Run...)"
            />
            <button type="submit" className="primary-button" style={{ whiteSpace: 'nowrap' }}>
              + Create List
            </button>
          </form>

          {/* Grocery Lists Display */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredLists.length ? (
              filteredLists.map((list) => {
                let items = [];
                try {
                  items = JSON.parse(list.items_json || '[]');
                } catch (e) {
                  items = [];
                }
                const checkedCount = items.filter((i) => i.checked).length;
                const progressPct = items.length ? Math.round((checkedCount / items.length) * 100) : 0;

                return (
                  <div
                    key={list.id}
                    className="card"
                    style={{
                      padding: '16px',
                      background: 'var(--card-bg)',
                      borderRadius: '12px',
                      border: list.status === 'completed' ? '1px solid var(--border)' : '1px solid var(--primary)',
                      boxShadow: list.status === 'completed' ? 'none' : '0 4px 12px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{list.week_label || `Grocery List #${list.id}`}</h3>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: list.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              color: list.status === 'completed' ? '#10b981' : 'var(--primary)',
                              fontWeight: 600,
                            }}
                          >
                            {list.status === 'completed' ? '✓ Completed' : '⚡ Active'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Created {list.created_at ? new Date(list.created_at).toLocaleDateString() : 'recently'} · {items.length} items ({checkedCount} checked)
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="secondary-button"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.85rem',
                            background: list.status === 'completed' ? 'transparent' : 'rgba(16, 185, 129, 0.1)',
                            color: list.status === 'completed' ? 'var(--text)' : '#10b981',
                            borderColor: list.status === 'completed' ? 'var(--border)' : '#10b981',
                          }}
                          onClick={() => handleStatusToggle(list)}
                        >
                          {list.status === 'completed' ? '↩️ Reopen List' : '✓ Mark Completed'}
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ padding: '6px 12px', fontSize: '0.85rem', color: '#ef4444', borderColor: '#ef4444' }}
                          onClick={() => handleConfirmDelete(list.id)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {items.length > 0 && (
                      <div style={{ width: '100%', height: '6px', background: 'var(--bg)', borderRadius: '3px', overflow: 'hidden', marginBottom: '14px' }}>
                        <div style={{ width: `${progressPct}%`, height: '100%', background: progressPct === 100 ? '#10b981' : 'var(--primary)', transition: 'width 0.3s ease' }} />
                      </div>
                    )}

                    {/* Items Checklist */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px', marginBottom: '14px' }}>
                      {items.length ? (
                        items.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 10px',
                              background: item.checked ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg)',
                              border: item.checked ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border)',
                              borderRadius: '8px',
                              textDecoration: item.checked ? 'line-through' : 'none',
                              opacity: item.checked ? 0.75 : 1,
                            }}
                          >
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, margin: 0, fontSize: '0.9rem' }}>
                              <input
                                type="checkbox"
                                checked={Boolean(item.checked)}
                                onChange={() => handleToggleListItem(list, idx)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                              <span style={{ fontWeight: 500 }}>{item.name}</span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                {item.quantity_g}g
                              </span>
                            </label>
                            <button
                              type="button"
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '6px', fontSize: '0.9rem' }}
                              onClick={() => handleRemoveListItem(list, idx)}
                              title="Remove item"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      ) : (
                        <div style={{ gridColumn: '1 / -1', padding: '12px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg)', borderRadius: '8px' }}>
                          No items in this list yet. Add some below!
                        </div>
                      )}
                    </div>

                    {/* Add Custom Item to List */}
                    {list.status !== 'completed' && (
                      <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                        <input
                          style={{ flex: 2, margin: 0, fontSize: '0.85rem', padding: '6px 10px' }}
                          placeholder="Add custom item (e.g. Olive Oil, Greek Yogurt...)"
                          value={customItemForm.listId === list.id ? customItemForm.name : ''}
                          onChange={(e) => setCustomItemForm({ listId: list.id, name: e.target.value, quantity_g: customItemForm.listId === list.id ? customItemForm.quantity_g : '' })}
                        />
                        <input
                          style={{ width: '100px', margin: 0, fontSize: '0.85rem', padding: '6px 10px' }}
                          type="number"
                          placeholder="Qty (g/unit)"
                          value={customItemForm.listId === list.id ? customItemForm.quantity_g : ''}
                          onChange={(e) => setCustomItemForm({ listId: list.id, name: customItemForm.listId === list.id ? customItemForm.name : '', quantity_g: e.target.value })}
                        />
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ padding: '6px 14px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                          onClick={() => handleAddCustomItem(list)}
                        >
                          + Add Item
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🛒</div>
                <h3 style={{ margin: '0 0 6px 0' }}>No {listFilter} grocery lists found</h3>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                  {listFilter === 'active'
                    ? 'Use the "+ Create List" box above or generate one from your weekly meals on the Weekly Planner tab!'
                    : 'When you check off and complete your shopping lists, they will show up here.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
