(function(){
  var tags = {};

  $.extend({
    defineTagOnce: defineTagOnce,
    defineTag: function(name,src){
      if( hasTag(name) )
        throw new Error();
      return defineTag(name,src);
    }
  });

  $.fn.extend({
    parseAs: function(name){
      return hasTag(name) && parseTag.call(this,name);
    }
  });

  function defineTagOnce(name,src){
    !hasTag(name) && defineTag(name,src);
  }

  function defineTag(name,src,version){
    //预编译模版
    $.pushValue(tags,name,{
      ready: false,
      tasks: []
    });

    $.get(src,function(res){
      $.pushValue(tags,name+'.template',res);
      $.pushValue(tags,name+'.ready',true);
      var tasks = $.pullValue(tags,name+'.tasks',[]);
      while(tasks.length) tasks.shift()();
    });
  }

  function parseTag(name){
    execOnTag(name,resolveTag.bind(this,name));
  }

  function resolveTag(name){
    var id = $.randomId('tag_');
    var template = tags[name]['template'];
    var tmp_dom = $('<div>').html(template);

    //css
    var style = tmp_dom.find('style').attr('tid',id);
    var less_str = '[tid='+id+']'+style.html();
    less.render(less_str,function(err,res){
        !err && $('head').append( style.html(res.css) );
    });

    //js
    var script = tmp_dom.find('script');
    var dom = tmp_dom.find(':not(style):not(script):first').attr('tid',id);
    var main = new Function('egg',script.html());

    dom.on('destroy',function(){
      style.remove();
    });

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



$(function(){
  window.Pepper = {
    defineComponent: defineComponent,
    update: update
  }

  function defineComponent(component_name,options){
    var opt = {};$.each(options,function(key,value){opt[key] = value;});
    opt.data = opt.data || {};

    var components = [];

    opt.component_name = component_name;
    $(component_name).each(function(){
      var tempDom = this;

      opt.component_id = randomId('pe-');

      fakeAsync_GetStyle(opt,function(css){
        var style = css ? $('<style>').html(css) : '';
        var dom = getTemplate(opt);
        $(dom).data('pepper_opt',opt);

        var component = $(style).add(dom);
        component = wrapComponent(component,opt);
        opt.main && opt.main.call(component);

        component.each(function(){
          components.push(this);
        });

        $(tempDom).replaceWith(component);
      });
    });

    return $(components);
  }

  //like asynchronous, but really synchronous
  function fakeAsync_GetStyle(opt,callback){
    var lessStr = '#${component_id}{' + opt.less + '}';
    lessStr = strCompile(lessStr,opt);
    less.render(lessStr,function(err,res){
      err ? callback('') : callback(res.css);
    });
  }

  function getTemplate(opt){
    var template = strCompile(opt.template,opt);

    template = render(template,opt.data);

    var dom = $(template).attr('id',opt.component_id);
    return dom;
  }

  function update(this_dom, updated_data){
    var opt = $(this_dom).data('pepper_opt');

    var new_date = opt.data || {};
    $.each(updated_data,function(key,value){new_date[key]=value;});

    var old_html = $(this_dom).html();
    var new_html = render( opt.template||old_html , new_date );
    old_html !== new_html && $(this_dom).html(new_html);
  }

  function render(template, data){
    //replace ${key} with the subdata of data[key]
    template = template.replace(/\$\{([^\}]*)?\}/g,function(str,data_key,start){
      return getData(data, data_key.trim());
    });
    return template;
  }

  function getData(data, data_key){
    var res = data[data_key];
    switch( $.type(res) ){
      case 'function':
      res = res();
      break;
      case 'undefined':
      case 'NaN':
      case 'null':
      res = '';
      break;
    }
    return res;
  }

  function wrapComponent(component,opt){
    var prefix = strCompile('<!-- * Pe: ${component_name}  start -->',opt);
    var suffix = strCompile('<!--   Pe: ${component_name}  end * -->',opt);

    return $(prefix).add( component ).add(suffix);
  }

  function strCompile(str,opt){
    return (str||'').replace(/\$\{component_id\}/g,opt.component_id)
    .replace(/\$\{component_name\}/g,opt.component_name);
  }
});
