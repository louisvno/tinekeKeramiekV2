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
import Fab from '@material-ui/core/Fab';
import AddIcon from '@material-ui/icons/Add';
import Hidden from '@material-ui/core/Hidden';
import AppBar from '@material-ui/core/AppBar';
import MenuIcon from '@material-ui/icons/Menu';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import { styled } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import ImgGrid from './ImgGrid';

// TODO check different login possibilities mobile firebase.auth().signInWithRedirect(provider);
// TODO remove hardcoded urls in imgUpload class
const drawerWidth = 200;
const drawerHeight = 64;
const PermDrawer = styled(Drawer)({
  backgroundColor: 'red',
});
const MyAppBar = styled(AppBar)(({
  theme
}) => ({
  [theme.breakpoints.up('sm')]:{
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: drawerWidth,
}}));
const MainBox = styled(Box)(({
  theme
}) => ({
  [theme.breakpoints.up('sm')]:{
    marginLeft: drawerWidth,
    
},marginTop: drawerHeight}));

class App extends Component {
  constructor(props){
    super(props)
    this.state = {
      items: null,
      selectedItem : null,
      selectedItemThumbs: null,
      form:null,
      selectedPost: null,
      running: Set(),
      complete: Set(),
      canSubmit: true,
      newPost: false,
      imgInputs: [],
      tempMenuOpen: false,
    
    };
 
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handlePostEdit = this.handlePostEdit.bind(this);
  }
  
  handleDrawerToggle() {
    this.setState({tempMenuOpen: !this.state.tempMenuOpen});
  };
 

  render() {

    return (
      <div className="App">
        <MyAppBar position="fixed">
        <Toolbar> 
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={this.handleDrawerToggle.bind(this)}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap>
            Admin tools
          </Typography>
          </Toolbar>
          </MyAppBar>
        <nav>
        <aside>
        {/* The implementation can be swapped with js to avoid SEO duplication of links. */}
          <Hidden  xsDown>
            <PermDrawer
              variant="permanent"
              open
            >
              <div id="list-container">
              {this.state.items === null ? <div></div> :< PostList items={this.state.items} 
                onItemSelect={this.onItemSelect.bind(this)}
              />}
              </div>
            </PermDrawer>
          </Hidden>
          <Hidden smUp implementation="css">
            <Drawer
              variant="temporary"
              open={this.state.tempMenuOpen}
              onClose={this.handleDrawerToggle.bind(this)}
            >
            <div id="list-container">
              {this.state.items === null ? <div></div> :< PostList items={this.state.items} 
                onItemSelect={this.onItemSelect.bind(this)}
              />}
            </div>
            </Drawer>
          </Hidden>
          </aside>
       </nav>
       <MainBox>
       <main>
        <Fab id="new-post-btn"  color="primary" aria-label="add" onClick={this.onPostCreate.bind(this)}>
          <AddIcon />
        </Fab>
        {/* Form */}
        {(this.state.items !== null &&
          this.state.selectedItem !== null &&
          this.state.form !== null) || this.state.newPost?  
         <form onSubmit={this.handleSubmit}>
          <div id="inputfield-container">
          <div id="title">
            <label>
              Titel:
            </label>
            <input type="text" value={this.state.form.get("title")} onChange={this.handlePostEdit("title")} />
          </div>
          <div id="description">
            <label>
              Beschrijving:
            </label>
            <textarea value={this.state.form.get("text")} onChange={this.handlePostEdit("text")} />
          </div>
          <div id="category">
            <label>Categorie: </label>
            <select name="post-category" id="post-category" 
              value={this.state.form.get("category")} 
              onChange={this.handlePostEdit("category")}>
                <option value="default" disabled>Kies een categorie</option>
                <option value="dierfiguren">Dierfiguren</option>
                <option value="schalen">Schalen</option>
                <option value="anderwerk">Ander werk</option>
            </select>
          </div>
          </div>
          {this.state.selectedItemThumbs !== null?
            < ImgGrid items={this.state.selectedItemThumbs} 
            button={{label:"verwijderen"}}
            buttonEvent={this.handleImageDelete.bind(this)}
            markedForDelete={this.state.form.get('removedImageIds').toJS()}
            />: <div></div>
          }
          <div class="input-container">
            {this.state.imgInputs}
          </div>
          <footer>
            <Button type="button" variant="outlined" onClick={this.undoChanges.bind(this)} color="secondary">Annuleren</Button>
            <Button type="submit" style={{ marginLeft: 20 }} variant="outlined" disabled={!this.state.canSubmit} color="primary">Opslaan</Button>
          </footer>
        </form>
          :<div></div>}
        </main>
        </MainBox>
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
        // TODO unsubscribe when changing post takeuntil
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

  addImageInputs(postId,number){
    const inputs = [];
    if(number){
      this.getInputs(number,inputs, postId);
    } else if(this.state.selectedItemThumbs !== null && Object.keys(this.state.selectedItemThumbs).length < 4){
      const toGenerate = 4 - Object.keys(this.state.selectedItemThumbs).length;
      this.getInputs(toGenerate, inputs, postId);
    }     
    this.setState({imgInputs: inputs});
  }

  getInputs(toGenerate, inputs, postId) {
    for (let index = 0; index < toGenerate; index++) {
      inputs.push(<ImgUpload key={index} postId={postId} uploadTaskListener={this.handleImgUploadTask.bind(this)} />);
    }
  }

  handlePostEdit(fieldName) {
    return (event)=>{
      const newFormState = this.state.form.set(fieldName,event.target.value);
      this.setState({form: newFormState})
    }
  }
  // TODO make toggle img delete
  handleImageDelete(id) {
    const newFormState = this.state.form.updateIn(['removedImageIds'], set => set.add(id));
    this.setState({form: newFormState});
  }

  handleSubmit(event){
    event.preventDefault();
    // update to title/ category /text/ removed imgs
    const postId = this.state.form.get('id');

    const dbUpdates = this.getPostUpdateStatement(this.state.form, postId); 

    const imgDeletes = this.state.form.get('removedImageIds');
    if(imgDeletes){
    const imgDeleteStatements = imgDeletes.map(imgId => 
      this.getDeleteImageStatements(imgId, postId)
    );

    imgDeleteStatements.forEach(statement =>{
      Object.entries(statement).forEach(([k,v]) => {
        dbUpdates[k] = v;
      })
    })
  }

    //img adds
    Promise.all(
      [this.mapCopyTempToRoot('/temp_test_thumbnails/', process.env.REACT_APP_thumbsPath,postId),
      this.mapCopyTempToRoot('/temp_test_x500Imgs/', process.env.REACT_APP_imgx500path,postId),
      this.mapCopyTempToRoot('/temp_test_x1000Imgs/', process.env.REACT_APP_imgx1000path,postId),
      this.mapCopyTempToRoot('/temp_test_sourceImgs/', process.env.REACT_APP_sourcePath,postId)]
      )  
    .then((res)=>{
      // do update
      res.forEach((items)=>{
        Object.entries(items).forEach(([k,v])=>{
          dbUpdates[k] = v;
        })
      })
      return firebase.database().ref().update(dbUpdates);   
    }).then(() =>{
      this.getPostById(this.state.form.get('id'))
      this.setState({selectedItemThumbs : null})
      this.onItemSelect(postId);
    })
  }

  // create a statement to copy from temp to root and to remove from temp
  mapCopyTempToRoot(tempRoot, root, postId){
    return new Promise(resolve =>{
      const obj ={};
      this.getImgsByPostKey(tempRoot, postId).then(
        (res) => {
          this.state.complete
          .filter(id => res.val().hasOwnProperty(id))
          .forEach(id => {
            obj[root + postId + '/' + id] = res.val()[id];
            obj[tempRoot + postId + '/' + id] = null;
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
       form: formModel,
       newPost: false,
       imgInputs: []
    })

    this.getThumbsByPostId(id).then((res)=>{
      if(res.val()) this.addImageInputs();
      else this.addImageInputs(4);
    })
  }

  onPostCreate(){
    const postId = firebase.database().ref().child(process.env.REACT_APP_postRoot).push().key;
    const formModel = fromJS({
      id: postId,
      text: "",
      title: "",
      category: "",
      newImages: List(),
    })
    
    this.setState(
      { selectedItem : null,
        selectedItemThumbs: null,
        form: formModel,
        selectedPost: null,
        running: Set(),
        complete: Set(),
        canSubmit: true,
        newPost: true,
       
    })
    this.addImageInputs(postId, 4);

  }

  getThumbsByPostId(id) {
    return this.queryThumbsByPostId(id).then((res) => {
      this.setState({ selectedItemThumbs: res.val() });
      return res;
    });
  }

  onItemUpdate(){
    this.getAllPosts().then(res =>{
      this.setState({items:res.val()});
    }).catch(e=>{
    })
  }

  getPostUpdateStatement(form, postId){
    let update={};
    // Nice to have: check if changed from initial state
    // title statement
    update[process.env.REACT_APP_postRoot + postId + "/title"] = form.get('title');
    // text
    update[process.env.REACT_APP_postRoot + postId + "/text"] = form.get('text');
    // category
    update[process.env.REACT_APP_postRoot + postId + "/category"] = form.get('category');
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
