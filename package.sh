#!/bin/bash
# Usage: ./package.sh version
VERSION="$1"
if [ -z "$VERSION" ]; then
    echo "Error: must specify version"
    exit 1
fi
cd $(dirname $0)
TD=$(pwd)
    
PKG_DIR=$TD/packages
if [ ! -d $PKG_DIR ]; then
    mkdir -p $PKG_DIR
fi
BUILD_DIR=$TD/build

build_package() {
    local pname=$1
    local zipname=$PKG_DIR/$pname-$VERSION.zip
    
    if [ -d $BUILD_DIR ]; then
        rm -Rf $BUILD_DIR
    fi
    if [ -d $BUILD_DIR ]; then
        echo "Cannot remove build dir"
        exit 2
    fi
    mkdir -p $BUILD_DIR
    
    # copy and remove backup files
    cp plugins/$pname/* $BUILD_DIR
    if [ -f $zipname ]; then
        rm $zipname
    fi
    rm $BUILD_DIR/*~ 2>&1 > /dev/null
    
    # add a version
echo "$pname
Version $VERSION (packaged on `date` from `hostname`)

This software is distributed under the following MIT License

Copyright (c) 2010  MapQuest

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
" > $BUILD_DIR/README.txt
    
    # Build zip
    cd $BUILD_DIR
    zip -r $zipname *
}

build_package com_mapquest_maps


