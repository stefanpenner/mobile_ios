function animate(x){
  var t = x,
  transform = 'matrix3d('
  transform += 1 +','+ 0 +','+ 0 + ',' +0 + ',';
  transform += 0 +','+ 1 +','+ 0 + ',' +0 + ',';
  transform += 0 +','+ 0 +','+ 1 + ',' +0 + ',';
  transform += t +','+ 0 +','+ 0 + ',' +1 + ')';

  center[0].style.webkitTransform = transform;
}

$(function(){
  window.center = $('#center');
  window.x = 0;
  window.down = false;
  window.offset = 0;

  window.App = Ember.Application.create();

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
});

