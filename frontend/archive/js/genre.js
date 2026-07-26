/**
 * genre.js
 * -----------------------------------------------------------------------------
 * Predict Genre page: POST /predict-genre
 * Builds the shared feature-slider form (see featureForm.js) into
 * #genreFormGrid, then sends the chosen feature values to the backend model
 * and displays the predicted genre + confidence it returns.
 * -----------------------------------------------------------------------------
 */

buildFeatureForm('genreFormGrid', 'genre');

document.getElementById('predictGenreBtn').addEventListener('click', async () => {
  const btn = document.getElementById('predictGenreBtn');
  btn.disabled = true;
  btn.textContent = "Predicting…";
  const features = readFeatureForm('genre');
  const result = await apiCall(ENDPOINTS.predictGenre(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(features)
  });
  btn.disabled = false;
  btn.textContent = "Predict Genre";

  if (result === null) {
    showToast(ERROR_MESSAGE, "error");
    return;
  }

  document.getElementById('genreChipResult').textContent = result.genre;
  document.getElementById('genreConfidenceResult').textContent = `Confidence: ${result.confidence}%`;
  document.getElementById('genreResultBox').classList.add('show');
  showToast(`Predicted genre: ${result.genre}`);
});

document.getElementById('genreRandomizeBtn').addEventListener('click', () => randomizeFeatureForm('genre'));
