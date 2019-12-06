import React, { Component } from 'react';
import firebase from "firebase/app";
import "firebase/database";
import "firebase/storage";
import { Line } from 'rc-progress';
import { Subject } from 'rxjs';

class ImgUpload extends Component {
    constructor(props) {
      super(props);
      this.state = {
        progress: 0,
        taskState: null,
        task: null,
        imgUploadTaskState: new Subject(),
        queueRef: null
      }
      this.handleCancel = this.handleCancel.bind(this);
      this.fileInput = React.createRef();
    }

    //remove after complete
    handleRemove(){
      // remove from DB quueueu then
      this.state.queueRef.remove();
      this.setState(
        {progress: 0,
        taskState: null,
        task: null,
        imgUploadTaskState: new Subject()})
              
    }

    // cancel while in progress
    handleCancel(e){
      if(this.state.task){
        this.state.task.cancel();
        // clear progress
        this.setState(
          {progress: 0,
          })
        // clear img input only works for IE 11+
        this.fileInput.current.value = null;
      }
    }

    handleError(e){
      if(this.state.task){
        // clear progress
        this.setState(
          {progress: 0})
      }
    }

    onUploadStateChange(e){
      this.setState({taskState : e.state})
      this.state.imgUploadTaskState.next(e)
    }

    getStorageRef (folderName, fileName){ 
      return firebase.storage().ref().child(folderName + "/" + fileName);
    }
    
    handleImageAdd(event) {
      if(this.state.imgUploadTaskState.isStopped) {
        let sub = new Subject();
        this.setState({imgUploadTaskState : sub})
        this.props.uploadTaskListener(sub);
      } 
      else this.props.uploadTaskListener(this.state.imgUploadTaskState);

      // start notifying observers
      const img = event.target.files[0];

      // get an image id from the DB and set in queue
      const queueRef = firebase.database().ref('test_imageQueue/'+ this.props.postId);
      const imgId = queueRef.push().key;

      // upload to storage using this id
      const storageRef = this.getStorageRef(this.props.postId + "/"+ imgId, img.name);
      const uploadTask = storageRef.put(img);
      this.setState({
        task: uploadTask,
        queueRef: queueRef
      })
      
      //monitor upload process
      uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, // or 'state_changed'
        (snapshot) => {
          // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
          let progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          this.setState({progress:progress});
          this.onUploadStateChange({
            id: imgId, 
            state: uploadTask.snapshot.state
          })
        }, (error) =>{
          this.onUploadStateChange({id: imgId, state: uploadTask.snapshot.state, error:error})
          this.state.imgUploadTaskState.error({id: imgId, state: uploadTask.snapshot.state, error:error})
        }, () => {
          //on complete      
          queueRef.child(imgId).set({
            path: storageRef.fullPath,
            timeCreated: new Date()
          }).then(
            ()=> {
              this.onUploadStateChange({id: imgId, state: uploadTask.snapshot.state, path:storageRef.fullPath})
              this.state.imgUploadTaskState.complete()
            }
          ).catch(error => 
            this.state.imgUploadTaskState.error(
              {id: imgId, 
              state: uploadTask.snapshot.state, 
              error:error})
          );
        });
    }
  
    render() {
      return (
        <div>
          <input ref={this.fileInput} type="file" accept="image/*" onChange={this.handleImageAdd.bind(this)}/>
          <Line percent={this.state.progress} strokeWidth="1" strokeColor="#12757d" />
          {this.state.taskState === firebase.storage.TaskState.RUNNING ? <button onClick={this.handleCancel}>Cancel</button> :''}
          {this.state.taskState === firebase.storage.TaskState.SUCCESS ? <button onClick={this.handleRemove}>Remove</button> :''}
        </div>
      );
    }  
  }
export default ImgUpload;