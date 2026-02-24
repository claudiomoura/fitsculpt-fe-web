type NutritionStatsProps = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  shoppingItems: number;
};

export default function NutritionStats({ calories, protein, carbs, fats, shoppingItems }: NutritionStatsProps) {
  return (
    <section className="card stack-sm" aria-label="Nutrition stats">
      <h3 className="section-title section-title-sm m-0">KPIs diarios</h3>
      <div className="info-grid">
        <div className="info-item">
          <div className="info-label">Calorías</div>
          <div className="info-value">{Math.round(calories)} kcal</div>
        </div>
        <div className="info-item">
          <div className="info-label">Proteína</div>
          <div className="info-value">{Math.round(protein)} g</div>
        </div>
        <div className="info-item">
          <div className="info-label">Carbohidratos</div>
          <div className="info-value">{Math.round(carbs)} g</div>
        </div>
        <div className="info-item">
          <div className="info-label">Grasas</div>
          <div className="info-value">{Math.round(fats)} g</div>
        </div>
        <div className="info-item">
          <div className="info-label">Lista compra</div>
          <div className="info-value">{shoppingItems} items</div>
        </div>
      </div>
    </section>
  );
}
