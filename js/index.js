'use strict';

//* mmへの変換をいつするか。ダウンロード時にまとめてするという手もあり？

const canvas2 = new fabric.Canvas('my-canvas');

const canvas = document.getElementById('my-canvas');
const ctx = canvas.getContext('2d');

const canvasSize = 500;
const canvasSizeHalf = 250;


// fireボタンクリックイベント
document.getElementById('fire-btn').addEventListener('click', () => {
  drawCase();
  drawOpening();
  drawFabric();
});

function drawFabric(){
  const circle = new fabric.Circle({
    left: canvasSizeHalf,
    top: canvasSizeHalf,
    strokeWidth: 1,
    stroke: 'black',
    fill: 'pink',
    radius: 10,
  });
  canvas2.add(circle);
}

// 円を描く関数 --------------------------------------------------------
function drawCase() {
  const inputCaseSize = document.getElementById('case-size').value;
  const mmCaseSize = parseInt(inputCaseSize);
  const caseSize = mmToPixel(mmCaseSize);
  ctx.arc(canvasSizeHalf, canvasSizeHalf, caseSize, (Math.PI/180)*0, (Math.PI/180)* 360);
  ctx.stroke();
}
function drawOpening() {
  const inputOpeningSize = document.getElementById('opening-size').value;
  const mmOpeningSize = parseInt(inputOpeningSize);
  const openingSize = mmToPixel(mmOpeningSize);
  ctx.moveTo(canvasSizeHalf + openingSize, canvasSizeHalf);
  ctx.arc(canvasSizeHalf, canvasSizeHalf, openingSize, (Math.PI/180)*0, (Math.PI/180)* 360);
  ctx.stroke();
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
console.log(mmToPixel(10));
console.log(window.devicePixelRatio);

// SVGでダウンロードする関数 --------------------------------------------------------



document.getElementById('dl-btn').addEventListener('click', () => {
  const svgData = canvas2.toSVG(); 
  console.log(svgData);

  const blob = new Blob([svgData], {type: 'image/svg+xml'});

  const link = document.createElement('a');
  link.download = 'watch.svg';
  link.href = URL.createObjectURL(blob);
  link.click();

});

