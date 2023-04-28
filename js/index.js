'use strict';

//* mmへの変換をいつするか。ダウンロード時にまとめてするという手もあり？
//* SVGへの変換だけをfabric.js機能を使って、描画は純粋なcanvasでできないかな？
//* できないなーcanvasで書いたものはfabric.jsでdlできない。空になっちゃってる


// タブを切り替える ------------------------------------------------------------------------
// ?冗長だ。もっと良い書き方にしたい...forで書けないかな？querySelectorAll('.tab')で...

const workspaces = document.querySelectorAll('.workspace');

function removeAppear() {
  workspaces.forEach(workspace => {
    workspace.classList.remove('appear');
  });
}

// document.getElementById('tab-case').addEventListener('click', () => {
//   removeAppear();
//   document.getElementById('part-case').classList.add('appear');
// });

// document.getElementById('tab-strap').addEventListener('click', () => {
//   removeAppear();
//   document.getElementById('part-strap').classList.add('appear');
// });

document.querySelector('#case .tab').addEventListener('click', () => {
  removeAppear();
  document.querySelector('#case .workspace').classList.add('appear');
});
document.querySelector('#strap .tab').addEventListener('click', () => {
  removeAppear();
  document.querySelector('#strap .workspace').classList.add('appear');
});
document.querySelector('#dial .tab').addEventListener('click', () => {
  removeAppear();
  document.querySelector('#dial .workspace').classList.add('appear');
});

// canvas -------------------------------------------------------------------------------
// const canvas = new fabric.StaticCanvas('my-canvas');
const canvas = new fabric.Canvas('my-canvas');

const canvasSize = 500;
const canvasSizeHalf = 250;

// var path = new fabric.Path('M 0 0 L 100 50 L 170 200 z');
// path.set({ left: 0, top: 0 });
// canvas.add(path);
// path.animate('angle', 45, {
//   onChange: canvas.renderAll.bind(canvas)
// });
// const canvasSame = document.getElementById('my-canvas');
// const ctx = canvasSame.getContext('2d');
// ctx.fillRect(10, 10, 100, 200);

// fabric.loadSVGFromURL('./images/test.svg', function(objects, options) {
//   var svg = fabric.util.groupSVGElements(objects, options);
//   canvas.add(svg);
// });

// fabric.loadSVGFromURL('./images/strap.svg', function(objects, options) {
//   const svg = fabric.util.groupSVGElements(objects, options);
//   canvas.add(svg).renderAll();
// });

// canvas.on('mouse:down', function(options) {
//   console.log(options.e.clientX, options.e.clientY);
// });

// fireボタンクリックイベント
// document.getElementById('fire-btn').addEventListener('click', () => {
//   drawCase();
//   drawOpening();
// });

function drawCase(){
  const inputCaseSize = document.getElementById('case-size').value;
  const mmCaseSize = parseInt(inputCaseSize);
  const caseSize = mmToPixel(mmCaseSize);
  const circle = new fabric.Circle({ 
    left: canvasSizeHalf - caseSize / 2,
    top: canvasSizeHalf - caseSize / 2,
    strokeWidth: 1,
    stroke: 'black',
    radius: caseSize / 2,
    fill: 'white',
  });
  canvas.add(circle);
}

function drawOpening() {
  const inputOpeningSize = document.getElementById('opening-size').value;
  const mmOpeningSize = parseInt(inputOpeningSize);
  const openingSize = mmToPixel(mmOpeningSize);
  const circle = new fabric.Circle({
    left: canvasSizeHalf - openingSize / 2,
    top: canvasSizeHalf - openingSize / 2,
    strokeWidth: 1,
    stroke: 'black',
    radius: openingSize / 2,
    fill: 'white',
  });
  canvas.add(circle);
}

// mmからpixelに変換する関数 --------------------------------------------
// ?dpiが72で良いのかどうかわからないがとりあえず...
const dpi = 72;
function mmToPixel(mm) {
  // 1.mmをインチに
  const inch = mm / 25.4;
  // 2.インチをpixelに 72dpiとして
  const pixel = inch * dpi;
  return pixel;
}

// SVGに変換してダウンロードする関数 ----------------------------------------------
// document.getElementById('dl-btn').addEventListener('click', () => {
//   const svgData = canvas.toSVG(); 
//   const blob = new Blob([svgData], {type: 'image/svg+xml'});
//   const link = document.createElement('a');
//   link.download = 'watch.svg';
//   link.href = URL.createObjectURL(blob);
//   link.click();
// });



