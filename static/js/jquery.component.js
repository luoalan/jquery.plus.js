(function(){
  var components = {};
  var shares = {};

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
      safe_name = $.safeKey(name);
      !hasComponent(safe_name) && defineComponent(
        safe_name,
        this.attr('src') || name,
        $(this).getVersion()
      );
      parseComponent.call(this, safe_name);
      return this;
    }
  });

  function parseComponent(name){
    componentReady(name, produceComponent.bind(this,name));
  }

  function defineComponent(name,src,version){
    //预编译模版
    $.pushValue(components,name,{
      ready: false,
      tasks: [],
      instances: []
    });

    $.cacheSrcText(src,version).then(function(res){
      $.pushValue(components,name+'.template',res);
      $.pushValue(components,name+'.ready',true);
      var tasks = $.pullValue(components,name+'.tasks',[]);
      while(tasks.length) tasks.shift()();
    });
  }

  function componentReady(name,func){
    $.pullValue(components,name+'.ready',false) ? func() : $.pushValue(
      components,
      name+'.tasks.'+$.pullValue(components,name+'.tasks.length',0),
      func
    );
  }

  function  produceComponent(name){
    var cid = $.randomId(name+'_');
    var component = components[name];
    var template = component['template'];
    var tmp_dom = $('<div>').html(template);

    var style = tmp_dom.children('style');
    if(style.length && !component.style){
      var less_str = '[cname='+name+']'+style.html();
      less.render(less_str,function(err,res){
        !err && $('head').append( style.html(res.css) );
        err && console.warn('Failed to render style of ' + name);
      });
      component.style = style;
    }

    // global_scripts, just run one time before scope_scripts;
    var global_scripts = tmp_dom.children('script[src]:not([scope])');
    // scope_scripts, combine in one function named main and run after every instance created.
    var scope_scripts = tmp_dom.children('script:not([src]),script[src][scope]');

    var dom = tmp_dom.children(':not(style):not(script):first');
    dom = dom.length ? dom : this;
    dom.attr('cid',cid).attr('cname',name);

    component.instances.push(cid);
    dom.on('destroy',function(){
      component.instances.splice(component.instances.indexOf(cid),1);
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
    $.loadGlobalScripts(global_scripts, $.loadScopeScripts.bind(null, scope_scripts, function(res){
      dom.removeClass('scripts-loading').addClass('scripts-loaded');
      var main = new Function('me','me=this;'+res);
      main.call(dom);
    }));
  }

  function hasComponent(name){
    return !!components[name];
  }
}());
