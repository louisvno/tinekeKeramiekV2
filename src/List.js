import React from 'react';
import Button from '@material-ui/core/Button';
import './List.css'
import DeleteRoundedIcon from '@material-ui/icons/DeleteRounded';// TODO add thumbnails
/**
 * {
 *  items: [{
 *      id:
 *      title:
 *      thumbnail:
 *  }]
 *  buttons: [{
 *      label:
 *      icon:
 *  }]
 * } 
 * 
 * Buttons are added to each list item
 */
const liStyle = {
  listStyleType : 'none',
  height: 'auto',
  display: 'flex',
  flexDirection: 'column'
}
const aStyle = {
  padding: '6px 12px 6px 12px',
  display: 'inline-block',
  boxSizing: 'border-box'
}
const ulStyle = {
  padding: '0px',
}

function ListItem(props) {
    function handleClick(e) {
        e.preventDefault();
        props.onItemSelect(props.id)
    }
    function handlebuttonClick(index) {
      return function (e){
        e.preventDefault();
        props.buttonEvents[index](props.id)
      }
    }
    const buttons = [];
    let content;

    if(props.buttons && props.buttons.length !== 0){
        for (let index = 0; index < props.buttons.length; index++) {
          buttons.push(<Button key={props.buttons[index].label} 
            onClick={handlebuttonClick(index)}>
            {props.buttons[index].label}
          </Button>)          
        }
    };

    if(props.item.downloadUrl) content = <div className="thumb-container">
      <img src={props.item.downloadUrl}/>
      {props.markedForDelete?
            <div class="overlay">
            <DeleteRoundedIcon style={{ fontSize: 40 }}/>
          </div>:null
      }
    </div>;
    if(props.item.title) content = <a style={aStyle} href="#" onClick={handleClick}>{props.item.title}</a>;

    return <li style={liStyle}>
      {content}
      {buttons}
    </li> ;
}

function PostList(props) {
  const ids = Object.keys(props.items);
  const listItems = ids.map((id) =>
    <ListItem key={id}
              id= {id}
              item={props.items[id]} 
              buttons = {props.buttons}
              buttonEvents= {props.buttonEvents}
              onItemSelect= {props.onItemSelect}
              markedForDelete={props.markedForDelete? props.markedForDelete.indexOf(id) > -1 :false}
              />
  );
 
  return (
    <ul style={ulStyle} class= {props.horizontal}
    >
      {listItems}
    </ul>
  );
}

export default PostList;