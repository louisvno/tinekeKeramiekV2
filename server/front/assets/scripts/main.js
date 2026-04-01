initApp();
const imageResolutionPrefixes = ['x500_', 'x1000_'];

function initApp(){
  this.app = new App();
  dispatcher();
};
var $grid;
function initMasonry(){
    $grid=$('.grid').masonry({
        itemSelector: '.grid-item', // use a separate class for itemSelector, other than .col-
        columnWidth: '.grid-sizer',
        percentPosition: true,
        horizontalOrder: true
    });
 
}
function subscribeToImageLoaded(){
    $grid.imagesLoaded().progress( function() {
        $grid.masonry('layout');
      });
}
//Component class
//@param render: function (optional), renders component to screen
//@param id: string, HTML id
//@param async: boolean, if loaded async
//@param wait: boolean, if component has to wait for others rendering
function Component (render,id,async,wait,displayMode){
    this.render = render;
    this.id = id;
    this.async = async;
    this.wait = wait;
    this.displayMode=displayMode;
    
    this.show =function (){ 
      document.getElementById(this.id).style.display = this.displayMode;
    }
}

function App(){
      this.postPath = "/posts/";
      this.imgx500path = "x500Imgs";
      this.thumbsPath = "thumbnails"
//    this.postPath = "/test_posts/";
//    this.imgx500path = "test_x500Imgs";
//    this.thumbsPath = "test_thumbnails"
    this.views = [{
          pathName: "/",
          components: [new Component(null,"intro",false,false,"block"),
          new Component(loadPostCardsAsync.bind(null,getMostRecentPosts.bind(null,12)),"main-gallery",true,false,"block"),
                       new Component(null,"footer",false,true,"block")]
        },{
          pathName: "/index.html",
          components: [new Component(null,"intro",false,false,"block"),new Component(loadPostCardsAsync.bind(null,getMostRecentPosts.bind(null,12)),"main-gallery",true,false,"block"),
                       new Component(null,"footer",false,true,"block")]
        },{
          pathName: "/info",
          components: [new Component(null,"about-me",false,false,"block"),
                       new Component(null,"footer",false,true,"block")]
        },{
          pathName: "/werk/schalen",
          components: [new Component(loadPostCardsAsync.bind(null,getPostsByCat.bind(null,"schalen")),"main-gallery",true,false,"block"),
                      new Component(null,"footer",false,true,"block")]
        },{
          pathName: "/werk/dierfiguren",
          components:[new Component(loadPostCardsAsync.bind(null,getPostsByCat.bind(null,"dierfiguren")),"main-gallery",true,false,"block"),
                       new Component(null,"footer",false,true,"block")]
        },{
          pathName: "/werk/anderwerk",
          components:[new Component(loadPostCardsAsync.bind(null,getPostsByCat.bind(null,"anderwerk")),"main-gallery",true,false,"block"),
                      new Component(null,"footer",false,true,"block")]
        },{
          pathName: "/werk/{category}/{postId}",
          components:[new Component(loadPostDetails,"work-details",true,false,"block"),
                      new Component(loadThumbs,"thumb-container",true,false,"inline-block"),
                      new Component(loadPostImg,"highlighted",true,false,"inline-block"),
                      new Component(null,"footer",false,true,"block")]
        }
     ];
     
     //general view renderfunction
     this.renderView = function(view) {
        var queue = [];
        var asyncP = [];
        this.clearView();
        //Control rendering order based on component properties "wait" and "async"
        for (var i = 0; i < view.components.length; i++) {
          var component = view.components[i];

          if (component.async) {
              asyncP.push(component.render());
              component.show();
          } else if (!component.async && !component.wait) {
              if(component.render){
                component.render();
                component.show();
              }else component.show();
          } else {
              if(component.render) queue.push(component.render());
              else queue.push(component);
          }
        }
        //queue executes after all async components are rendered
        Promise.all(asyncP).then(function() {
          queue.forEach(function(comp) {
            comp.show();
          });
        })
      };
      
     this.clearView = function(){
        var components = document.getElementsByClassName("component");
          for(var i=0; i < components.length; i++){
              components[i].style.display = "none";
          } 
     };

 }
 
//Event handlers
document.getElementById("main-gallery").addEventListener("click", function(e){
    if(e.target.tagName.toLowerCase() === 'a'){
      e.preventDefault();
      window.history.pushState(null,"",e.target.pathname); 
      dispatcher();  
    }
});

document.getElementById("nav-menu").addEventListener("click", function(e){
    if(e.target.tagName.toLowerCase() === 'a'){
      e.preventDefault();
      window.history.pushState(null,"",e.target.pathname); 
      dispatcher();  
    }
});

document.getElementById("thumb-container").addEventListener("click", function(e){
    if(e.target.hasAttribute('data-img-id')){
       var imgId = e.target.getAttribute('data-img-id');
       var postId = window.location.pathname.split("/").pop();
       var loader = document.querySelector('.loader');
       loader.style.display= 'inline-block';
       loader.classList.add('spin');
       getx500ById(postId, imgId).then(function(data){
          var imgObj = data;
          document.getElementById('highlighted').setAttribute('src',imgObj.downloadUrl);
       })
    }
});

document.getElementById('highlighted').addEventListener("load", function(e){
      var loader = document.querySelector('.loader');
      loader.style.display= 'none';
      loader.classList.remove('spin');
});

document.getElementById("up-button").addEventListener("click", function(e){
    $('html, body').animate({ scrollTop: 0 }, 'fast');
})
//when user uses forward of backward button of browser
window.onpopstate = function(event) {
  dispatcher();
};

function getPathName (){
    var pathName = window.location.pathname.split("/");
    switch (pathName.length) {
        case 1 :
            return pathName.pop();
        case 2 : 
            return pathName.pop();
        case 3 : 
            pathName.splice(2,0,"/");
            return pathName.reduce(function(str1,str2){
               return  str1 + str2;
            },"");
        case 4: 
            pathName.splice(2,2,"/{category}/","{postId}");
            return pathName.reduce(function(str1,str2){
               return  str1 + str2;
            },"");
    }
}

function dispatcher() {
  var pathName = getPathName();
  var v = app.views.filter(function(view) {
    return view.pathName == ("/"+ pathName);
  })
	if (v != null && v.length == 1){
  	app.renderView(v[0]);
    $('html,body').scrollTop(0);
  }else if (v != null && v.length >1){
  	throw new Error ("path could not be resolved: path duplicate");
  } else {
  	throw new Error ("path could not be resolved: does not exist");
  } 
}

function renderPostCards(posts){
    var template = document.getElementById("gallery-temp").innerHTML;
    var renderTmpl = Handlebars.compile(template);
    var html = renderTmpl(posts);
    var wrapper = document.querySelector(".post-wrapper");
    
    if (wrapper == null){
      wrapper = document.createElement('div');
      wrapper.classList.add('post-wrapper');
    }
    
    wrapper.innerHTML = html;   
    document.getElementById('main-gallery').appendChild(wrapper);
    initMasonry();
}

function loadPostCardsAsync(postQuery) { 
    var dataModel = {};
    return postQuery()
        .then(function (posts){
            var allPosts = posts;
            var keys = Object.keys(allPosts).reverse();
            let sortedPosts = {};
            keys.forEach(key => sortedPosts[key] = allPosts[key]);

            keys.forEach(postKey => {
                const imgKeys = Object.keys(sortedPosts[postKey].images);
                imgKeys.forEach(imgKey => {
                    sortedPosts[postKey].images[imgKey].storagePath = encodeURI(sortedPosts[postKey].images[imgKey].storagePath)
                });
            });
            dataModel.posts = sortedPosts;
                console.log(sortedPosts)
            renderPostCards(dataModel);
            subscribeToImageLoaded();

            return dataModel;
        }).catch(function(error){console.log(error)}) ;
}

function loadPostDetails (){
    var postId = window.location.pathname.split("/").pop();
    return getPostById(postId).then(function(data){
       var post = data;
       document.getElementById("post-details-title").innerHTML=post.title;
       document.getElementById("post-details-desc").innerHTML=post.text;
    });
}

function loadPostImg(){
    var postId = window.location.pathname.split("/").pop();
    return getx500ByPostId(postId).then(function(data){
        data.forEach(function(img){
            document.getElementById("highlighted").src = img.downloadUrl;
            return true;
        })
      
    });
}
//TODO thumbs should have img x500 id
function loadThumbs(postId){
  var postId = window.location.pathname.split("/").pop();
   
  return getThumbsByPostId(postId).then(function(data){
                  console.log(thumbnail)

          var container=document.getElementById("thumb-container");
          container.innerHTML = "";
          data.forEach(function(thumbnail){
              console.log(thumbnail)
              var thumb = thumbnail;      
              var myImg = new Image(150, 150);
              myImg.src = thumb.downloadUrl;
              myImg.setAttribute('data-img-id', thumbnail.imgId);
              myImg.classList.add("work-thumbnail");
              container.appendChild(myImg);
          });
      });
}

//API Queries
function getMostRecentPosts(limit){
   return fetch(`/api/posts/recent/${limit}`)
        .then(res => res.json())
        .then(data => data.data);
} 

function getsByPostKey(postId) {
   return fetch(`/api/images/post/${postId}`)
        .then(res => res.json())
        .then(data => data.data);
}

function getPostsByCat(category){
   return fetch(`/api/posts/category/${category}`)
        .then(res => res.json())
        .then(data => data.data);
}

function getPostById(id){
   return fetch(`/api/posts/${id}`)
        .then(res => res.json())
        .then(data => data.data);
}

function getThumbsByPostId(postId){
   return fetch(`/api/images/post/${postId}`)
        .then(res => res.json())
        .then(data => data.data);
}

function getx500ByPostId(postId){
   return fetch(`/api/images/post/${postId}`)
        .then(res => res.json())
        .then(data => data.data);
}

function getx500ById(postId, imgId){
   return fetch(`/api/images/${postId}/${imgId}`)
        .then(res => res.json())
        .then(data => data.data);
}
