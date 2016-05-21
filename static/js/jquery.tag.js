(function(){
  var tags = {};

  $.extend({
    defineTagOnce: defineTagOnce,
    defineTag: function(name,src,version){
      if( hasTag(name) )
        throw new Error();
      return defineTag(name,src,version);
    }
  });

  $.fn.extend({
    parseAs: function(name){
      return hasTag(name) && parseTag.call(this,name);
    }
  });

  function defineTagOnce(name,src,version){
    !hasTag(name) && defineTag(name,src);
  }

  function defineTag(name,src,version){
    //预编译模版
    $.pushValue(tags,name,{
      ready: false,
      tasks: [],
      instances: []
    });

    getTagTemplate(name,src,version,function(res){
      $.pushValue(tags,name+'.template',res);
      $.pushValue(tags,name+'.ready',true);
      var tasks = $.pullValue(tags,name+'.tasks',[]);
      while(tasks.length) tasks.shift()();
    });
  }

  function getTagTemplate(name,src,version,callback){
    var tags_cache_key = 'jquery_tags';
    var tag_store_key = [name,src,version].join(':');

    var cached_tags = $.getLocalJsonData(tags_cache_key) || {};

    cached_tags[tag_store_key] ? (
      callback && callback(cached_tags[tag_store_key])
    ) : $.get(src,function(res){

      //clear cache out of version
      for(var key in cached_tags){
        if(cached_tags.hasOwnProperty(key) && key.split(':')[0]==name){
          // console.log(key);
          delete cached_tags[key];
          break;
        }
      }

      cached_tags[tag_store_key] = res;
      $.saveLocalJsonData(tags_cache_key,cached_tags);

      callback && callback(cached_tags[tag_store_key]);
    });
  }

  function parseTag(name){
    execOnTag(name,resolveTag.bind(this,name));
  }

  function resolveTag(name){
    var tid = $.randomId(name+'_');
    var tag = tags[name];
    var template = tag['template'];
    var tmp_dom = $('<div>').html(template);

    //css
    var style = tmp_dom.find('style');
    var less_str = '[tid='+tid+']'+style.html();
    less.render(less_str,function(err,res){
        !err && $('head').append( style.html(res.css) );
    });

    //js
    var script = tmp_dom.find('script');
    var dom = tmp_dom.find(':not(style):not(script):first').attr('tid',tid);
    var main = new Function('egg',script.html());

    tag.instances.push(tid);
    dom.on('destroy',function(){
      tag.instances.splice(tag.instances.indexOf(tid),1);
      style.remove();
    });
    dom.remove = function(){
      //this will trigger jquery clearData;
      $('[tid='+tid+']').remove();
    }

    dom.tag = this.tag = tag;
    dom.tid = tid;
    dom.egg = this;
    $(this).replaceWith(dom);
    main.call(dom,this);
  }

  function execOnTag(name,func){
    $.pullValue(tags,name+'.ready',false) ? func() : $.pushValue(
      tags,
      name+'.tasks.'+$.pullValue(tags,name+'.tasks.length',0),
      func
    );
  }

  function hasTag(name){
    return !!tags[name];
  }

}());
