import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import firebase from "firebase/app";
import PostList from "./List"
import CardForm from "./CardForm"
import Map, { fromJS } from "immutable"

import "firebase/auth";
import "firebase/database";
import { resolve } from 'url';

class App extends Component {
  constructor(props){
    super(props)
    this.state = {
      items: null,
      selectedItem : null,
      form:null,
      formStates: []
    };
    this.handleSubmit = this.handleSubmit.bind(this);

  }
  render() {
    return (
      <div className="App">

        {/*Post List*/}
        {this.state.items === null ? <div></div>
         :< PostList items={this.state.items} 
          buttons={[{label:"delete"}]}
          onItemSelect={this.onItemSelect.bind(this)}
         />}

        {/* Form */}
        {this.state.items !== null && this.state.selectedItem !== null && this.state.form !== null?  
         <form onSubmit={this.handleSubmit}>
          <label>
            Title:
            <input type="text" value={this.state.form.get("title")} onChange={this.handleFormChange.bind(this,"title")} />
            <textarea value={this.state.form.get("text")} onChange={this.handleFormChange.bind(this,"text")} />
          </label>
          <label for="post-category">Categorie
          <select name="post-category" id="post-category" 
            value={this.state.form.get("category")} 
            onChange={this.handleFormChange.bind(this,"category")}>
              <option value="default" disabled>Kies een categorie</option>
              <option value="dierfiguren">Dierfiguren</option>
              <option value="schalen">Schalen</option>
              <option value="anderwerk">Ander werk</option>
          </select>
          </label>
          <input type="submit" value="Submit" />
        </form>
          :<div></div>}
      </div>
    );
  }
  componentDidMount() {
    this.getAllPosts()
  }
  handleFormChange(fieldName, event) {
    const newState = this.state.form.set(fieldName,event.target.value);
    this.setState({form: newState})
    //this.state.formStates.push(newState)
  }

  handleSubmit(event){
    event.preventDefault();
    this.updatePost(this.state.selectedItem,this.state.form.toJS());
  }

  onItemSelect(id){
    this.setState({selectedItem: id})
    this.setState({form: fromJS(this.state.items[id])})
    //this.setState({formStates:[fromJS(this.state.items[id])]})
  }

  onItemUpdate(){
    this.getAllPosts().then(res =>{
      this.setState({items:res.val()});
    }).catch(e=>{
    })
  }
  //Firebase Queries
  updatePost(id,postData){
    let update={};
    update[process.env.REACT_APP_postRoot+id]=postData;
    console.log(update)
    return firebase.database().ref().update(update);
  }
  getMostRecentPosts (limit){
    return firebase.database().ref(process.env.REACT_APP_postRoot).limitToLast(limit).once("value");
  } 

  getAllPosts (){
      firebase.database().ref(process.env.REACT_APP_postRoot).on("value", (snapshot)=>{
        this.setState({items: snapshot.val()});
      })
    
  } 

  getImgsByPostKey(folderName, postKey) {
    return firebase.database().ref("/" + folderName + "/" + postKey).once("value");
  }

  getPostsByCat(category){
    return firebase.database().ref(process.env.REACT_APP_postRoot).orderByChild("category").equalTo(category).once("value");
  }

  getPostById(id){
    return firebase.database().ref(process.env.REACT_APP_postRoot + id).once("value");
  }

  getThumbsByPostId(postId){
    return firebase.database().ref(process.env.REACT_APP_thumbsPath + "/" + postId).once("value");
  }

  getx500ByPostId(postId){
    return firebase.database().ref(process.env.REACT_APP_imgx500path +"/"+ postId).once("value");
  }

  getx500ById(postId,imgId){
    return firebase.database().ref(process.env.REACT_APP_imgx500path +"/"+ postId + "/" + imgId).once("value");
  }
  }

export default App;
