window.App = Ember.Application.create({
  autoinit: false,
});

App.router = Ember.Router.create({
  root: Ember.Route.extend({
    index: Ember.Route.extend({
      route: '/',
      connectOutlets: function(router){
        var applicationController = router.get('applicationController')

        applicationController.connectOutlet({
          outletName: 'centerView',
          name: 'center'
        });

        applicationController.connectOutlet({
          outletName: 'rightrView',
          name: 'right'
        });

        applicationController.connectOutlet({
          outletName: 'leftView',
          name: 'left'
        });
      }
    })
  })
});

App.ApplicationController = Ember.Controller.extend();
App.ContactsController    = Ember.ArrayController.extend();
App.LeftController        = Ember.ArrayController.extend();
App.Services = {};

App.PhotoEvent = Ember.Object.extend();

// We could make facebook ember-data adapter, but this seemed good enough
App.DeferredRecord = Ember.Mixin.create(Ember.Deferred, {
  init: function(){
    this._super();
  },

  isLoading: Em.computed.not('isLoaded'),

  resolve: function(data){
    this.set('isLoaded', true);
    this.setProperties(data);
    this._super(data);
  },

  hasErrors: Em.computed.bool('errors'),

  reject: function(request){
    var error = $.parseJSON(request.responseText).error;
    this.set('isLoaded', true);
    this.set('errors', error.message);
    this._super(error);
  }
});

App.DeferredRecord.fromRemoteJson = function(resourceClass, url, mappings){
  var resource = resourceClass.create();

  $.getJSON(url).then(function(data){

    // edgecase, which should be pulled into some mappins imp
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

App.NewsFeedEntry = Ember.ObjectProxy.extend({
  user: null,
})

App.NewsFeed = Ember.ArrayController.extend(App.DeferredRecord,{
  objectAt: function(id){
    var content = this._super(id),
    type = content.type;
    var user = App.User.create(content.from || {});

    delete content.from;

    // We will decorate based on type
    var entry = App.NewsFeedEntry.create({
      content: content,
      user: user
    });

    return entry;
  }
});

App.Services.Facebook = {
  access_token: /* ... snip ...*/,
  fetchUser: function(id){
    var url = 'https://graph.facebook.com/' + id;

    return App.DeferredRecord.fromRemoteJson(App.User, url);
  },

  fetchFeed: function(id){
    var url = 'https://graph.facebook.com/' + id + '/home?access_token=' + this.access_token;

    return App.DeferredRecord.fromRemoteJson(App.NewsFeed, url);
  }
};

App.newsFeed    = App.Services.Facebook.fetchFeed('stefanpenner')
App.currentUser = App.Services.Facebook.fetchUser('stefanpenner')

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
App.Surface = Ember.View.extend({
  templateName: '',
  enter: Em.K,
  exit: Em.K,
  influences: [ Gesture('swipeleft'), Gesture('swiperight') ]
});

App.LeftView   = App.Surface.extend({ 
  elementId: 'left',
  templateName: 'left'
});

App.CenterView = App.Surface.extend({
  elementId: 'center',
  templateName: 'center',
  didInsertElement: function(){
    centerWasInserted();
  }
});

App.RightView  = App.Surface.extend({
  elementId: 'right',
  templateName: 'right'
});

App.FeedEntryView = Ember.View.extend({
  templateName: 'feed_entry'
})

function animate(x){
  if(Ember.empty(center)) { return }

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

  $(window).bind('touchmove', function(e){
    var target = $(e.target),
    isScrollable = target.closest('.scrollable').length > 0;

    if(isScrollable){
      return true;
    }else{
      e.preventDefault();
    }
  });
};

$(function(){
  App.initialize(App.router);
});
