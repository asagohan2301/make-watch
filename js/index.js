'use strict';

//* mmへの変換をいつするか。ダウンロード時にまとめてするという手もあり？
//* SVGへの変換だけをfabric.js機能を使って、描画は純粋なcanvasでできないかな？
//* できないなーcanvasで書いたものはfabric.jsでdlできない。空になっちゃってる

// グローバルな関数たち ----------------------------------------------------------------

// mmからpixelに変換する関数 ----------------
// ?dpiが72で良いのかどうかわからない
function mmToPixel(mm) {
  const dpi = 72;
  // mmをインチに
  const inch = mm / 25.4;
  // インチをpixelに(72dpiとして)
  const pixel = inch * dpi;
  return pixel;
}

// inputの入力値(mm)をpixelにして返す関数 ----------------
function inputValueToPixel(id) { //引数にinput要素のid名を受け取る
  const inputValue = document.getElementById(id).value;
  const pixel = mmToPixel(parseInt(inputValue));
  return pixel;
}

// ラジオボタン 選択されたボタンに色をつける ----------------
const radioObjects = [ //ここにラジオボタン要素を追加していく
document.querySelectorAll('input[name="lug-shape"]'),
document.querySelectorAll('input[name="crown-shape"]'),
document.querySelectorAll('input[name="metal-color"]'),
];
radioObjects.forEach(radioObject => {
  selectRadio(radioObject);
});

function selectRadio(radios) {
  radios.forEach(radio => {
    radio.addEventListener('input', () => {
      radios.forEach(radio => {
        radio.parentNode.classList.remove('active');
      });
      radio.parentNode.classList.add('active');
    });
  });
}

// タブを切り替える ----------------
// 一つめのworkspaceを表示させておく
document.querySelector('.component:first-child .workspace').classList.add('appear');
// タブ切り替え
const tabs = document.querySelectorAll('.tab');
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    // ワークスペースの表示
    const workspaces = document.querySelectorAll('.workspace');
    workspaces.forEach(workspace => {
      workspace.classList.remove('appear');
    });
    tab.nextElementSibling.classList.add('appear');
    // 今いるタブのスタイル
    tabs.forEach(tab => {
      tab.classList.remove('active');
    });
    tab.classList.add('active');
  });
});

// canvas common ----------------------------------------------------------------

// 円のクラス ----------------
// インスタンス生成時は radius,left,topなどを指定する
// オプションは何個でも、継承元のプロパティにあるものならoptionsで受け取ってくれるみたい
class WatchCircle extends fabric.Circle {
  constructor(options) {
    super(options);
    this.originX = 'center';
    this.originY = 'center';
    this.stroke = 'black';
    this.strokeWidth = 1;
    this.fill = 'white';
  }
}

// main canvas ----------------------------------------------------------------

// [index] lug:1 case:2 caseOpening:3 dialOpening:4

// fabricインスタンス ----------------
const mainCanvas = new fabric.Canvas('main-canvas');
// const mainCanvas = new fabric.StaticCanvas('main-canvas');
const mainCanvasHalfWidth = 192;
const mainCanvasCenterHeight = mmToPixel(125);

// 変数定義 ----------------
let caseObject;
let openingObject;
let dialObject;
let crownObject; //2種類のクラウンで同じ名前共有できるか？→できたみたい。同時には存在しないから？
let lugObject;
let lugWidth;
const lugThickness = mmToPixel(2);
const lugLength = mmToPixel(8);

// ケース,ケース見切り,文字盤見切りを描く ----------------
// ケース
document.getElementById('case-size').addEventListener('input', () => {
  mainCanvas.remove(caseObject);
  caseObject = new WatchCircle({
    radius: inputValueToPixel('case-size') / 2,
    left: mainCanvasHalfWidth,
    top: mainCanvasCenterHeight,
  });
  mainCanvas.add(caseObject);
  caseObject.moveTo(2);
});
// ケース見切り
document.getElementById('opening-size').addEventListener('input', () => {
  mainCanvas.remove(openingObject);
  openingObject = new WatchCircle({
    radius: inputValueToPixel('opening-size') / 2,
    left: mainCanvasHalfWidth,
    top: mainCanvasCenterHeight,
  });
  mainCanvas.add(openingObject);
  openingObject.moveTo(3);
});
// ダイヤル見切
document.getElementById('dial-size').addEventListener('input', () => {
  mainCanvas.remove(dialObject);
  dialObject = new WatchCircle({
    radius: inputValueToPixel('dial-size') / 2,
    left: mainCanvasHalfWidth,
    top: mainCanvasCenterHeight,
  });
  mainCanvas.add(dialObject);
  dialObject.moveTo(4);
});

// ラグを描く ----------------
// 呼び出し
const lugs = document.querySelectorAll('input[name="lug-shape"]');
lugs.forEach(lug => {
  lug.addEventListener('click', () => {
    // 入力されたラグ幅を変数に代入
    lugWidth = inputValueToPixel('lug-width');
    switch(lug.value) {
      case 'round':
        drawRoundLug();
        break;
      case 'square':
        drawSquareLug();
        break;
    }
  });
});
// lugを4個描く
const lugArray = [];
const adjustValue = 1.7;
function drawRoundLug() {
  lugArray.forEach(lug => {
    mainCanvas.remove(lug);
  });
  for(let i = 0; i < 4; i++) { // i= 0, 1, 2, 3
    fabric.loadSVGFromURL('./images/lug-round.svg', (objects, options) => {
      lugArray[i] = fabric.util.groupSVGElements(objects, options);
      lugArray[i].set({
        originX: 'center',
        left: mainCanvasHalfWidth - lugWidth / 2 - lugThickness / 2,
        top: mainCanvasCenterHeight - caseObject.height / adjustValue,
      });
      if (i === 1 || i === 3) {
        lugArray[i].set({
          left: mainCanvasHalfWidth - lugWidth / 2 - lugThickness / 2 + lugWidth + lugThickness,
        });
      }
      if(i === 2 || i === 3) {
        lugArray[i].set({
          flipY: true,
          top: mainCanvasCenterHeight + caseObject.height / adjustValue - lugLength,
        });
      }
      mainCanvas.add(lugArray[i]);
      lugArray[i].sendToBack();
    });
  }
  mainCanvas.renderAll();
}
function drawSquareLug() {
  lugArray.forEach(lug => {
    mainCanvas.remove(lug);
  });
  for(let i = 0; i < 4; i++) { // i= 0, 1, 2, 3
    fabric.loadSVGFromURL('./images/lug-square.svg', (objects, options) => {
      lugArray[i] = fabric.util.groupSVGElements(objects, options);
      lugArray[i].set({
        originX: 'center',
        left: mainCanvasHalfWidth - lugWidth / 2 - lugThickness / 2,
        top: mainCanvasCenterHeight - caseObject.height / adjustValue,
      });
      if (i === 1 || i === 3) {
        lugArray[i].set({
          left: mainCanvasHalfWidth - lugWidth / 2 - lugThickness / 2 + lugWidth + lugThickness,
        });
      }
      if(i === 2 || i === 3) {
        lugArray[i].set({
          flipY: true,
          top: mainCanvasCenterHeight + caseObject.height / adjustValue - lugLength,
        });
      }
      mainCanvas.add(lugArray[i]);
      lugArray[i].sendToBack();
    });
  }
  mainCanvas.renderAll();
}

// strapの値を変更するたびに生成
let strapWidth;
let upperStrapObject;
let lowerStrapObject;
const defaultStrapWidth = mmToPixel(16);

document.getElementById('strap-width').addEventListener('input', () => {
  mainCanvas.remove(upperStrapObject);
  mainCanvas.remove(lowerStrapObject);
  drawUpperStrap();
  drawLowerStrap();
});

// ベルトを描く ----------------
function drawLowerStrap() {
  fabric.loadSVGFromURL('./images/lower-strap.svg', (objects, options) =>{
    lowerStrapObject = fabric.util.groupSVGElements(objects, options);
    strapWidth = inputValueToPixel('strap-width');
    lowerStrapObject.set({
      originX: 'center',
      left: mainCanvasHalfWidth,
      // strapを描く位置(高さ)を、ケースの位置から取得する
      top: caseObject.top + caseObject.height / 2 + mmToPixel(1),
      scaleX: strapWidth / defaultStrapWidth,
    });
    mainCanvas.add(lowerStrapObject);
  });
}
function drawUpperStrap() {
  fabric.loadSVGFromURL('./images/upper-strap.svg', (objects, options) =>{
    lowerStrapObject = fabric.util.groupSVGElements(objects, options);
    strapWidth = inputValueToPixel('strap-width');
    lowerStrapObject.set({
      originX: 'center',
      originY: 'bottom',
      left: mainCanvasHalfWidth,
      // strapを描く位置(高さ)を、ケースの位置から取得する
      top: caseObject.top - caseObject.height / 2 - mmToPixel(1),
      scaleX: strapWidth / defaultStrapWidth,
    });
    mainCanvas.add(lowerStrapObject);
  });
}



// リュウズを描く ----------------
const crowns = document.querySelectorAll('input[name="crown-shape"]');
crowns.forEach(crown => {
  crown.addEventListener('click', () => {
    switch(crown.value) {
      case 'round':
        drawRoundCrown();
        break;
      case 'square':
        drawSquareCrown();
        break;
    }
  });
});
function drawSquareCrown() {
  mainCanvas.remove(crownObject);
  fabric.loadSVGFromURL('./images/crown-square_re.svg', (objects, options) => {
    crownObject = fabric.util.groupSVGElements(objects, options);
    crownObject.set({
      originY: 'center',
      left: caseObject.left + caseObject.width / 2,
      top: mainCanvasCenterHeight,
    });
    mainCanvas.add(crownObject);
  });
}
function drawRoundCrown() {
  mainCanvas.remove(crownObject);
  fabric.loadSVGFromURL('./images/crown-round_re.svg', (objects, options) => {
    crownObject = fabric.util.groupSVGElements(objects, options);
    crownObject.set({
      originY: 'center',
      left: caseObject.left + caseObject.width / 2,
      top: mainCanvasCenterHeight,
    });
    mainCanvas.add(crownObject);
  });
}
// ?svgを読み込む関数分けられるかな？



// ケースにグラデーションを適応
// クラスを使ってみる！！
class Gradation extends fabric.Gradient {
  constructor(options) {
    super(options);
    this.type = 'linear';
    this.gradientUnits = 'percentage';
    this.coords = { x1: 0, y1: 0, x2: 1, y2: 0 };
  }
}
const goldGradation = new Gradation({
  colorStops:[
    { offset: 0, color: 'rgb(238,215,71)'},
    { offset: .5, color: '#fff'},
    { offset: 1, color: 'rgb(238,215,71)'},
  ]
});
const silverGradation = new Gradation({
  colorStops:[
    { offset: 0, color: 'rgb(211,211,211)'},
    { offset: .5, color: 'rgb(247,247,247)'},
    { offset: 1, color: 'rgb(211,211,211)'},
  ]
});
const pinkGoldGradation = new Gradation({
  colorStops:[
    { offset: 0, color: 'rgb(220,170,119)'},
    { offset: .5, color: 'rgb(255,239,230)'},
    { offset: 1, color: 'rgb(220,170,119)'},
  ]
});

// ボタンクリックでケースに色をつける
const caseColors = document.querySelectorAll('input[name="metal-color"]');
caseColors.forEach(caseColor => {
  caseColor.addEventListener('click', () => {
    switch(caseColor.value) {
      case 'gold':
        caseObject.set({
          fill: goldGradation,
        });
        crownObject.set({
          fill: goldGradation,
        });
        lugArray.forEach(lug => {
          lug.set({
            fill: goldGradation,
          });
        });
        break;
      case 'silver':
        caseObject.set({
          fill: silverGradation,
        });
        crownObject.set({
          fill: silverGradation,
        });
        lugArray.forEach(lug => {
          lug.set({
            fill: silverGradation,
          });
        });
        break;
      case 'pink-gold':
        caseObject.set({
          fill: pinkGoldGradation,
        });
        crownObject.set({
          fill: pinkGoldGradation,
        });
        lugArray.forEach(lug => {
          lug.set({
            fill: pinkGoldGradation,
          });
        });
        break;
    }
    mainCanvas.renderAll();
  });
});







// info canvas ----------------------------------------------------------------

// fabricインスタンス  ----------------
const infoCanvas = new fabric.Canvas('info-canvas');
// const infoCanvas = new fabric.StaticCanvas('info-canvas');
const infoCanvasHalfHeight = 102;
const infoCanvasHalfWidth = 130;


const infoCanvasCase = new WatchCircle({
  radius: 45,
}, infoCanvasHalfWidth, infoCanvasHalfHeight);
const infoCanvasOpening = new WatchCircle({
  radius: 39,
});
const infoCanvasDialOpening = new WatchCircle({
  radius: 36,
});
infoCanvas.add(infoCanvasCase, infoCanvasOpening, infoCanvasDialOpening);

// lug生成
function drawInfoCanvasLug() {
  console.log('lug');
  const infoLugArray = [];
  for(let i = 0; i < 4; i++) { // i= 0, 1, 2, 3
    fabric.loadSVGFromURL('./images/lug-round.svg', (objects, options) => {
      infoLugArray[i] = fabric.util.groupSVGElements(objects, options);
      infoLugArray[i].set({
        originX: 'center',
        originY: 'center',
        left: infoCanvasHalfWidth - 26,
        top: infoCanvasHalfHeight - 44,
      });
      if (i === 1 || i === 3) {
        infoLugArray[i].set({
          left: infoCanvasHalfWidth + 26,
        });
      }
      if(i === 2 || i === 3) {
        infoLugArray[i].set({
          flipY: true,
          top: infoCanvasHalfHeight + 44,
        });
      }
      infoCanvas.add(infoLugArray[i]);
      infoLugArray[i].sendToBack();
    });
  }
  mainCanvas.renderAll();
}
drawInfoCanvasLug();

// りゅうず生成
fabric.loadSVGFromURL('./images/crown-round.svg', (objects, options) => {
  const infoCanvasCrown = fabric.util.groupSVGElements(objects, options);
  infoCanvasCrown.set({
    originY: 'center',
    top: infoCanvasHalfHeight,
    left: infoCanvasHalfWidth + 45,
  });
  infoCanvas.add(infoCanvasCrown);
});

// 矢印生成
const line = new fabric.Polyline([
  {x: 85, y: infoCanvasHalfHeight},
  {x: 175, y: infoCanvasHalfHeight}], {
  stroke: 'red',
});
const tipLeft = new fabric.Polyline([
  {x: 101, y: infoCanvasHalfHeight - 6},
  {x: 85, y: infoCanvasHalfHeight},
  {x: 101, y: infoCanvasHalfHeight + 6}],{
  stroke: 'red',
  fill: 'transparent',
});
const tipRight = new fabric.Polyline([
  {x: 159, y: infoCanvasHalfHeight - 6},
  {x: 175, y: infoCanvasHalfHeight},
  {x: 159, y: infoCanvasHalfHeight + 6}],{
  stroke: 'red',
  fill: 'transparent',
});


// フォーカスで説明を表示 ------------------------------------------
const infoIntroduction = document.querySelector('.info-introduction');
infoIntroduction.classList.add('appear');

document.getElementById('case-size').addEventListener('focus', () => {
  appearInfo(infoCanvasCase, 'case-comment');
  infoCanvasCase.animate('stroke', 'red', {
    onChange: infoCanvas.renderAll.bind(infoCanvas)
  });
  infoCanvas.add(line, tipLeft, tipRight);
  infoIntroduction.classList.remove('appear');
});
document.getElementById('case-size').addEventListener('blur', () => {
  removeInfo(infoCanvasCase, 'case-comment');
  infoCanvas.remove(line, tipLeft, tipRight);
  infoIntroduction.classList.add('appear');

});
document.getElementById('case-size').addEventListener('input', () => {
  // document.getElementById('case-size').focus();
  removeInfo(infoCanvasCase, 'case-comment');
  infoCanvas.remove(line, tipLeft, tipRight);
});

function appearInfo(object, id) {
  document.getElementById(id).classList.add('appear');
  object.set({
    stroke: 'red',
  });
  infoCanvas.renderAll();
}

function removeInfo(object, id) {
  document.getElementById(id).classList.remove('appear');
  object.set({
    stroke: 'black',
  });
  infoCanvas.renderAll();
}

// canvasの内容をSVGに変換してダウンロードする --------------------------------------------------------
document.getElementById('dl-btn').addEventListener('click', () => {
  // fabric.jsのtoSVGメソッドを使って、canvasの内容をSVG形式のテキストデータに変換
  const svgData = mainCanvas.toSVG(); 
  // SVGをblobに変換
  const blob = new Blob([svgData], {type: 'image/svg+xml'});
  // aタグを生成して、
  const link = document.createElement('a');
  // ダウンロードリンクのURLを、BlobオブジェクトのURLに設定します。BlobオブジェクトのURLは、URL.createObjectURL()メソッドを使用して作成されます。
  link.href = URL.createObjectURL(blob);
  // ダウンロードするファイルの名前を指定して、
  link.download = 'watch.svg';
  // リンクを自動的にクリックしてダウンロードさせる
  link.click();
  // オブジェクト URL を解放
  URL.revokeObjectURL(link.href);
});

// canvasの(ページの？)座標をconsoleに表示する -----------------------------------------------
const headerHeight = 62;
mainCanvas.on('mouse:down', function(options) {
  console.log(`x座標:${options.e.clientX}`, `y座標:${options.e.clientY - headerHeight}`);
});

// test -----------------------------------------------------------------------------------
import { testBtn, testColorPicker } from './test.js';
testBtn();
testColorPicker();

const text = new fabric.Text('hello', {
  left: 100,
  top: 100,
  originX: 'center',
  originY: 'center',
  fill: 'red',
  fontFamily: 'cursive',
  stroke: 'black',
});
// mainCanvas.add(text);

console.log('ピクセル密度:' + window.devicePixelRatio);

const circle = new fabric.Circle({
  radius: 50,
  left: 200,
  top: 300,
  fill: 'blue',
});
// mainCanvas.add(circle);

const group = new fabric.Group([ text, circle ], {
  left: 200,
  top: 200,
  originX: 'center',
  originY: 'center',
});
mainCanvas.add(group);

const range = document.getElementById('test-range');
range.addEventListener('input', () => {
  const rangeValue = parseInt(range.value);
  group.set({
    scaleX: rangeValue / 10,
    scaleY: rangeValue / 10,
    strokeWidth: 1 / rangeValue,
  });
  group.item(0).set(
    'text', 'good'
  );
  mainCanvas.renderAll();
});

var textPath = new fabric.Text('Text on a path', {
  top: 150,
  left: 150,
  textAlign: 'center',
  charSpacing: -50,
  path: new fabric.Path('M 0 0 C 50 -100 150 -100 200 0', {
      strokeWidth: 1,
      visible: false
  }),
  pathSide: 'left',
  pathStartOffset: 0
});
mainCanvas.add(textPath);

// document.getElementById('test-btn').addEventListener('click', () => {
//   // fabric.jsのtoSVGメソッドを使って、canvasの内容をSVG形式のテキストデータに変換
//   const svgData = infoCanvas.toSVG(); 
//   // SVGをblobに変換
//   const blob = new Blob([svgData], {type: 'image/svg+xml'});
//   // aタグを生成して、
//   const link = document.createElement('a');
//   // ダウンロードリンクのURLを、BlobオブジェクトのURLに設定します。BlobオブジェクトのURLは、URL.createObjectURL()メソッドを使用して作成されます。
//   link.href = URL.createObjectURL(blob);
//   // ダウンロードするファイルの名前を指定して、
//   link.download = 'watch.svg';
//   // リンクを自動的にクリックしてダウンロードさせる
//   link.click();
//   // オブジェクト URL を解放
//   URL.revokeObjectURL(link.href);
// });
const canvasRange = document.getElementById('canvas-range');
canvasRange.addEventListener('input', () => {
  mainCanvas.setZoom(canvasRange.value);
});

const ctx = document.getElementById('test-canvas').getContext('2d');
ctx.font = '14px sans-serif';
ctx.fillText('ケースの直径を入力', 10, 50);


