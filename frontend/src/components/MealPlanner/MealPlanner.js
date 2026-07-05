import React from 'react';

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
}) {
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
            <div className="divider" />
            <div className="inline-action-row">
              <span>Ingredients</span>
              <button className="secondary-button" onClick={handleIngredientModalOpen}>
                Add ingredient
              </button>
            </div>
            <select
              name="ingredient_id"
              value={recipeForm.ingredient_id}
              onChange={(e) =>
                setRecipeForm((prev) => ({ ...prev, ingredient_id: e.target.value }))
              }
            >
              <option value="">Choose ingredient</option>
              {ingredients.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
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
      ) : (
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
                  <div className="action-row">
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
      )}
    </section>
  );
}
