(function(){
  var components = {};
  var tasks = {};

  //safe_name 里面不含有 '.'，以防止 pullValue pushValue 使用冲突
  $.extend({
    defineComponent: function(name,src,version){
      var safe_name = $.safeKey(name);
      if( hasComponent(safe_name) )
      throw new Error('component '+safe_name+' has exsited');
      return defineComponent(safe_name, src, version);
    }
  });

  $.fn.extend({
    parseAsComponent: function(name){
      var name = name || $(this).attr('component');
      var safe_name = $.safeKey(name);
      var src = getComponentSrcPathname(this,name);
      var version = this.getVersion();

      !hasComponent(safe_name) && defineComponent(safe_name, src, version);

      parseComponent.call(this, safe_name);
      return this;
    }
  });

  function getComponentSrcPathname($dom,name){
    var src = $dom.attr('src') || name;
    return combineSrcWithDirectory(
      src,
      $dom.closest('[cdirectory]').attr('cdirectory') || location.pathname.replace(/\/[^\/]*$/,'/')
    )
  }

  function parseComponent(name){
    componentReady(name, produceComponent.bind(this,name));
  }

  function componentReady(name,func){
    if( $.pullValue(components,name+'.ready',false) ){
      return func();
    }

    tasks[name] = (tasks[name] || []);
    tasks[name].push(func);
  }

  function defineComponent(name,src,version){
    //TODO: extend src-type to #dom_id && <tagName></tagName> str

    //预编译模版
    $.pushValue(components,name,{
      ready: false,
      instances: [],
      src: src,
      directory: src.replace(/\/[^\#\/]*(\#.*)*$/,'/'),
      version: version
    });

    var component = components[name];

    $.cacheSrcText(src,version).then(function(res){
      component.template = res;

      var tmp_dom = $('<div>').html(component.template);
      tmp_dom.find('[src]').each(function(){
        var src = $(this).attr('src');
        var abs_src = combineSrcWithDirectory(src,component.directory);
        src!=abs_src && $(this).attr('src',abs_src);
      });

      var style = tmp_dom.children('style');
      style.length && less.render('[cname='+name+']'+style.html(),function(err,res){
        if(!err){
          component.style = $('<style>'+res.css+'</style>').appendTo( $('head') );
        }else{
          console.warn('Failed to render style of ' + name);
        }
      });

      //TODO: preload global_scripts && scope_scripts && sub-components in component;

      component.global_scripts = tmp_dom.children('script[src]:not([scope])');
      component.scope_scripts = tmp_dom.children('script:not([src]),script[src][scope]');
      component.dom = tmp_dom.children(':not(style):not(script):first').prop('outerHTML');
      //TODO: extend component from component

      component.family_share = {};
      component.ready = true;

      var ready_tasks = $.pullValue(tasks, name, []);
      while(ready_tasks.length) ready_tasks.shift()();
    });
  }

  function  produceComponent(name){
    var cid = $.randomId();
    var component = components[name];

    var dom = component.dom ? $(component.dom) : this.removeAttr('component').removeAttr('version');
    dom.attr('cid',cid).attr('cname',name).attr('cdirectory',component.directory);

    component.instances.push(dom);
    dom.on('destroy',function(){
      component.instances.splice(component.instances.indexOf(dom),1);
    }).on('dblclick',function(){
      console.log(dom);
    });

    $.extend(dom,{
      cid: cid,
      component: this.component = component,
      zygote: this,
      container: this.container,
      family_share: component.family_share,
      remove: function(){
        //this will trigger jquery clearData;
        $('[cid='+cid+']').remove();
      }
    });

    component.dom && $(this).replaceWith(dom);

    dom.addClass('scripts-loading');

    //TODO: use with, prevent define veriable on global/window object defautly.

    $.loadGlobalScripts(component.global_scripts, $.loadScopeScripts.bind(null, component.scope_scripts, function(res){
      dom.removeClass('scripts-loading').addClass('scripts-loaded');
      var main = new Function('me','me=this;'+res);
      main.call(dom);
    }));
  }

  function hasComponent(name){
    return !!components[name];
  }

  function combineSrcWithDirectory(src,directory){
    if(!/^\./.test(src)){return src;}

    var result = directory+src;
    var ruined_indexs = [];

    result = result.split('/');

    result.map(function(x,i,a){
      var prev_index = getUnRuinedPrevIndex(i);
      if(x=='.'){
        ruined_indexs.push(i);
      }
      if(x=='..'){
        ruined_indexs.push(i);
        ruined_indexs.push(prev_index);
      }
    });

    result = result.filter(function(x,i,a){
      return ruined_indexs.indexOf(i)<0;
    }).join('/');

    return result;

    function getUnRuinedPrevIndex(i){
      while( (i-- > -1) && (ruined_indexs.indexOf(i)>-1) ){}
      return i;
    }
  }
}());
