#!/bin/sh

if [[ $1 == 'debug' ]]; then
  npm debug;
else
  npm start;
fi
