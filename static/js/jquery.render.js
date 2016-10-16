$.extend({
  renderFilters: {
    '=': function(n1,n2){
      return n1==n2
    }
  }
});

$.fn.extend({
  eval: function(expression){
    var me = this;

    if( /\sOR\s/.test(expression) ){
        var exprs = expression.split('OR');
        var result = false;
        exprs.forEach(function(expr){
            expr = expr.trim();
            result = (result || $(me).omsEval(expr));
        });
        return result;
    }

    if( /\sAND\s/.test(expression) ){
        var exprs = expression.split('AND');
        var result = true;
        exprs.forEach(function(expr){
            expr = expr.trim();
            result = (result && $(me).omsEval(expr));
        });
        return result;
    }

    var data = $(this).getCoreData();

    var dataSrcArray = expression.split('|');
    var key = dataSrcArray.shift();
    var filterFlagArray = dataSrcArray;

    //获取目标数据
    var subData = $.pullValue(data,key,'');

    filterFlagArray.forEach(function(filterFlag){
      //数据过滤
      if(filterFlag){
        var filterArray = filterFlag.split(':');
        filterFuncName = filterArray.shift();
        filterFuncName && (
          subData = $.renderFilters[filterFuncName].apply( $(me),[subData].concat(filterArray) )
        );
      }
    });

    return $.type(subData) == 'undefined' ? '' : subData;
  },
  evalAttr: function(attrName){
    return $(this).eval( $(this).attr(attrName) );
  },
  render: function(data){
    var me = this;
    var we = me.find('*').add(me);
    me.data('gene',this.html());
    //save data first
    me.setCoreData(data);

    //condition judge first
    $(we).filter('[if]').filter(function(){
      return $(this).get(0)===$(me).get(0) || parentsCannotHaveFilter(['.if-stuck','[component]']).call(this);
    }).each(function(){
      if( $(this).get(0)!==$(me).get(0) && $(me).is('.if-stuck') ){return;}

      var exprs = $(this).attr('if').split('AND');
      var result = true;
      exprs.forEach(function(expr){
        expr = expr.trim();
        result = $(me).eval(expr) && result;
      });
      result ? $(this).removeClass('if-stuck').addClass('if-pass').show() : $(this).removeClass('if-pass').addClass('if-stuck').hide();
    });

    //render data
    $(we).filter('[data-src]').filter(renderable).each(function(){
      var expr = $(this).attr('data-src');
      var result = $(me).eval(expr);

      switch( $(this).prop('tagName').toLowerCase() ){
        case 'input':
          var input_type = $(this).prop('type');
          switch( input_type ){
            case 'checkbox':
              result = (result==1||result===true);
              $(this).prop('checked')!=result && $(this).prop('checked',result);
              break;
            case 'radio':
              result = (result==1||result===true);
              $(this).prop('checked')!=result && $(this).prop('checked',result);
              break;
            default:
              $(this).val()!=result && $(this).val(result);
              break;
          }
        break;
        case 'img':
          $(this).attr('src')!=result && $(this).attr('src',result);
        break;
        default:
          $(this).html()!=result && $(this).html(result);
        break;
      }
    });

    // special flag href
    $(we).filter('[data-href]').filter(renderable).each(function(){
      var expr = $(this).attr('data-href');
      var result = $(me).eval(expr);
      $(this).attr('href',result);
    });

    // special flag class
    $(we).filter('[data-class]').filter(renderable).each(function(){
      var expr = $(this).attr('data-class');
      var result = $(me).eval(expr);
      $(this).removeClass( $(this).attr('orz-class')||'' ).attr('orz-class',result);
      $(this).addClass(result);
    });

    // special component
    $(we).filter('[component]').filter(renderable).each(function(){
      var zygote = $(this);
      zygote.container = me;
      zygote.parseAsComponent();
    });

    return me.addClass('rendered');

    function renderable(){
      var cannot_have_closest = ['.if-stuck'];
      var cannot_have_parents = ['[component]'];

      for(var i in cannot_have_closest){
        if(cannot_have_closest.hasOwnProperty(i) && $(this).closest(cannot_have_closest[i], me).length){
          return false;
        }
      }

      return parentsCannotHaveFilter(cannot_have_parents).call(this);
    }

    function parentsCannotHaveFilter(selectors){
      return function(){
        for(var i in selectors){
          if(selectors.hasOwnProperty(i) && $(this).parentsUntil(me, selectors[i]).length){
            return false;
          }
        }
        return true;
      }
    }
  },
  reload: function(data){
    if(this.is('.rendered')){
      var cloneBody = this.data('gene');
      this.html( cloneBody );
    }
    return this.render(data);
  },
  loadData: function(url){
    var me = this;
    var callback,result={then:function(func){callback=func;}};
    $.get(url,function(res){
      $(me).render(res);
      callback && callback(res);
    });
    return result;
  },
  getCoreData: function(){
    return $(this).data('srcData');
  },
  setCoreData: function(data){
    return $(this).data('srcData',data);
  },
  renderTable: function(arr){
    var table = $(this);
    var row_tpl = table.find('[row-tpl]').html();
    var rows_body = table.find('[rows-body]');
    rows_body.html(
      arr.map(function(rowData){
        return $(row_tpl).render(rowData);
      })
    );
    return this;
  }
});
