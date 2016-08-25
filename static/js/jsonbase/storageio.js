!function(){
  function StorageIO(obj,key){
    var me = this;
    this.obj = obj;
    this.key = key;
    this.old_value = obj[key];
    this.changecallbacks = [];

    //To watch the changing
    setInterval(function(){
      var new_value = me.obj[me.key];
      var new_value_type = Object.prototype.toString.call(new_value);
      if('[object Undefined]'==new_value_type || '[object Null]'==new_value_type){
        me.obj[me.key] = '{}';
      }

      if( me.old_value != me.obj[me.key] ){
        me.old_value = me.obj[me.key];
        me.change();
      }
    },500);
  }

  StorageIO.prototype = {
    get: function(callback){
      callback( this.obj[this.key] );
    },
    set: function(str){
      if(str != this.old_value){
        this.old_value = this.obj[this.key] = str;
        this.change();
      }
    },
    change: function(callback){
      var me = this;
      if(callback){
        this.changecallbacks.push(callback);
      }else{
        console.log('changed');
        this.changecallbacks.forEach(function(callback){
          callback( me.obj[me.key] );
        });
      }
    },
  }

  window.StorageIO = StorageIO;
}();
