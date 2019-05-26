import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import WebGLAvailability from './WebGLAvailability';

if (WebGLAvailability.isWebGLAvailable()) {
  ReactDOM.render(<App />, document.getElementById('root'));
} else {
  var warning = WebGLAvailability.getWebGLErrorMessage();
  document.documentElement.appendChild(warning);
}

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
