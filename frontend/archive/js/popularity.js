/**
 * popularity.js
 * -----------------------------------------------------------------------------
 * Predict Popularity page: POST /predict-popularity
 * Builds the shared feature-slider form (see featureForm.js) into
 * #popularityFormGrid, sends values to the backend, and animates a 0-100
 * meter with the returned score.
 * -----------------------------------------------------------------------------
 */

buildFeatureForm('popularityFormGrid', 'pop');

document.getElementById('predictPopularityBtn').addEventListener('click', async () => {
  const btn = document.getElementById('predictPopularityBtn');
  btn.disabled = true;
  btn.textContent = "Predicting…";
  const features = readFeatureForm('pop');
  const result = await apiCall(ENDPOINTS.predictPopularity(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(features)
  });
  btn.disabled = false;
  btn.textContent = "Predict Popularity";

  if (result === null) {
    showToast(ERROR_MESSAGE, "error");
    return;
  }

  const box = document.getElementById('popularityResultBox');
  const scoreEl = document.getElementById('popularityScoreResult');
  const fillEl = document.getElementById('popularityFill');
  box.classList.add('show');
  scoreEl.textContent = result.popularity;
  fillEl.style.width = '0%';
  requestAnimationFrame(() => { fillEl.style.width = `${result.popularity}%`; });
  showToast(`Predicted popularity score: ${result.popularity}/100`);
});

document.getElementById('popularityRandomizeBtn').addEventListener('click', () => randomizeFeatureForm('pop'));
