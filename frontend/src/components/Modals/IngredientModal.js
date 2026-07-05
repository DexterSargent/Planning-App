import React from 'react';

export default function IngredientModal({
  ingredientModalVisible,
  setIngredientModalVisible,
  editingIngredient,
  ingredientForm,
  setIngredientForm,
  handleSaveIngredient,
}) {
  if (!ingredientModalVisible) return null;

  return (
    <div className="modal-overlay" onClick={() => setIngredientModalVisible(false)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>{editingIngredient ? 'Edit ingredient' : 'Add ingredient'}</h3>
        <label>Name</label>
        <input
          value={ingredientForm.name}
          onChange={(e) =>
            setIngredientForm((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="Chicken Breast"
        />
        <label>Calories / 100g</label>
        <input
          value={ingredientForm.kcal}
          onChange={(e) =>
            setIngredientForm((prev) => ({ ...prev, kcal: e.target.value }))
          }
          placeholder="165"
        />
        <label>Cost / 100g</label>
        <input
          value={ingredientForm.cost}
          onChange={(e) =>
            setIngredientForm((prev) => ({ ...prev, cost: e.target.value }))
          }
          placeholder="1.80"
        />
        <label>Category</label>
        <input
          value={ingredientForm.category}
          onChange={(e) =>
            setIngredientForm((prev) => ({ ...prev, category: e.target.value }))
          }
          placeholder="Meat & Poultry"
        />
        <div className="modal-actions">
          <button className="secondary-button" onClick={() => setIngredientModalVisible(false)}>
            Cancel
          </button>
          <button className="primary-button" onClick={handleSaveIngredient}>
            {editingIngredient ? 'Save changes' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
