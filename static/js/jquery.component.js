(function(){
  var components = {};
  var shares = {};

  $.extend({
    defineComponentOnce: defineComponentOnce,
    defineComponent: function(name,src,version){
      name = encodeComponentName(name);
      if( hasComponent(name) )
      throw new Error('component '+name+' has exsited');
      return defineComponent(name,src,version);
    }
  });

  $.fn.extend({
    parseAsComponent: function(name){
      var original_name = name;
      name = encodeComponentName(name);
      !hasComponent(name) && defineComponent(
        name,
        this.attr('src') || original_name,
        getVersion(this)
      );
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
    return name.replace(/\./g,'__').replace(/\//g,'_-');
  }

  function getComponentResource(name,src,version,callback){
    var components_cache_key = 'jquery_components';
    var component_store_key = [name,src,version].join('::');

    var cached_components = $.getLocalJsonData(components_cache_key) || {};

    cached_components[component_store_key] ? (
      callback && callback(cached_components[component_store_key])
    ) : $.get(src,function(res){

      //clear cache out of version
      for(var key in cached_components){
        if(cached_components.hasOwnProperty(key) && key.split('::')[0]==name){
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

  function resolveComponent(name){
    var cid = $.randomId(name+'_');
    var component = components[name];
    var template = component['template'];
    var tmp_dom = $('<div>').html(template);

    //css
    //TODO: style share with all instances from one component
    var style = tmp_dom.children('style');
    if(style.length){
      var less_str = '[cid='+cid+']'+style.html();
      less.render(less_str,function(err,res){
        !err && $('head').append( style.html(res.css) );
        err && console.warn('Failed to render style of ' + name);
      });
    }

    // scope_scripts, combine in one function named main and run after every instance created.
    var scope_scripts = tmp_dom.children('script:not([src]),script[src][scope]');
    // global_scripts, just run one time before scope_scripts;
    var global_scripts = tmp_dom.children('script[src]:not([scope])');

    var dom = tmp_dom.children(':not(style):not(script):first');
    dom = dom.length ? dom : this;
    dom.attr('cid',cid);

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

    dom.addClass('scripts-loading');
    loadGlobalScripts(global_scripts,loadScopeScripts.bind(null, scope_scripts, function(res){
      dom.removeClass('scripts-loading').addClass('scripts-loaded');
      var main = new Function(res);
      main.call(dom);
    }));
  }

  function loadGlobalScripts(scripts,callback){
    if(!scripts.length){
      callback && callback();
      return;
    }

    var checkcount = 0;
    var sequential_script_srcs = [];
    var concurrent_script_srcs = [];
    scripts.each(function(){
      $(this).is('[concurrent]') ? concurrent_script_srcs.push(this.src) : sequential_script_srcs.push(this.src);
    });

    //todo support "local cache by version"
    $.loadScripts(sequential_script_srcs, checkFinish, true);
    $.loadScripts(concurrent_script_srcs, checkFinish, false);

    function checkFinish(){
      ++checkcount == 2 && callback && callback();
    }
  }

  function loadScopeScripts(scope_scripts, callback){
    if(!scope_scripts.length){
      callback && callback('');
      return;
    }

    var checkcount = 0;
    var scripts_str_array = [];
    scope_scripts.each(function(index,dom){
      if(this.src){
        $.ajax({url:this.src,dataType:'text'}).done(function(res){
          //todo cache in localStorage
          scripts_str_array[index] = res;
          checkFinish();
        }).fail(function(){
          throw new Error(dom.src + ' load failed')
        });
      }else{
        scripts_str_array[index] = this.innerHTML;
        checkFinish();
      }
    });

    function checkFinish(){
      ++checkcount == scope_scripts.length && callback && callback( scripts_str_array.join(';') );
    }
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

  function getVersion(jq_dom){
    try{
      return eval(jq_dom.attr('version') || '');
    }catch(e){
      return jq_dom.attr('version') || '';
    }
  }

}());
