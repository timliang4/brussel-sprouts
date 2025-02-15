import './App.css';
import {useState} from 'react'
import DrawingComponent from './DrawingCanvas';


function App() {
  const [resetKey, setResetKey] = useState(0)
  const [numCrosses, setNumCrosses] = useState("2")

  const handleReset = () => {
    setResetKey(resetKey => resetKey + 1);
  };

  return (
    <div className="App">
      <h1>Brussel Sprouts</h1>
      <p>A variation of Sprouts, a game invented by <a href="https://en.wikipedia.org/wiki/John_Horton_Conway" target="_blank">John Horton Conway</a>.</p>
      <p><b>Rules:</b> 2 players take turns drawing a line between 2 dots. The line may not touch or cross itself or any other line. The player who makes the last possible move wins.</p>
      <button onClick={handleReset}>Reset</button>
      <span>   </span>
      <select value={numCrosses} onChange={e => {setNumCrosses(e.target.value); handleReset()}}>
        <option value="1">1 Cross</option>
        <option value="2">2 Crosses</option>
        <option value="3">3 Crosses</option>
        <option value="4">4 Crosses</option>
      </select>
      <DrawingComponent key={resetKey} numCrosses={parseInt(numCrosses)}></DrawingComponent>
    </div>
  );
}

export default App;
