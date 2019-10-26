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
    //firebase.auth().signInWithPopup(provider).then(function(result) {
      //  initComponents();
      ReactDOM.render(
        <App />,
        document.getElementById('root')
      );
    /*}).catch(function(error) {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      // The email of the user's account used.
      var email = error.email;
      // The firebase.auth.AuthCredential type that was used.
      var credential = error.credential;
      // ...
    });*/

