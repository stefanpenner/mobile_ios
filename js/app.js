window.App = Ember.Application.create();

App.ApplicationController = Ember.Controller.extend();
App.ContactsController    = Ember.ArrayController.extend();
App.LeftController        = Ember.ArrayController.extend();
App.Services = {};

App.DeferredRecord = Ember.Mixin.create(Ember.Deferred, {
  isLoading: Em.computed.not('isLoaded'),

  resolve: function(data){
    this.set('isLoaded', true);
    this.setProperties(data);
  },

  hasErrors: Em.computed.bool('errors'),

  reject: function(request){
    this.set('isLoaded', true);
    this.set('errors', 'something when wrong');
  }
});

App.DeferredRecord.fromRemoteJson = function(resource, url){
  $.getJSON(url).then(function(data){
    if (data.data){
      data.content = data.data;
      delete data.data;
    }

    resource.resolve(data);
  }, function(errors){
    resource.reject(errors);
  });

  return resource;
};


App.User = Ember.Object.extend(App.DeferredRecord, {
  thumb_url: function(){
    var id = this.get('id')

    if ( id ) {
      return 'https://graph.facebook.com/' + id + '/picture';
    } else {
      return null;
    }
  }.property('id')
});


App.Services.Facebook = {
  didLogin: function(user){
    var user = App.Services.Facebook.fetchUser(user.userID);
    App.set('currentUser', user);
  },

  didLogout: function(response){
  },

  login: function(){
    return /* promise */;
  },

  access_token: null,
  fetchUser: function(id){
    var user = App.User.create();

    Facebook.user(id).then(function(data){
      user.content = data;
      user.resolve(user);
    }, function(result){
      user.reject({ message: result});
    });

    var url = 'https://graph.facebook.com/' + id;

    return user;
  },

  feedUrl: function(id){
    var url = 'https://graph.facebook.com/' + id + '/home?access_token=' + authResponse.accessToken;
    return url;
  }
};
App.Router.reopen({
  //location: 'history'
});

App.ApplicationRoute = Ember.Route.extend({
});

App.Router.map(function() {
  this.route('login');
  this.resource('feed', function(){
    this.route('new')
  });

  this.resource('messages', function(){
    this.route('new')
  });
});

App.FeedRoute = Ember.Route.extend({
  setupController: function(controller){
    var url = App.Services.Facebook.feedUrl('me');
    App.DeferredRecord.fromRemoteJson(controller, url);
  }
});

App.FeedController = Ember.ArrayController.extend(App.DeferredRecord)

App.IndexRoute = Ember.Route.extend({ });

App.PhotoEvent = Ember.Object.extend();

App.FeedController = Ember.ArrayController.extend(App.DeferredRecord);

App.contacts = App.ContactsController.create({
  content: [1,2,3,4,5]
})

App.groups = Ember.ArrayController.create({
  content: [
    Ember.ArrayController.create({
      name: 'Favorites',
      content: ['TEXT','TEXT','TEXT']
    }),

    Ember.ArrayController.create({
      name: 'Pages',
      content: ['TEXT','TEXT','TEXT']
    }),

    Ember.ArrayController.create({
      name: 'Groups',
      content: ['TEXT','TEXT','TEXT']
    })
  ]
});

App.ApplicationView = Ember.View.extend({
  didInsertElement: function(){ }
});

var Gesture = function(){};

App.LeftView   = Ember.View.extend({ 
  elementId: 'left',
  templateName: 'left'
});

App.ApplicationView = Ember.View.extend({
  didInsertElement: function(){
    centerWasInserted();
  }
});

App.RightView  = Ember.View.extend({
  elementId: 'right',
  templateName: 'right'
});

App.FeedEntryView = Ember.View.extend({
  templateName: 'feed_entry'
})

function animate(x){
  if(Ember.isEmpty(center)) { return }

  var t = x,

  transform = 'matrix3d('
  transform += 1 +','+ 0 +','+ 0 + ',' +0 + ',';
  transform += 0 +','+ 1 +','+ 0 + ',' +0 + ',';
  transform += 0 +','+ 0 +','+ 1 + ',' +0 + ',';
  transform += t +','+ 0 +','+ 0 + ',' +1 + ')';

  center[0].style.webkitTransform = transform;
}

var centerWasInserted = function(){
  window.center = $('#center');
  window.x = 0;
  window.down = false;
  window.offset = 0;

  Clock = Ember.Object.create({
    x: 0,
    xDidChange: function(){
      window.x = parseInt(this.get('x'), 10);
    }.observes('x')
  })

  step = function(){
    animate(x);
    webkitRequestAnimationFrame(step);
  };

  webkitRequestAnimationFrame(step);

  $('#center').bind('touchstart',function(e) {
    var center = $('#center');
    var targetLeft = center.offset().left;
    var touchLeft = e.originalEvent.touches[0].pageX;

    center.data('touchstart.offset.left', touchLeft - targetLeft);
  });

  $('#center').bind('touchend',function(e) {
    center.data('touchstart.offset.left', 0);
  });

  $(window).bind('mousewheel',function(e) {
    var originalEvent = e.originalEvent;
    var pageX = originalEvent.wheelDeltaX;
    var newX = pageX + center.data('mousewheel.deltaX') || 0;

    newX *= 0.25;
    center.data('mousewheel.deltaX', newX);

    window.x = x + newX * -1;
  });

  $('#center').bind('touchmove',function(e) {
    var originalEvent = e.originalEvent;
    var pageX = originalEvent.touches[0].pageX;
    var newX = pageX - center.data('touchstart.offset.left');
    var direction = x > newX ? 'left' : 'right';

    window.x = newX;
  });

  // prevent touchmove from scrolling unless within a scrollable
  $(window).bind('touchmove', function(e) {
    var target = $(e.target),
      isScrollable = target.closest('.scrollable').length > 0;

    if (isScrollable) {
      return true;
    }else{
      e.preventDefault();
    }
  });
};

$(function(){
  $(document.body).on('touchstart', '.scrollable', function(event){
    var target = $(event.target),
    scrollable = target.closest('.scrollable'),
    scrollFix = scrollable.data('scrollFix');

    if (!scrollFix) {
      scrollFix = new ScrollFix(scrollable[0], event.originalEvent);

      scrollable.data('scrollFix', scrollFix);
    }
  });
});

var ScrollFix = function(elem, event) {
  // Variables to track inputs
  var startY, startTopScroll,
  bouncyTouchStart = function(event){
    startY = event.touches[0].pageY;
    startTopScroll = elem.scrollTop;

    if(startTopScroll <= 0){
      elem.scrollTop = 1;
    }

    if(startTopScroll + elem.offsetHeight >= elem.scrollHeight) {
      elem.scrollTop = elem.scrollHeight - elem.offsetHeight - 1;
    }
  };

  elem.addEventListener('touchstart',  bouncyTouchStart, false);

  if(event){ bouncyTouchStart(event); }
};
