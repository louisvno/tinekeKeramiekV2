import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import DeleteRoundedIcon from '@material-ui/icons/DeleteRounded';
import Button from '@material-ui/core/Button';

/*const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
  },
}));*/

export default function ImgGrid(props) {
  //const classes = useStyles();

  return (
    <div >
      <Grid container spacing={1}>
            {generateImages(props)}
      </Grid>
    </div>
  );
}

function handlebuttonClick(e, id) {
    return function (){
        e(id)
    }
}
function generateImages(props){
    const ids = Object.keys(props.items);
    return ids.map((id) =>
        <Grid key={id} item xs={6} md={3}>
            <img src={props.items[id].downloadUrl}/>
            {props.markedForDelete.indexOf(id) > -1 ?
                <div class="overlay">
                <DeleteRoundedIcon style={{ fontSize: 40 }}/>
                </div>:
            null}
            <Button key={props.button.label} 
            onClick={handlebuttonClick(props.buttonEvent,id)}>
            {props.button.label}
            </Button>
        </Grid>
  );
}