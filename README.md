# jquery.plus.js

## contain all files as follow

### less-pre.js
```
less={async:true};
```

### less.js
https://github.com/less/less.js

### jquery.min.js
https://github.com/jquery/jquery

### jquery.destroy-event.js
https://github.com/IndigoUnited/jquery.destroy-event

### jquery.utilities.js
```
  //Add some method to jQuery
  randomId
  pullValue
  pushValue
  dirtyCheck
  cacheUnchangedCheck
  saveLocalJsonData
  getLocalJsonData
  updateLocalJsonData
  cacheSrcText
  cleanCacheSrc
  loadGlobalScripts
  loadScopeScripts
  locationSearchVal
  locationHashVal
```

### jquery.component.js
```
  //Add some method to jQuery
  defineComponent

  //Add some method to jQuery.fn
  parseAsComponent
  
  //TODO:
    add containerOn mothed on me. it can auto off after me distroyed.
```

### jquery.render.js
```
  //Add some obj to jQuery
  renderFilters

  //Add some method to jQuery.fn
  eval
  evalAttr
  render
  reload
  loadData
  getCoreData
  setCoreData
  renderTable
```

##combine files
```
  uglifyjs less-pre.js less.js jquery.min.js jquery.destroy-event.js jquery.utilities.js jquery.component.js jquery.render.js -o jquery.plus.min.js -c  
```

##start up
```
  sudo nodemon index.js -root ../jquery.plus.js/ -port 80 -w ../jquery.plus.js/server -w ./ -d 3  
```
