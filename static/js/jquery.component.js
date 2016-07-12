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

      //TODO: 相对路径补全

      !hasComponent(safe_name) && defineComponent(
        safe_name,
        getSrcPathname(this, name),
        this.getVersion()
      );

      parseComponent.call(this, safe_name);
      return this;
    }
  });

  function getSrcPathname($dom,name){
    var src = $dom.attr('src') || name;
    if(/^\./.test(src)){
      var directory = $dom.closest('[cdirectory]').attr('cdirectory') || location.pathname.replace(/\/[^\/]*$/,'/');
      src = relPathToAbs(directory+src);
    }
    return src;
  }

  //https://developer.mozilla.org/en-US/docs/Web/API/document/cookie#Using_relative_URLs_in_the_path_parameter
  function relPathToAbs (sRelPath) {
    var nUpLn, sDir = "", sPath = location.pathname.replace(/[^\/]*$/, sRelPath.replace(/(\/|^)(?:\.?\/+)+/g, "$1"));
    for (var nEnd, nStart = 0; nEnd = sPath.indexOf("/../", nStart), nEnd > -1; nStart = nEnd + nUpLn) {
      nUpLn = /^\/(?:\.\.\/)*/.exec(sPath.slice(nEnd))[0].length;
      sDir = (sDir + sPath.substring(nStart, nEnd)).replace(new RegExp("(?:\\\/+[^\\\/]*){0," + ((nUpLn - 1) / 3) + "}$"), "/");
    }
    return sDir + sPath.substr(nStart);
  }

  function parseComponent(name){
    componentReady(name, produceComponent.bind(this,name));
  }

  function defineComponent(name,src,version){
    //预编译模版
    $.pushValue(components,name,{
      ready: false,
      tasks: [],
      instances: [],
      src: src,
      version: version
    });

    // console.log(components);

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
    var directory = component.src.replace(/\/[^\#\/]*(\#.*)*$/,'/'); //组件目录

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
    dom = dom.length ? dom.removeAttr('component').removeAttr('version') : this;
    dom.attr('cid',cid).attr('cname',name).attr('cdirectory',directory);

    var instance = {
      cid: cid,
      $dom: dom,
      $style: component.style,
      dom: dom.get(0),
      style:component.style && component.style.get(0)
    };

    component.instances.push(instance);
    dom.on('destroy',function(){
      component.instances.splice(component.instances.indexOf(instance),1);
    }).on('dbclick',function(){
      console.log(instance);
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
