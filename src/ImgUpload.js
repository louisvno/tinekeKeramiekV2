import React, { Component } from 'react';
import firebase from "firebase/app";
import "firebase/database";
import "firebase/storage";
import { Line } from 'rc-progress';
class ImgUpload extends Component {
    constructor(props) {
      super(props);
      this.state ={
        progress: 0,
        taskState: null,
        task: null
      }
      this.handleCancel = this.handleCancel.bind(this);
    }
  
    handleCancel(e){
      this.state.task.cancel();
    }

    onUploadStateChange(e){
      this.setState({taskState : e.state})
      //this.props.onUploadStateChange(e);
    }

    getStorageRef (folderName, fileName){ 
      return firebase.storage().ref().child(folderName + "/" + fileName);
    }
    
    handleImageAdd(event) {
      const img = event.target.files[0]
      //const newFormState = this.state.form.updateIn(['newImages'], list => list.push(img));
      // get an image id from the DB and set in queue
      const queueRef = firebase.database().ref('test_imageQueue/'+ this.props.postId);
      console.log(queueRef)
      const imgId = queueRef.push();
      // upload to storage using this id
      const storageRef = this.getStorageRef(this.props.postId + "/"+ imgId, img.name);
      const uploadTask = storageRef.put(img);
      this.setState({task: uploadTask})
      //monitor upload process
      uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, // or 'state_changed'
        (snapshot) => {
          // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
          let progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          this.setState({progress:progress});
          this.onUploadStateChange({id: imgId, state: uploadTask.snapshot.state})
        }, (error) =>{
          this.onUploadStateChange({id: imgId, state: uploadTask.snapshot.state})
        }, () => {
          this.onUploadStateChange({id: imgId, state: uploadTask.snapshot.state})
          /*queueRef.child(imgId).set({
            path: storageRef.fullPath,
            timeCreated: new Date()
          }).then(()=>{
            this.onComplete({postId: this.props.postId,
              imgId: imgId,
              path: storageRef.fullPath});
          });*/
        });
    
      // block submit while uploading
      // later when confirm move from queue to source db path  // this triggers the function
      // show progress to user
      // user is able to cancel
      // can have multiple in parallel
     
      //this.setState({form: newFormState});
    }
  
    render() {
      return (
        <div>
          <input type="file" accept="image/*" onChange={this.handleImageAdd.bind(this)}/>
          <Line percent={this.state.progress} strokeWidth="4" strokeColor="#D3D3D3" />
          {this.state.taskState === firebase.storage.TaskState.RUNNING ? <button onClick={this.handleCancel}>Cancel</button> :''}
        </div>
      );
    }  
  }
export default ImgUpload;