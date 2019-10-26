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
    const buttons = [];

    if(props.buttons && props.buttons.length !== 0){
        props.buttons.forEach(button => {
            buttons.push(<button key={button.label}>{button.label}</button>)
        });
    };

    return <li><a href="#" onClick={handleClick}>{props.item.title}</a>{buttons}</li> ;
}

function PostList(props) {
  const ids = Object.keys(props.items);
  const listItems = ids.map((id) =>
    <ListItem key={id}
              id= {id}
              item={props.items[id]} 
              buttons = {props.buttons}
              onItemSelect= {props.onItemSelect}/>
  );
 
  return (
    <ul>
      {listItems}
    </ul>
  );
}

export default PostList;