import React, { Component } from 'react';
import './App.css';
import firebase from "firebase/app";
import PostList from "./List"
import ImgUpload from "./ImgUpload"
import Map, { fromJS, List,Set, toJS } from "immutable"

import "firebase/auth";
import "firebase/database";
import "firebase/storage";
import { strict } from 'assert';

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
          <ImgUpload key={index} 
          postId={this.state.form.get('id')}/>)
      }
    }
    return inputs;
  }

  handlePostEdit(fieldName) {
    return (event)=>{
      const newFormState = this.state.form.set(fieldName,event.target.value);
      this.setState({form: newFormState})
    }
  }

  /*handleImageAddhandleImageAdd(event) {
    const img = event.target.files[0]
    const newFormState = this.state.form.updateIn(['newImages'], list => list.push(img));
    // get an image id from the DB and set in queue
    const queueRef = firebase.database().ref('test_imageQueue/'+this.state.form.get('id'));
    const imgId = queueRef.push();
    // upload to storage using this id
    const storageRef = this.getStorageRef(this.state.form.get('id') + "/"+ imgId, img.name);
    const uploadTask = storageRef.put(img);
    //monitor upload process
    uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, // or 'state_changed'
      function(snapshot) {
        // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
        var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
      }, function(error) {

      // A full list of error codes is available at
      // https://firebase.google.com/docs/storage/web/handle-errors
      switch (error.code) {
        case 'storage/unauthorized':
          // User doesn't have permission to access the object
          break;

        case 'storage/canceled':
          // User canceled the upload
          break;

        case 'storage/unknown':
          // Unknown error occurred, inspect error.serverResponse
          break;
      }
    }, function() {
      queueRef.child(imgId).set({
        path: storageRef.fullPath,
        timeCreated: new Date()
      });
      // Upload completed successfully, now we can get the download URL
      uploadTask.snapshot.ref.getDownloadURL().then(function(downloadURL) {
        console.log('File available at', downloadURL);
      });
    });

    // block submit while uploading
    // later when confirm move from queue to source db path  // this triggers the function
    // show progress to user
    // user is able to cancel
    // can have multiple in parallel
   
    this.setState({form: newFormState});
  }*/

  handleImageDelete(id) {
    const newFormState = this.state.form.updateIn(['removedImageIds'], set => set.add(id));
    this.setState({form: newFormState});
  }

  handleSubmit(event){
    event.preventDefault();
    //const dbUpdates = this.mapFormToDBUpdates(this.state.form);
    //upload any new imgs
    //this.addNewImages(this.state.form)
      //  .then(()=> console.log("this.loading = false"));
    //update database with post updates and 
    //firebase.database().ref().update(dbUpdates);
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

  //Migration tool to add new sourcepath table for images
  migrate(){
    Object.entries(this.state.items).forEach(([postKey,v]) =>  this.setStoragePathsFromLegacyPost(postKey,v)
    .then((res)=> {
      return Promise.all(
        Object.keys(res).map(key =>{
          firebase.database().ref('test_sourceImgs/' + postKey +'/'+ Object.values(res[key])[0]).set({path: key});
        })
      )
    }));
  }

  setStoragePathsFromLegacyPost(id,post){
    const expectedPaths = this.getExpectedPaths(post);
    console.log(post)
    return Promise.all([
      this.getx500ByPostId(id),
      this.getx1000ByPostId(id),
      this.queryThumbsByPostId(id)])
      
    .then(([x500,x1000,thumbs]) => {
     
      Object.entries(x500.val()).forEach(([k,v])=>{
        const x500Src = v.path.replace(/(\/)?x500_([^\/]*)$/,`$1$2`);
        console.log(x500Src)
        if(expectedPaths[x500Src] && expectedPaths[x500Src].hasOwnProperty(v.path)){
          expectedPaths[x500Src][v.path] = k;
        } else {
          console.warn("Unexpected path: " + v.path)
        }
      })

      Object.entries(x1000.val()).forEach(([k,v])=>{
        const x1000Src = v.path.replace(/(\/)?x1000_([^\/]*)$/,`$1$2`);

        if(expectedPaths[x1000Src] && expectedPaths[x1000Src].hasOwnProperty(v.path)){
          expectedPaths[x1000Src][v.path] = k;
        } else {
          console.warn("Unexpected path: " + v.path)
        }
      })
      Object.entries(thumbs.val()).forEach(([k,v])=>{
        const thumbSrc = v.path.replace(/(\/)?thumb_([^\/]*).png$/,`$1$2`);

        if(expectedPaths[thumbSrc] && expectedPaths[thumbSrc].hasOwnProperty(v.path)){
          expectedPaths[thumbSrc][v.path] = k;
        } else {
          console.warn("Unexpected path: " + v.path)
        }
      })
      
      return expectedPaths;
    })
  }

  getExpectedPaths(post){
    const postImgs = post.images;
    let imgKeys ={};
    Object.entries(postImgs).map(([k,v]) => {
      imgKeys[v.storagePath] = {};
      imgKeys[v.storagePath][v.storagePath.replace(/(\/)?([^\/]*)$/, `$1thumb_$2`) +".png"]= null
      imgKeys[v.storagePath][v.storagePath.replace(/(\/)?([^\/]*)$/, `$1x500_$2`)] = null
      imgKeys[v.storagePath][v.storagePath.replace(/(\/)?([^\/]*)$/, `$1x1000_$2`) ]= null
    })
    return imgKeys;
  }

  getPostUpdateStatement(form){
    let update={};
    // Nice to have: check if changed from initial state
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
    //delete source
    update[process.env.REACT_APP_sourcepath + postId + "/" + imgId]= null;

    return update;
  }

  addNewImages(form){
    //should still only allow 4 images
    const imgAdds = form.get('newImages');

    return Promise.all(
      imgAdds.map((img) => this.getStorageRef(form.get('id'), img.name).put(img))
    )
  }

  getStorageRef (folderName, fileName){ 
    return firebase.storage().ref().child(folderName + "/" + fileName);
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
  getx1000ByPostId(postId){
    return firebase.database().ref(process.env.REACT_APP_imgx1000path +"/"+ postId).once("value");
  }

  getx500ById(postId,imgId){
    return firebase.database().ref(process.env.REACT_APP_imgx500path +"/"+ postId + "/" + imgId).once("value");
  }
  }

export default App;
