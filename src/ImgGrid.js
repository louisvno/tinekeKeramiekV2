import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import DeleteRoundedIcon from '@material-ui/icons/DeleteRounded';
import Button from '@material-ui/core/Button';

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
  },
  thumbContainer: {
    position: 'relative',
    display: 'flex',
    flexDirection: "column",
  },
  thumbImg: {
    alignSelf: "center"
  },
  overlay: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    width: '100%',
    opacity: 0.5,
    backgroundColor: "white"
  }
}));

export default function ImgGrid(props) {
  const classes = useStyles();

  return (
    <div >
      <Grid container spacing={1}>
            {generateImages(props,classes)}
      </Grid>
    </div>
  );
}

function handlebuttonClick(e, id) {
    return function (){
        e(id)
    }
}
function generateImages(props,classes){
    const ids = Object.keys(props.items);
    return ids.map((id) =>
        <Grid key={id} item xs={6} md={3}>
            <div className={classes.thumbContainer}>
                <img className={classes.thumbImg} src={props.items[id].downloadUrl}/>
                {props.markedForDelete.indexOf(id) > -1 ?
                    <div className={classes.overlay}>
                    <DeleteRoundedIcon style={{ fontSize: 40 }}/>
                    </div>:
                null}
            </div>
                <Button key={props.button.label} 
                onClick={handlebuttonClick(props.buttonEvent,id)}>
                {props.button.label}
                </Button>
           
        </Grid>
  );
}