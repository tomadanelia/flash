import React from 'react';
import PracticeView from './components/PracticeView';
import './App.css'; 

function App() {
  return (
    <div className="app-container">
      <h1>Flashcard Learner</h1>
      <PracticeView />
      {/* Later, I might add routing components here */}
    </div>
  );
}

export default App;
