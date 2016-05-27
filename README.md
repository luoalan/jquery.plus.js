# component.js

##combine js
`
  uglifyjs \
    less-pre.js \
    less.js \
    jquery.min.js \
    jquery.destroy-event.js \
    jquery.utilities.js \
    jquery.component.js \
    jquery.render.js \
    -o jquery.plus.min.js -c
`
##start up

`
  sudo nodemon index.js \
   -root ../jquery.plus.js/ \
   -port 80 \
   -w ../jquery.plus.js/server \
   -w ./ -d 3
`
