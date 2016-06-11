$.extend({
  randomId: function(prefix){
    return (prefix||'')+( new Date().valueOf().toString(36)+Math.random().toString(36) ).split('0.').join('_').substr(0,12);
  },
  safeKey: function(key){
    return key.replace(/\./g,'__').replace(/\//g,'_-');
  },
  isUndefined: function(value){
    return /Null|Undefined/.test(Object.prototype.toString.call(value));
  },
  defaultValue: function(value,default_value){
    return $.isUndefined(value) ? default_value : value;
  },
  pullValue: function(obj,key,default_value){
    var keys_arr = key.split('.');
    var subobj = obj;
    try{
      while(keys_arr.length)
      subobj = subobj[ keys_arr.shift() ];
      return !/Null|Undefined/.test(Object.prototype.toString.call(subobj)) ? subobj : default_value;
    }catch(e){
      return default_value;
    }
  },
  pushValue: function(obj,key,value){
    var subkey,
    subobj = obj,
    keys_arr = key.split('.');

    while(keys_arr.length>1)(
      subkey = keys_arr.shift(),
      subobj = subobj[subkey] = (
        !/Number|String|Null|Undefined/.test(Object.prototype.toString.call(subobj[subkey]))
        ? subobj[subkey]
        : {}
      )
    )

    subobj[ keys_arr.shift() ] = value;

    return obj;
  },
  dirtyCheck: function(key,value){
    return !$.cacheUnchangedCheck(key,value);
  },
  cacheUnchangedCheck: function(){
    var cache = {};

    return function(key,new_value){
      var result = true;
      var old_value = $.pullValue(cache,key);
      $.pushValue(cache,key,new_value);

      if( /Number|String|Null|Undefined/.test( Object.prototype.toString.call(new_value) ) ){
        result = result && old_value === new_value;
        return result;
      }else{
        for(var k in new_value){
          if( new_value.hasOwnProperty(k) ){
            result = result && $.pullValue(new_value,k) === $.pullValue(old_value,k);
            if(!result){
              return result;
            }
          }
        }
      }

      if( /Number|String|Null|Undefined/.test( Object.prototype.toString.call(old_value) ) ){
        result = result && old_value === new_value;
        return result;
      }else{
        for(var k in old_value){
          if( old_value.hasOwnProperty(k) ){
            result = result && $.pullValue(new_value,k) === $.pullValue(old_value,k);
            if(!result){
              return result;
            }
          }
        }
      }

      return result;
    }
  }(),
  saveLocalJsonData: function(name,obj){
    var prefix = 'rango_';
    localStorage[prefix+name] = JSON.stringify(obj);
  },
  getLocalJsonData: function(name,key){
    var prefix = 'rango_';
    try{
      var result = JSON.parse(localStorage[prefix+name]);
      return key ? $.pullValue(result,key) : result;
    }catch(e){
      return;
    }
  },
  updateLocalJsonData: function(name,key,value){
    var info_cache = $.getLocalJsonData(name) || {};
    if( /Null|Undefined/.test(Object.prototype.toString.call(value)) ){
      delete info_cache[key];
    }else{
      info_cache[key] = value;
    }
    $.saveLocalJsonData(name,info_cache);
  },
  cacheSrcText: function(src,version,expiry){
    var callback, text, result = {then:function(func){
      text ? func(text) : (callback=func);
    }};

    expiry = $.defaultValue(expiry,31536000000); //default one year

    var name = 'cached_src';
    var key = $.safeKey(src);
    data = $.getLocalJsonData(name,key);

    if(
      (text = $.pullValue(data,'text')) &&
      $.pullValue(data,'version')==(version||'') &&
      $.pullValue(data,'created_at',0)+ Math.min($.pullValue(data,'expiry',0),expiry) >= new Date().valueOf()
    ){
      return result;
    }

    text = null;
    $.ajax({url:src,dataType:'text'}).done(function(res){
      text = res;

      updateLocalJsonData(name,key,expiry?{
        text: text,
        version: version||'',
        created_at: new Date().valueOf(),
        expiry: expiry
      }:null);

      callback && callback(text);
    });

    return result;
  },
  cleanCacheSrc: function(){
    //exec once at defining
    (window.requestAnimationFrame||setTimeout)(cleanCacheSrc);
    return cleanCacheSrc;

    function cleanCacheSrc(){
      var name = 'cached_src';
      var dataset = $.getLocalJsonData(name);
      for(i in dataset) data.hasOwnProperty(i) && function(key){
        var data = dataset[i];
        $.pullValue(data,'created_at',0)+$.pullValue(data,'expiry',0) < new Date().valueOf() && updateLocalJsonData(name,key);
      }(i);
    }
  }(),
  loadScripts: function(){
    var loadedScripts = [];

    return function(scripts,callback,sequential){
      sequential = $.type(sequential)!=='undefined' ? sequential : true;
      sequential ? loadSequentialScripts(scripts,callback) : loadConcurrentScripts(scripts,callback);
    }

    //TODO: control the scripts cache and run it manualy

    //TODO: cdn scripts and local scripts

    function loadSequentialScripts(scripts,callback){
      var script;

      if(!scripts.length){
        return callback && callback()
      }

      script = scripts.shift();

      if( loadedScripts.indexOf(script)>-1 ){
        return loadSequentialScripts.call(null,scripts,callback);
      }

      $.getScript(script).done(function(){
        loadedScripts.push(script);
        loadSequentialScripts.call(null,scripts,callback);
      }).fail(failReport.bind(null,script));
    }

    function loadConcurrentScripts(scripts,callback){
      var done_count = 0;

      scripts.length ? scripts.forEach(function(script){
        $.getScript(script).done(finishCheck).fail(failReport.bind(null,script))
      }) : (callback && callback());

      function finishCheck(){
        ++done_count == scripts.length && callback && callback();
      }
    }

    function failReport(script){
      throw new Error(script+' load as script failed');
    }
  }()
});
