
import PracticeView from './components/PracticeView';
import ProgressView from './components/ProgressView'; 
import './App.css'; 

function App() {
  return (
    <>
    <div>
      <h1>Flashcard Learner</h1>
      <PracticeView />
      {/* Later, I might add routing components here */}
      <ProgressView />
      {/* Other components can be added here */}
    </div>
    </>
  );
}

export default App;
