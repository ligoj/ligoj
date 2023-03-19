#! /bin/bash

function minify_css() {
  local TARGET_CSS="$2"
  local TEMP_CSS="$TARGET_CSS.tmp"
  cat $1 | \
    tr '\n' ' ' | \
    sed -E 's|<link[^>]*"([^"?]*\.css)([?][^"]+)?"[^>]*>|\n###\1\n|g' | \
    grep '###' | \
    sed 's|###|src/main/webapp/|g'| \
    { xargs cat ; } \
    > $TEMP_CSS && \
  cleancss -O2 -o $TARGET_CSS $TEMP_CSS && \
  rm -f $TEMP_CSS
}
source /root/.bash_profile && \
node src/main/build/r.js -o src/main/build/build.js baseUrl=src/main/webapp/lib dir=src/main/webapp/dist && \
minify_css src/main/webapp/index.html src/main/webapp/themes/bootstrap-material-design/css/_.css && \
minify_css src/main/webapp/login.html src/main/webapp/themes/bootstrap-material-design/css/_login.css && \
exit 0
