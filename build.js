#!/usr/bin/env node
// Concatenates src/*.js (filename order) into dist/index.html (single file, no externals).
const fs=require('fs'),path=require('path');
const SRC=path.join(__dirname,'src'), DIST=path.join(__dirname,'dist');
const files=fs.readdirSync(SRC).filter(f=>f.endsWith('.js')).sort();
let js='';
for(const f of files){ js+='\n// ===== '+f+' =====\n'+fs.readFileSync(path.join(SRC,f),'utf8'); }
// syntax check before shipping
new Function(js);
const html=`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Vintavia</title>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<style>
html,body{margin:0;padding:0;background:#0a0908;height:100%;overflow:hidden;overscroll-behavior:none;touch-action:none;
 -webkit-user-select:none;user-select:none;-webkit-touch-callout:none;font-family:Georgia,serif}
#wrap{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0a0908}
canvas{image-rendering:pixelated;image-rendering:crisp-edges;display:block}
</style>
</head>
<body>
<div id="wrap"><canvas id="screen"></canvas></div>
<script>
${js}
</script>
</body>
</html>`;
fs.mkdirSync(DIST,{recursive:true});
fs.writeFileSync(path.join(DIST,'index.html'),html);
console.log('built dist/index.html — '+(html.length/1024).toFixed(0)+' KB from '+files.length+' modules');
