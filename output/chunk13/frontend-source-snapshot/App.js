import React from "react";
import ResearchInterview from "./pages/ResearchInterview";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  return <ErrorBoundary><ResearchInterview /></ErrorBoundary>;
}
