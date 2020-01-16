import React, { Component } from 'react';
import './App.css';
import firebase, { SDK_VERSION } from "firebase/app";
import PostList from "./List"
import ImgUpload from "./ImgUpload"
import { fromJS, List,Set } from "immutable"

import "firebase/auth";
import "firebase/database";
import "firebase/storage";
import {distinctUntilKeyChanged} from 'rxjs/operators';
import Button from '@material-ui/core/Button';
import Drawer from '@material-ui/core/Drawer';


class App extends Component {
  constructor(props){
    super(props)
    this.state = {
      items: null,
      selectedItem : null,
      selectedItemThumbs: null,
      form:null,
      selectedPost: null,
      m: null,
      running: Set(),
      complete: Set(),
      canSubmit: true,
    };

    this.handleSubmit = this.handleSubmit.bind(this);
    this.handlePostEdit = this.handlePostEdit.bind(this);
  }

  render() {
    return (
      <div className="App">
        <nav aria-label="mailbox folders">
        {/* The implementation can be swapped with js to avoid SEO duplication of links. */}
          <Drawer
            variant="persistent"
            anchor="left"
            open
          >
            <div id="list-container">
            {this.state.items === null ? <div></div> :< PostList items={this.state.items} 
              onItemSelect={this.onItemSelect.bind(this)}
            />}
            </div>
          </Drawer>
       </nav> 
       <main>
        {/* Form */}
        {this.state.items !== null && this.state.selectedItem !== null && this.state.form !== null?  
         <form onSubmit={this.handleSubmit}>
          <div id="title">
            <label>
              Title:
              <input type="text" value={this.state.form.get("title")} onChange={this.handlePostEdit("title")} />
            </label>
          </div>
          <div id="description">
            <label>
              Beschrijving:
              <textarea value={this.state.form.get("text")} onChange={this.handlePostEdit("text")} />
            </label>
          </div>
          <div id="category">
            <label>Categorie:
            <select name="post-category" id="post-category" 
              value={this.state.form.get("category")} 
              onChange={this.handlePostEdit("category")}>
                <option value="default" disabled>Kies een categorie</option>
                <option value="dierfiguren">Dierfiguren</option>
                <option value="schalen">Schalen</option>
                <option value="anderwerk">Ander werk</option>
            </select>
            </label>
          </div>

          {this.state.selectedItemThumbs !== null?
            < PostList items={this.state.selectedItemThumbs} 
            buttons={[{label:"verwijderen"}]}
            buttonEvents={[this.handleImageDelete.bind(this)]}
            onItemSelect={this.onItemSelect.bind(this)}
            horizontal="horizontal"
            />: <div></div>
          }
          {this.addImageInputs()}
          <footer>
            <Button type="button" onClick={this.undoChanges.bind(this)}>Annuleren</Button>
            <Button type="submit" disabled={!this.state.canSubmit}>Opslaan</Button>
          </footer>
        </form>
          :<div></div>}
        </main>
      </div>
    );
  }

  undoChanges(){
    this.setState({selectedItemThumbs: null})
    this.onItemSelect(this.state.selectedItem)
  }

  componentDidMount() {
    this.getAllPosts();
  }

  handleImgUploadTask(sub){
    sub.pipe(distinctUntilKeyChanged('state')).subscribe((task)=>{
      if(task.state === 'running'){
        this.setState({running: this.state.running.add(task.id)})
        // TODO unsubscribe when changing post
        this.checkSubmitState()
      }

      if(task.state === 'complete'){
        this.setState({running: this.state.running.remove(task.id),
          complete: this.state.complete.add(task.id)
        })
        this.checkSubmitState()
      }
    }, (task) => {
      this.setState({running: this.state.running.remove(task.id)})
      this.checkSubmitState()
    }
    ,()=>{
    })
  }

  checkSubmitState(){
    this.setState({canSubmit:this.state.running.size === 0 })
  }

  addImageInputs(){
    const inputs = [];
    if(this.state.selectedItemThumbs !== null && Object.keys(this.state.selectedItemThumbs).length < 4){

      const toGenerate = 4 - Object.keys(this.state.selectedItemThumbs).length;
      for (let index = 0; index < toGenerate; index++) {
        inputs.push(
          <ImgUpload 
          key={index} 
          postId={this.state.form.get('id')}
          uploadTaskListener = {this.handleImgUploadTask.bind(this)}
          />
        )
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

  handleImageDelete(id) {
    const newFormState = this.state.form.updateIn(['removedImageIds'], set => set.add(id));
    this.setState({form: newFormState});
  }

  handleSubmit(event){
    event.preventDefault();
    // update to title/ category /text/ removed imgs
    const dbUpdates = this.mapFormToDBUpdates(this.state.form);

    const imgDeletes = this.state.form.get('removedImageIds');
    const imgDeleteStatements = imgDeletes.map(imgId => this.getDeleteImageStatements(imgId, this.state.form.get('id')));

    imgDeleteStatements.forEach(statement =>{
      Object.entries(statement).forEach(([k,v]) => {
        dbUpdates[k] = v;
      })
    })

    //img adds
    Promise.all(
      [this.mapCopyTempToRoot('/temp_test_thumbnails/', process.env.REACT_APP_thumbsPath),
      this.mapCopyTempToRoot('/temp_test_x500Imgs/', process.env.REACT_APP_imgx500path),
      this.mapCopyTempToRoot('/temp_test_x1000Imgs/', process.env.REACT_APP_imgx1000path),
      this.mapCopyTempToRoot('/temp_test_sourceImgs/', process.env.REACT_APP_sourcePath)]
      )  
    .then((res)=>{
      // do update
      res.forEach((items)=>{
        Object.entries(items).forEach(([k,v])=>{
          dbUpdates[k] = v;
        })
      })
      console.info(dbUpdates)
      return firebase.database().ref().update(dbUpdates);   
    }).then(() =>{
      this.getPostById(this.state.form.get('id'))
      this.setState({selectedItemThumbs : null})
      this.getThumbsByPostId(this.state.form.get('id'))
    })
  }

  // create a statement to copy from temp to root and to remove from temp
  mapCopyTempToRoot(tempRoot, root){
    return new Promise(resolve =>{
      const obj ={};
      this.getImgsByPostKey(tempRoot, this.state.form.get('id')).then(
        (res) => {
          this.state.complete
          .filter(id => res.val().hasOwnProperty(id))
          .forEach(id => {
            obj[root + this.state.form.get('id') + '/' + id] = res.val()[id];
            obj[tempRoot + this.state.form.get('id') + '/' + id] = null;
          })

          resolve(obj)
        }
      )
    })  
  }

  onItemSelect(id){
    const post = this.state.items[id];
    const formModel = fromJS({
      id: id,
      text: post.text,
      title: post.title,
      category: post.category,
      newImages: List(),
      removedImageIds: Set()
    })
    
    this.setState(
      {selectedItem: id,
       selectedPost: this.state.items[id],
       running: Set(),
       complete: Set(),
       form: formModel
    })

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
    const dbUpdateStatement = this.getPostUpdateStatement(form);
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
    update[process.env.REACT_APP_sourcePath + postId + "/" + imgId]= null;

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
