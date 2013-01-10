/*global FB*/

String.prototype.format = function() {
  var args = arguments;
  return this.replace(/\{(\d+)\}/g, function(match, number) {
    return typeof args[number] !== 'undefined'
      ? args[number]
      : match
    ;
  });
};

var ONE_HOUR = 1000*60*60; //milliseconds
var ONE_DAY = 1000*60*60*24; //milliseconds
var ONE_WEEK = 1000*60*60*24*7; //milliseconds
var ONE_YEAR = 1000*60*60*24*365; //milliseconds
function ago(t){
  var d = new Date() - t;
  if(d<ONE_HOUR){
    return Math.round(d/(1000*60))+'m ago';
  }else if(d<ONE_DAY){
    return Math.round(d/ONE_HOUR)+'h ago';
  }else{
    return Math.round(d/ONE_DAY)+'d ago';
  }
}

var Friends = {};
function getFriends(clearCache, cb){
  var f = window.localStorage.getItem('friends');
  if(f && !clearCache){
    Friends = JSON.parse(f);
    cb();
    return;
  }
  FB.api('/me/friends?fields=id,name', function(r){
    if(r.data){
      r.data.forEach(function(x){
        Friends[x.id] = x.name;
      });
      window.localStorage.setItem('friends', JSON.stringify(Friends));
      cb();
    }
  });
}

function displayStatuses(r, fql){
  var t = $('<table>');
  t.append('<tr><td width=200>Name</td><td width=100>Time</td><td>Status</td></tr>');
  if(fql){
    console.log(r.length+"results");
    r.forEach(function(x){
      t.append('<tr><td>{0}</td><td>{1}</td><td>{2}</td></tr>'.format(
        Friends[x.actor_id],
        ago(new Date(Number(x.created_time))*1000),
        x.message
      ));
    });
    $('#content_area').html(t);
    return true;
  }else{
    if(r.data){
      r.data.forEach(function(x){
        if(x.from){
          t.append('<tr><td>{0}</td><td>{1}</td><td>{2}</td></tr>'.format(
            x.from.name,
            ago(new Date(x.created_time)),
            x.message || x.story
          ));
        }
      });
      $('#content_area').html(t);
      return true;
    }else{
      $('#content_area').html(
        'Something went wrong <a id=reload href="#">Reload</a>'
      );
    }
  }
}

function loadStatuses(){
  var cached = localStorage.getItem('cachedStatuses');
  if(cached){
    console.log("Loading from cache");
    displayStatuses(JSON.parse(cached), true);
  }else{
    $('#content_area').html('Loading facebook statuses...');
  }
//  FB.api('/me/home?limit=100', function(r){
//    if(displayStatuses(r)){
//      window.localStorage.setItem('cachedStatuses', JSON.stringify(r));
//    }
//  });
  FB.api(
    {
      method: 'fql.query',
      query: "SELECT actor_id, created_time, message FROM stream WHERE filter_key in (SELECT filter_key FROM stream_filter WHERE uid=me() AND type='newsfeed') ORDER BY created_time DESC LIMIT 500 OFFSET 0"
    },
    function(data) {
      console.log(data);
      if(displayStatuses(data, true)){
        window.localStorage.setItem('cachedStatuses', JSON.stringify(data));
      }
    }
  );
}

function start(){
  $('#user_area').html('Logging in...');
  FB.api('/me', function(r){
    $('#user_area').html('Welcome '+r.name);
  });
  getFriends(false, function(){
    loadStatuses();
  });
}


$(function(){
  $('#fblogin').click(function(e){
    e.preventDefault();
    FB.login(function(resp){
      if(resp.authResponse){
        //do nothing, the event callback handles everything
      }
    }, {scope:'read_stream'});
  });

  $('body').on('click', '#reload', function(e){
    e.preventDefault();
    loadStatuses();
  });
});
