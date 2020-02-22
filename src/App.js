import React from 'react';
import logo from './logo.svg';
import './App.css';
import {
  BrowserRouter as Router,
  Switch,
  Route
} from "react-router-dom";

import Home from './pages/Home/home';
import Hooks from './pages/Hooks/hooks';
import Shedules from './pages/Shedules/shedues';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <div className="App-header-content">
          <img src={logo} className="App-logo" alt="logo" />
            <h1>Менеджер расписания</h1>
          <img src={logo} className="App-logo right" alt="logo" />
        </div>
      </header>
      <Router>
        <Switch>
          <Route path="/">
            <Home />
          </Route>
          <Route path="/home">
            <Home />
          </Route>
          <Route path="/hooks">
            <Hooks />
          </Route>
          <Route path="/shedules">
            <Shedules />
          </Route>
        </Switch>
      </Router>
    </div>
  );
}

export default App;
