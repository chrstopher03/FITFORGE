#!/usr/bin/env bash
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then npm install; fi
node server.mjs
