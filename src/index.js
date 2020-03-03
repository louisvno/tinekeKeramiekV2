import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './index.css';
import firebase from "firebase/app";
import "firebase/auth";

var config = {
  apiKey: "AIzaSyA73Vm2FHtcslUc0S9bDi4ZWS3JFxmJ-Cg",
  authDomain: "tinekekeramiek.firebaseapp.com",
  databaseURL: "https://tinekekeramiek.firebaseio.com",
  storageBucket: "tinekekeramiek.appspot.com",
  messagingSenderId: "550381963425"
  };
firebase.initializeApp(config);
var provider = new firebase.auth.GoogleAuthProvider();

firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    // User is signed in.
    ReactDOM.render(
      <App />,
      document.getElementById('root')
    );
  } else {
    // No user is signed in.
    firebase.auth().signInWithRedirect(provider);
  }
}); 

