$Root = "Design-of-Weather-Services"

# Folders
$dirs = @(
  "$Root\backend-node\routes",
  "$Root\backend-node\controllers",
  "$Root\backend-node\utils",
  "$Root\backend-node\tests",
  "$Root\backend-python-nlp\nlp",
  "$Root\backend-python-nlp\tests",
  "$Root\frontend-react\src\components",
  "$Root\frontend-react\src\services",
  "$Root\frontend-react\src\styles",
  "$Root\frontend-react\tests",
  "$Root\docs",
  "$Root\scripts"
)

foreach ($d in $dirs) {
  New-Item -ItemType Directory -Force -Path $d | Out-Null
}

# Files
$files = @(
  "README.md",".gitignore",".env.example","package.json",

  "backend-node\package.json","backend-node\server.js",
  "backend-node\routes\flightPlanRoutes.js","backend-node\routes\weatherRoutes.js","backend-node\routes\notamRoutes.js",
  "backend-node\controllers\flightPlanController.js","backend-node\controllers\weatherController.js","backend-node\controllers\severityController.js","backend-node\controllers\notamController.js",
  "backend-node\utils\metarDecoder.js","backend-node\utils\tafDecoder.js","backend-node\utils\waypointGenerator.js","backend-node\utils\severityClassifier.js","backend-node\utils\apiFetcher.js",
  "backend-node\tests\test_weather.js","backend-node\tests\test_flightplan.js","backend-node\tests\test_waypoints.js",

  "backend-python-nlp\requirements.txt","backend-python-nlp\app.py",
  "backend-python-nlp\nlp\notam_parser.py","backend-python-nlp\nlp\summary_model.py","backend-python-nlp\tests\test_notam_parser.py",

  "frontend-react\package.json","frontend-react\vite.config.js","frontend-react\tailwind.config.cjs","frontend-react\postcss.config.js","frontend-react\index.html",
  "frontend-react\src\App.jsx","frontend-react\src\index.css",
  "frontend-react\src\components\MapView.jsx","frontend-react\src\components\FlightForm.jsx","frontend-react\src\components\WeatherPopup.jsx","frontend-react\src\components\SigmetOverlay.jsx","frontend-react\src\components\NotamPanel.jsx",
  "frontend-react\src\services\api.js","frontend-react\src\services\nlpApi.js","frontend-react\src\styles\main.css",
  "frontend-react\tests\MapView.test.js","frontend-react\tests\FlightForm.test.js",

  "docs\architecture.pdf","docs\workflow.pdf","docs\demo-script.md",

  "scripts\start-all.sh","scripts\seed-data.js"
)

foreach ($f in $files) {
  New-Item -ItemType File -Force -Path "$Root\$f" | Out-Null
}

Write-Host "✅ Project scaffold created at $Root"
