import React, { Component } from 'react';
import './App.css';
import firebase from "firebase/app";
import PostList from "./List"
import Map, { fromJS } from "immutable"

import "firebase/auth";
import "firebase/database";

class App extends Component {
  constructor(props){
    super(props)
    this.state = {
      items: null,
      selectedItem : null,
      selectedItemThumbs: null,
      form:null,
    };

    this.handleSubmit = this.handleSubmit.bind(this);
    this.handlePostChange = this.handlePostChange.bind(this);
  }

  render() {
    return (
      <div className="App">

        {/*Post List*/}
        {this.state.items === null ? <div></div>
         :< PostList items={this.state.items} 
          
          onItemSelect={this.onItemSelect.bind(this)}
         />}

        {/* Form */}
        {this.state.items !== null && this.state.selectedItem !== null && this.state.form !== null?  
         <form onSubmit={this.handleSubmit}>
          <label>
            Title:
            <input type="text" value={this.state.form.get("title")} onChange={this.handlePostChange("title")} />
            <textarea value={this.state.form.get("text")} onChange={this.handlePostChange("text")} />
          </label>
          <label>Categorie
          <select name="post-category" id="post-category" 
            value={this.state.form.get("category")} 
            onChange={this.handlePostChange("category")}>
              <option value="default" disabled>Kies een categorie</option>
              <option value="dierfiguren">Dierfiguren</option>
              <option value="schalen">Schalen</option>
              <option value="anderwerk">Ander werk</option>
          </select>
          </label>
          {this.state.selectedItemThumbs !== null?
            < PostList items={this.state.selectedItemThumbs} 
            buttons={[{label:"delete"}]}
            buttonEvents={[this.deleteImage.bind(this)]}
            onItemSelect={this.onItemSelect.bind(this)}
            />: <div></div>
          }
          {this.addImageInputs()}
          <button type="button">Annuleren</button>
          <button type="submit" >Opslaan</button>
        </form>
          :<div></div>}
      </div>
    );
  }
  componentDidMount() {
    this.getAllPosts()
  }

  addImageInputs(){
    const inputs = [];
    if(this.state.selectedItemThumbs !== null && Object.keys(this.state.selectedItemThumbs).length < 4){

      const toGenerate = 4 - Object.keys(this.state.selectedItemThumbs).length;
      for (let index = 0; index < toGenerate; index++) {
        inputs.push(
          <input key={index} type="file" accept="image/*" onChange={this.handlePostChange.bind(this,"img"+index)}/>)
      }
    }
 
    return inputs;
  }

  handlePostChange(fieldName) {
    return (event)=>{
      const newState = this.state.form.set(fieldName,event.target.value);
      this.setState({form: newState})
    }
  }

  handleImageAdd(fieldName) {
    return (event)=>{
      const newState = this.state.form.set(fieldName,event.target.value);
      this.setState({form: newState})
    }
  }

  handleImageDelete(fieldName) {
    return (event)=>{
      const newState = this.state.form.set(fieldName,event.target.value);
      this.setState({form: newState})
    }
  }

  handleSubmit(event){
    event.preventDefault();
    this.updatePost(this.state.selectedItem,this.state.form.toJS());
  }

  onItemSelect(id){
    this.setState({selectedItem: id})
    /* 
    desired form structure:
    {
      post:{}
      addedImages: []
      removedImages: []
    }
    */
    //Add to form added images and deleted images entries
    this.setState({form: fromJS(this.state.items[id])})

    //move to onMount?
    this.getThumbsByPostId(id);
  }

  getThumbsByPostId(id) {
    this.queryThumbsByPostId(id).then((res) => {
      this.setState({ selectedItemThumbs: res.val() });
    });
  }

  onItemUpdate(){
    this.getAllPosts().then(res =>{
      this.setState({items:res.val()});
    }).catch(e=>{
    })
  }
  //Firebase Queries
  //This will compose update of post/thumbs/x500-1000
  updatePost(id,postData){
    let update={};
    //Check has Post update has deleted images? has new images?
    update[process.env.REACT_APP_postRoot+id]=postData;
    return firebase.database().ref().update(update);
  }

  //TODO do real delete on submit
  deleteImage(imgId){
    //delete image from storage
    const postId = this.state.selectedItem;
    //then
    let update={};
    //update post 
    //update[process.env.REACT_APP_postRoot + postId] = postData;
    //delete thumbnail
    update[process.env.REACT_APP_thumbsPath + postId + "/" + imgId] = null;
    //delete x500
    update[process.env.REACT_APP_imgx500path + postId + "/" + imgId]= null;
    //delete x1000
    update[process.env.REACT_APP_imgx1000path + postId + "/" + imgId]= null;
    console.log(update)
    firebase.database().ref().update(update).then(this.getThumbsByPostId(postId))
  }

  addImage(){
    //should still only allow 4 images
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

  queryThumbsByPostId(postId){
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
