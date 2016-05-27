(function(){
  var components = {};
  var shares = {};

  $.extend({
    defineComponentOnce: defineComponentOnce,
    defineComponent: function(name,src,version){
      name = encodeComponentName(name);
      if( hasComponent(name) )
        throw new Error();
      return defineComponent(name,src,version);
    }
  });

  $.fn.extend({
    parseAsComponent: function(name){
      name = encodeComponentName(name);
      !hasComponent(name) && defineComponent(name,this.attr('src')||name,this.attr('version')||'');
      parseComponent.call(this,name);
      return this;
    }
  });

  function defineComponentOnce(name,src,version){
    name = encodeComponentName(name);
    !hasComponent(name) && defineComponent(name,src);
  }

  function defineComponent(name,src,version){
    name = encodeComponentName(name);
    //预编译模版
    $.pushValue(components,name,{
      ready: false,
      tasks: [],
      instances: []
    });

    getComponentResource(name,src,version,function(res){
      $.pushValue(components,name+'.template',res);
      $.pushValue(components,name+'.ready',true);
      var tasks = $.pullValue(components,name+'.tasks',[]);
      while(tasks.length) tasks.shift()();
    });
  }

  function encodeComponentName(name){
    return name.replace(/\./g,'____');
  }

  function getComponentResource(name,src,version,callback){
    var components_cache_key = 'jquery_components';
    var component_store_key = [name,src,version].join(':');

    var cached_components = $.getLocalJsonData(components_cache_key) || {};

    cached_components[component_store_key] ? (
      callback && callback(cached_components[component_store_key])
    ) : $.get(src,function(res){

      //clear cache out of version
      for(var key in cached_components){
        if(cached_components.hasOwnProperty(key) && key.split(':')[0]==name){
          // console.log(key);
          delete cached_components[key];
          break;
        }
      }

      cached_components[component_store_key] = res;
      $.saveLocalJsonData(components_cache_key,cached_components);

      callback && callback(cached_components[component_store_key]);
    });
  }

  function parseComponent(name){
    execOnComponent(name,resolveComponent.bind(this,name));
  }

  function resolveComponent(name){console.log(name);x = components;
    var cid = $.randomId(name+'_');
    var component = components[name];
    var template = component['template'];
    var tmp_dom = $('<div>').html(template);

    //css
    var style = tmp_dom.children('style');
    var less_str = '[cid='+cid+']'+style.html();
    less.render(less_str,function(err,res){
        !err && $('head').append( style.html(res.css) );
    });

    //js
    var script = tmp_dom.children('script:not([src])');
    var remote_scripts = tmp_dom.children('script[src]');
    var dom = tmp_dom.children(':not(style):not(script):first').attr('cid',cid);
    var main = new Function(script.html());

    component.instances.push(cid);
    dom.on('destroy',function(){
      component.instances.splice(component.instances.indexOf(cid),1);
      style.remove();
    });
    dom.remove = function(){
      //this will trigger jquery clearData;
      $('[cid='+cid+']').remove();
    }

    dom.component = this.component = component;
    dom.cid = cid;
    dom.zygote = this;
    dom.container = this.container;
    dom.family_share = shares[name] = (shares[name] || {});
    $(this).replaceWith(dom);
    remote_scripts.length ? loadScripts(remote_scripts, main.bind(dom)) : main.call(dom);
  }

  function loadScripts(scripts,callback){
    var scripts = scripts.map(function(){
      return this.src;
    }).toArray();

    //todo support "local cache by version and unordered"

    $.loadScripts(scripts, callback)
  }

  function execOnComponent(name,func){
    $.pullValue(components,name+'.ready',false) ? func() : $.pushValue(
      components,
      name+'.tasks.'+$.pullValue(components,name+'.tasks.length',0),
      func
    );
  }

  function hasComponent(name){
    return !!components[name];
  }

}());
