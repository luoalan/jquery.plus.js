!function(){
  function DataCenter(storageIO){
    var me = this;
    this.RootDataNode = new DataNode();

    storageIO.get(function(str){
      //import trigger value_changed, please caution recursive calling.
      str && me.import(str);
    });
    storageIO.change(function(str){
      me.synchronize(str);
    });
    this.change(function(){
      storageIO.set( me.export() );
    });
  }

  DataCenter.prototype = {
    on: function(){
      this.RootDataNode.on.apply(this.RootDataNode,arguments);
      return this;
    },
    import: function(str){
      this.RootDataNode.import(str);
      return this;
    },
    export: function(){
      return this.RootDataNode.export();
    },
    change: function(callback){
      this.RootDataNode.on('value_changed',function(){
        callback();
      });
      return this;
    },
    synchronize: function(str){
      this.RootDataNode.update(new DataNode().import(str).get());
      return this;
    },
    getNode: function(pathname){
      return this.RootDataNode.getChild(pathname);
    },
    extend: function(pathname){
      !this.getNode(pathname) && this.setValue(pathname,null);
      return this;
    },
    pullNode: function(pathname){
      this.extend(pathname);
      return this.getNode(pathname);
    },
    setValue: function(pathname,value){
      var childNode = this.getNode(pathname);
      if(childNode){
        childNode.set(value);
        return this;
      }

      var keys = pathname.split('/');
      var node = this.RootDataNode;
      var subnode;
      while( subnode = node.getChild(keys[0]) ){
        node = subnode;
        keys.shift();
      }

      var obj = {};
      var subobj = obj;
      while(keys.length>1){
        subobj = subobj[ keys.shift() ] = {};
      }

      subobj[keys.shift()] = value;
      node.update(obj);
      return this;
    }
  }

  window.DataCenter = DataCenter;
}();
