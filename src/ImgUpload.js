import React, { Component } from 'react';
import firebase from "firebase/app";
import "firebase/database";
import "firebase/storage";
import { Line } from 'rc-progress';
import { Subject, Observable } from 'rxjs';
import { filter} from 'rxjs/operators';



class ImgUpload extends Component {
    constructor(props) {
      super(props);
      this.state = {
        progress: 0,
        taskState: null,
        task: null,
        imgUploadTaskState: new Subject(),
        thumbnailUrl: null
      }
      this.handleCancel = this.handleCancel.bind(this);
      this.handleRemove = this.handleRemove.bind(this);
      this.fileInput = React.createRef();
    }

    //remove after complete
    handleRemove(e){
      e.preventDefault();
      this.resetState();              
    }

    // cancel while in progress
    handleCancel(e){
      e.preventDefault();
      if(this.state.task){
        this.state.task.cancel();
      }
    }

    resetState(){
      // clear progress
      this.setState({
        progress: 0,
        taskState: null,
        task: null,
        imgUploadTaskState: new Subject(),
        thumbnailUrl: null
      })
      // clear img input only works for IE 11+
      this.fileInput.current.value = null;
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
      })
      
      //monitor upload process
      uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, // or 'state_changed'
        (snapshot) => {
          // running
          let progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          this.setState({progress:progress});
          this.onUploadStateChange({
            id: imgId, 
            state: uploadTask.snapshot.state
          })
        }, (error) =>{
          // canceled
          console.warn(error)
          this.state.imgUploadTaskState.error({id: imgId, state: uploadTask.snapshot.state, error:error})
          this.resetState();
        }, () => {
          // complete  
          // definition of complete: when the db temp_folders are updated by the function
          const waitForThumbnail =
            new Observable((sub)=>{
              const ref = firebase.database().ref("temp_test_thumbnails/" + this.props.postId);
              ref.on("value",(snapshot)=>{
                sub.next(snapshot.val()) 
                if (snapshot.val().hasOwnProperty(imgId)){
                  ref.off()
                  sub.complete()    
                }
              })
            });

          waitForThumbnail
            .pipe(
              filter(res => res.hasOwnProperty(imgId)),
            )
            .subscribe((res)=>{
              this.onUploadStateChange({id: imgId, state: 'complete', path:res.fullPath});
              this.setState({thumbnailUrl: res[imgId].downloadUrl})
              this.state.imgUploadTaskState.complete();
            })
        });
    }
  
    render() {
      return (
        <div>
          {this.state.thumbnailUrl? <img src={this.state.thumbnailUrl}></img> : 
          <div>
          <span>Afbeelding toevoegen: </span>
          <input ref={this.fileInput} type="file" accept="image/*" onChange={this.handleImageAdd.bind(this)}/>
          </div>
          }
          
          <Line percent={this.state.progress} strokeWidth="1" strokeColor="#12757d" />
          {this.state.taskState === firebase.storage.TaskState.RUNNING ? <button type="button" onClick={this.handleCancel}>Cancel</button> :''}
          {this.state.taskState === firebase.storage.TaskState.SUCCESS ? <button type="button" onClick={this.handleRemove}>Remove</button> :''}
        </div>
      );
    }  
  }
export default ImgUpload;