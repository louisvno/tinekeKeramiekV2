import React from 'react';
// TODO add thumbnails
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

    if(props.buttons && props.buttons.length !== 0){
        for (let index = 0; index < props.buttons.length; index++) {
          buttons.push(<button key={props.buttons[index].label} 
            onClick={handlebuttonClick()}>
            {props.buttons[index].label}
          </button>)          
        }
    };

    return <li><img src={props.item.downloadUrl}/><a href="#" onClick={handleClick}>{props.item.title}</a>{buttons}</li> ;
}

function PostList(props) {
  const ids = Object.keys(props.items);
  const listItems = ids.map((id) =>
    <ListItem key={id}
              id= {id}
              item={props.items[id]} 
              buttons = {props.buttons}
              buttonEvents= {props.buttonEvents}
              onItemSelect= {props.onItemSelect}/>
  );
 
  return (
    <ul>
      {listItems}
    </ul>
  );
}

export default PostList;