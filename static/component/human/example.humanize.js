function humanize(selector){
  var me = $(selector);
  me.say = me.html;
  return me;
}
