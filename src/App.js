import React, { Component } from 'react';
import './App.css';
import firebase from "firebase/app";
import PostList from "./List"
import Map, { fromJS, List,Set, toJS } from "immutable"

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
      selectedPost: null
    };

    this.handleSubmit = this.handleSubmit.bind(this);
    this.handlePostEdit = this.handlePostEdit.bind(this);
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
            <input type="text" value={this.state.form.get("title")} onChange={this.handlePostEdit("title")} />
            <textarea value={this.state.form.get("text")} onChange={this.handlePostEdit("text")} />
          </label>
          <label>Categorie
          <select name="post-category" id="post-category" 
            value={this.state.form.get("category")} 
            onChange={this.handlePostEdit("category")}>
              <option value="default" disabled>Kies een categorie</option>
              <option value="dierfiguren">Dierfiguren</option>
              <option value="schalen">Schalen</option>
              <option value="anderwerk">Ander werk</option>
          </select>
          </label>
          {this.state.selectedItemThumbs !== null?
            < PostList items={this.state.selectedItemThumbs} 
            buttons={[{label:"delete"}]}
            buttonEvents={[this.handleImageDelete.bind(this)]}
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
          <input key={index} type="file" accept="image/*" onChange={this.handleImageAdd.bind(this)}/>)
      }
    }
    return inputs;
  }

  handlePostEdit(fieldName) {
    return (event)=>{
      const newFormState = this.state.form.setIn(['post',fieldName],event.target.value);
      this.setState({form: newFormState})
    }
  }

  handleImageAdd(event) {
    const newFormState = this.state.form.updateIn(['newImages'], list => list.push(event.target.files[0]));
    this.setState({form: newFormState});
  }

  handleImageDelete(id) {
    const newFormState = this.state.form.updateIn(['removedImageIds'], set => set.add(id));
    this.setState({form: newFormState});
  }

  handleSubmit(event){
    event.preventDefault();
    let dbUpdates = this.mapFormToDBUpdates(this.state.form);
    console.log(dbUpdates)
    firebase.database().ref().update(dbUpdates);
    // TODO storage updates
  }

  onItemSelect(id){
    const post = this.state.items[id];
    this.setState({selectedItem: id})
    this.setState({selectedPost: this.state.items[id]})

    const formModel = fromJS({
      id: id,
      text: post.text,
      title: post.title,
      category: post.category,
      newImages: List(),
      removedImageIds: Set()
    })
    
    this.setState({form: formModel});
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

  mapFormToDBUpdates(form){
    const imgDeletes = form.get('removedImageIds');
    const dbUpdateStatement = this.getPostUpdateStatement(form);
    const imgDeleteStatements = imgDeletes.map(imgId => this.getDeleteImageStatements(imgId, this.state.form.get('id')));
    
    imgDeleteStatements.forEach(statement =>{
      Object.entries(statement).forEach(([k,v]) => {
        dbUpdateStatement[k] = v;
      })
    })

    return dbUpdateStatement;
  }

  mapFormToStorageUpdates(){
    //let imgAdds = this.state.form.get('newImages').map(imgId => this.addImage(imgId, this.state.form.id));
  }

  getPostUpdateStatement(form){
    let update={};
    const postImgs = this.state.selectedPost.images;
    // this is a bit shady to link the thumbnail to the image in the post
    let imgKeys ={};
    Object.entries(postImgs).map(([k,v]) => {
      imgKeys[v.storagePath.replace(/(\/)?([^\/]*)$/, `$1thumb_$2`) +".png"] = k;  
    })   
    form.get('removedImageIds')
      .map(id => this.state.selectedItemThumbs[id].path)
      .map(storagePath => imgKeys[storagePath])
      .map(node => update[process.env.REACT_APP_postRoot + form.get('id') + "/images/"+node]=null)

    // title statement
    update[process.env.REACT_APP_postRoot + form.get('id') + "/title"] = form.get('title');
    // text
    update[process.env.REACT_APP_postRoot + form.get('id') + "/text"] = form.get('text');
    // category
    update[process.env.REACT_APP_postRoot + form.get('id') + "/category"] = form.get('category');
    return update;
   }

  getDeleteImageStatements(imgId,postId){
    let update={};
    //delete thumbnail
    update[process.env.REACT_APP_thumbsPath + postId + "/" + imgId] = null;
    //delete x500
    update[process.env.REACT_APP_imgx500path + postId + "/" + imgId]= null;
    //delete x1000
    update[process.env.REACT_APP_imgx1000path + postId + "/" + imgId]= null;
    return update;
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
