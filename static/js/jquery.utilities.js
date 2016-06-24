$.fn.extend({
  getVersion: function(){
    try{
      return eval(this.attr('version') || '');
    }catch(e){
      return this.attr('version') || '';
    }
  }
});

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
  getLocalJsonData: function(name,key,default_value){
    var prefix = 'rango_';
    try{
      var result = JSON.parse(localStorage[prefix+name]);
      return key ? $.pullValue(result,key,default_value) : result;
    }catch(e){
      return default_value;
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
  //if cached, return cache, else, cache value and return value
  cacheLocalJsonData: function(name,key,value){
    if(
      /Null|Undefined/.test(Object.prototype.toString.call($.getLocalJsonData(name,key))) &&
      !/Null|Undefined/.test(Object.prototype.toString.call(value))
    ){
      return ($.updateLocalJsonData(name,key,value),value);
    }else{
      return $.getLocalJsonData(name,key);
    }
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

      $.updateLocalJsonData(name,key,expiry?{
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
      for(i in dataset) dataset.hasOwnProperty(i) && function(key){
        var data = dataset[i];
        $.pullValue(data,'created_at',0)+$.pullValue(data,'expiry',0) < new Date().valueOf() && updateLocalJsonData(name,key);
      }(i);
    }
  }(),
  loadGlobalScripts: function(){
    var cache = {};

    return function(scripts,callback){
      scripts.each(function(index,script){
        !cache[this.src] && $.cacheSrcText(this.src, $(this).getVersion()).then(function(res){
          $.globalEval(res);
          cache[script.src] = true;
          checkFinish();
        });
      });

      checkFinish();

      function checkFinish(){
        if(!scripts.filter(function(){
          return !cache[this.src];
        }).length){
          checkFinish = $.noop;
          callback && callback();
        };
      }
    }
  }(),
  loadScopeScripts: function(scripts,callback){
    var checkcount = 0;
    var scripts_str_array = [];

    scripts.each(function(index){
      if(this.src){
        $.cacheSrcText(this.src, $(this).getVersion()).then(function(res){
          scripts_str_array[index] = res;
          checkFinish();
        });
      }else{
        scripts_str_array[index] = this.innerHTML;
        checkFinish();
      }
    });

    function checkFinish(){
      if(++checkcount == scripts.length){
        checkFinish = $.noop;
        callback && callback( scripts_str_array.join(';') );
      }
    }
  },
  locationSearchVal: function(){
    var params = {};
    location.search.replace(/^\?/,'').split('&').forEach(function(x){
      params[ x.replace(/\=.*/,'') ] = decodeURIComponent( x.replace(/.*\=/,'') );
    });
    return function(key){
      return params[key];
    };
  }(),
  locationHashVal: function(key){
    var params = {};
    location.hash.replace(/^\#/,'').split('&').forEach(function(x){
      params[ x.replace(/\=.*/,'') ] = decodeURIComponent( x.replace(/.*\=/,'') );
    });
    return params[key];
  }
});
