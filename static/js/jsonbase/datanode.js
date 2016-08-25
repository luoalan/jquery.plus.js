!function(){
  function DataNode(value){
    this.type = 'value';//value|node
    this.key = '';
    this.created_at = uniqueMillisecond();
    this.updated_at = uniqueMillisecond();
    this.eventListeners = {};
    this.set(value);
  }

  DataNode.prototype = {
    trigger: function(event_type,target,ums){
      var me = this;
      target = target || this;
      var ums = ums || uniqueMillisecond();

      var callbacks = this.eventListeners[event_type];
      callbacks && callbacks.forEach(function(callback){
        callback.call(me,{
          type: event_type,
          target: target,
          ums: ums
        });
      });

      switch(event_type){
        //first class event
        case 'child_added':
          this.trigger('value_changed',this,ums)
          this.trigger('descendant_added',target,ums);
          break;
        case 'child_removed':
          this.trigger('value_changed',this,ums)
          this.trigger('descendant_removed',target,ums);
          break;

        //second class event
        case 'descendant_added':
          this.parent && this.parent.trigger('descendant_added',target,ums);
          break;
        case 'descendant_added':
          this.parent && this.parent.trigger('descendant_added',target,ums);
          break;

        //most important event
        case 'value_changed':
          this.parent && this.parent.trigger('child_changed',this,ums);
          this.parent && this.parent.trigger('value_changed',this.parent,ums);
          this.updated_at = ums;
          break;
      }

      return this;
    },
    on: function(event_type,callback){
      var me = this;
      var types = event_type.split(' ');
      if(types.length>1){
        types.forEach(function(event_type){
          me.on(event_type,callback);
        });
      }else{
        var callbacks = this.eventListeners[event_type] = this.eventListeners[event_type] || [];
        callbacks.push(callback);
      }
      return this;
    },
    off: function(event_type,callback){
      if(event_type){
        var callbacks = this.eventListeners[event_type] = this.eventListeners[event_type] || [];
        if(callback){
          callbacks.splice(callbacks.indexOf(callback),1);
        }else{
          callbacks.length = 0;
        }
      }else{
        this.eventListeners = {};
      }
    },
    //##########################  set , get --START #######################
    set: function(newValue){
      //设置新值
      if( newValue && newValue['.sv'] && newValue['.sv']=='timestamp' ){
        return this.set( uniqueMillisecond() );
      }

      var newValue_type = Object.prototype.toString.call(newValue);
      if( newValue_type=='[object Object]'||newValue_type=='[object Array]' ){
        this.type = 'node';
        this.children = {};
        for(var key in newValue){
          if( newValue.hasOwnProperty(key) ){
            this.addChild(key, new DataNode(newValue[key]));
          }
        }
      }else{
        this.type = 'value';
        this.value = newValue;
        this.removeChildren();
      }
      delete this[this.type=='node' ? 'value': 'children'];

      return this.trigger('value_changed');
    },
    update: function(updateObj){
      var updateObj_type = Object.prototype.toString.call(updateObj);
      if( updateObj_type=='[object Object]'||updateObj_type=='[object Array]' ){
        this.type = 'node';
        this.children = this.children || {};
        for(var key in updateObj){
          if( updateObj.hasOwnProperty(key) ){
            var childNode = this.getChild(key);
            if(childNode){
              childNode.update(updateObj[key])
            }else{
              this.addChild(key, new DataNode(updateObj[key]));
            }
          }
        }
      }else{
        this.type = 'value';
        if(this.get()!=updateObj){
          this.set(updateObj);
        }
      }
      delete this[this.type=='node' ? 'value': 'children'];

      return this;
    },
    get: function(){
      //获取值
      if(this.type=='value'){
        return this.value;
      }
      if(this.type=='node'){
        var resObj = {};
        for(var key in this.children){
          if(this.children.hasOwnProperty(key)){
            resObj[key] = this.children[key].get();
          }
        }
        return resObj;
      }
    },
    //##########################  set , get --END #######################

    //##########################  export , import --START #######################
    export: function(){
      //导出静态数据
      var exportObj = {};
      extend(exportObj,{
        type: this.type,
        value: this.value,
        children: {},
        created_at: this.created_at,
        updated_at: this.updated_at
      });
      if(exportObj.type=='node'){
        for(var key in this.children){
          if(this.children.hasOwnProperty(key)){
            exportObj.children[key] = this.children[key].export();
          }
        }
      }
      delete exportObj[exportObj.type=='node' ? 'value': 'children'];
      return JSON.stringify(exportObj);
    },
    import: function(str){
      //导入静态数据
      var importNode = new DataNode();
      extend(importNode,JSON.parse(str));
      if(importNode.type=='node'){
        for(var key in importNode.children){
          if( importNode.children.hasOwnProperty(key) ){
            importNode.addChild(key, new DataNode().import(importNode.children[key]));
            //update children's parent
            importNode.children[key].parent = this;
          }
        }
      }
      extend(this,{
        type: importNode.type,
        value: importNode.value,
        children: importNode.children,
        created_at: importNode.created_at,
        updated_at: importNode.updated_at
      });
      delete this[this.type=='node' ? 'value': 'children'];
      return this.trigger('value_changed');
    },
    //##########################  export , import --END #######################

    //##########################  addChild , removeChild, removeChildren, getChild, setChild, getChildren --START #######################
    rootNode: function(){
      var rootnode;
      var node = this;
      while(node = node.parent)
        rootnode = node;
      return rootnode;
    },
    addChild: function(key,node){
      node.remove();
      this.children[key] = node;
      node.key = key;
      node.parent = this;
      return this.trigger('child_added',node);
    },
    removeChild: function(key){
      var node = this.children[key];
      delete this.children[key];
      node.key = '';
      delete node.parent;
      return this.trigger('child_removed',node);
    },
    remove: function(){
      this.parent && this.parent.removeChild(this.key);
    },
    removeChildren: function(){
      for(var key in this.children){
        if(this.children.hasOwnProperty(key)){
          this.removeChild(key);
        }
      }
      return this;
    },
    getChild: function(pathname){
      var keys = pathname.split('/');
      var subnode = this;
      var existed = true;
      keys.forEach(function(key){
        if(key.length){
          if(subnode.children && subnode.children[key]){
            subnode = subnode.children[key];
          }else{
            existed = false;
          }
        }
      });
      return existed ? subnode : undefined;
    },
    setChild: function(pathname,node){
      var childnode = this.getChild(pathname);
      if(childnode){
        childnode.import(node.export());
      }else{
        throw new Error('Node of '+pathname+' cannot be found!');
      }
      return this;
    },
    getChildren: function(){
      var result = [];
      for(var key in this.children){
        if(this.children.hasOwnProperty(key)){
          result.push(this.children[key]);
        }
      }
      return result;
    },
    //##########################  addChild , removeChild, removeChildren, getChild, getChildren --END #######################

    //##########################  pathname --END #######################
    getPathname: function(){
      var pathname = this.key;
      var node = this;
      while(node = node.parent){
          pathname = node.key + '/' + pathname;
      }
      return pathname;
    }
  }

  function extend(object){
    Array.prototype.forEach.call(arguments,function(obj,index){
      if(!index){return;}
      for(var key in obj){
        obj.hasOwnProperty(key) , (object[key] = obj[key]);
      }
    });
  }

  window.DataNode = DataNode;
}();
