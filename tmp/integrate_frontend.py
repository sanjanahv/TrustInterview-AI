from pathlib import Path
app = Path('TrustInterview-AI/frontend/src/App.js')
legacy = app.with_name('LegacyApp.js')
if not legacy.exists():
    legacy.write_text(app.read_text(encoding='utf-8'), encoding='utf-8')
app.write_text('''import React from "react";
import ResearchInterview from "./pages/ResearchInterview";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  return <ErrorBoundary><ResearchInterview /></ErrorBoundary>;
}
''', encoding='utf-8')
print('Default React workflow integrated; legacy App preserved separately.')
