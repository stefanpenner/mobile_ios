window.App = Ember.Application.create();

App.ApplicationController = Ember.Controller.extend();
App.Contacts = Ember.ArrayController.extend();
App.Left     = Ember.ArrayController.extend();
App.Services = {};

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

  reject: function(errors){
    this.set('isLoaded', true);
    this.set('errors', errors);
    this._super(data);
  }
})

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

App.NewsFeed = Ember.ArrayController.extend(App.DeferredRecord);

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

App.contacts = App.Contacts.create({
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
  didInsertElement: function(){ ready(); }
});

var Gesture = function(){};
App.Surface = Ember.View.extend({
  templateName: '',
  enter: Em.K,
  exit: Em.K,
  influences: [ Gesture('swipeleft'), Gesture('swiperight') ]
});

App.LeftView   = App.Surface.extend({ templateName: 'left'   });
App.CenterView = App.Surface.extend({ templateName: 'center' });
App.RightView  = App.Surface.extend({ templateName: 'right'  });

function animate(x){
  if(!center) { return }
  var t = x,
  transform = 'matrix3d('
  transform += 1 +','+ 0 +','+ 0 + ',' +0 + ',';
  transform += 0 +','+ 1 +','+ 0 + ',' +0 + ',';
  transform += 0 +','+ 0 +','+ 1 + ',' +0 + ',';
  transform += t +','+ 0 +','+ 0 + ',' +1 + ')';

  center[0].style.webkitTransform = transform;
}

var ready = function(){
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

