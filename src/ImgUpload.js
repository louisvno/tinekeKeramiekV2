import React, { Component } from 'react';
import firebase from "firebase/app";
import "firebase/database";
import "firebase/storage";
import { Line } from 'rc-progress';
class ImgUpload extends Component {
    constructor(props) {
      super(props);
      this.state ={
        progress: 0
      }
    }
  
    onError(message){
      this.props.onError(message);
    }

    onComplete(imgData){
      this.props.onComplete(imgData);
    }

    onStart(imgData){
      this.props.onComplete(imgData);
    }
    getStorageRef (folderName, fileName){ 
      return firebase.storage().ref().child(folderName + "/" + fileName);
    }
    handleImageAdd(event) {
      const img = event.target.files[0]
      //const newFormState = this.state.form.updateIn(['newImages'], list => list.push(img));
      // get an image id from the DB and set in queue
      const queueRef = firebase.database().ref('test_imageQueue/'+ this.props.postId);
      const imgId = queueRef.push();
      // upload to storage using this id
      const storageRef = this.getStorageRef(this.props.postId + "/"+ imgId, img.name);
      const uploadTask = storageRef.put(img);
      //monitor upload process
      uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, // or 'state_changed'
        (snapshot) => {
          // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
          var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          this.setState({progress:progress});
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
        </div>
      );
    }  
  }
export default ImgUpload;