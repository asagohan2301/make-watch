'use strict';

import '../css/style.css';
import { fabric } from "fabric";

//* mmへの変換をいつするか。ダウンロード時にまとめてするという手もあり？
//* SVGへの変換だけをfabric.js機能を使って、描画は純粋なcanvasでできないかな？
//* できないなーcanvasで書いたものはfabric.jsでdlできない。空になっちゃってる

console.log('webserver');

// common ----------------------------------------------------------------

import { downloadSVG } from './download.js';
downloadSVG();

// mmからpixelに変換する関数 ----------------
//? dpiが72で良いのかどうかわからない
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

// style ----------------------------------------------------------------

// 選択されたラジオボタンに色をつける ----------------
const radioObjects = [ //ここにラジオボタン要素を追加していく
document.querySelectorAll('input[name="lug-shape"]'),
document.querySelectorAll('input[name="crown-shape"]'),
document.querySelectorAll('input[name="case-color"]'),
document.querySelectorAll('input[name="hole-quantity"]'),
document.querySelectorAll('input[name="hole-distance"]'),
document.querySelectorAll('input[name="stitch"]'),
document.querySelectorAll('input[name="strap-shape"]'),
document.querySelectorAll('input[name="strap-color"]'),
document.querySelectorAll('input[name="buckle-shape"]'),
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
const lugArray = [];
let lugWidth;
let checkedLugValue = 'round'; //初期値
let checkedCrownValue = 'round'; //初期値
const lugThickness = mmToPixel(2);
const lugLength = mmToPixel(8);
let inputCaseColor = 'white'; //初期値
let inputStrapColor = 'white'; //初期値

// ケース,ケース見切り,文字盤見切りを描く ----------------
// ケース
document.getElementById('case-size').addEventListener('input', () => {
  mainCanvas.remove(caseObject);
  caseObject = new WatchCircle({
    radius: inputValueToPixel('case-size') / 2,
    left: mainCanvasHalfWidth,
    top: mainCanvasCenterHeight,
  });
  // すでに色が選ばれていた場合はその色にする
  caseObject.set({
    fill: inputCaseColor,
  });
  mainCanvas.add(caseObject);
  // ラグ再描画
  if (lugArray !== undefined) {
    switch(checkedLugValue) { // checkedLugValueの初期値は'round'
      case 'round':
        roundLug.drawLug();
        break;
      case 'square':
        squareLug.drawLug();
        break;
    }
  }
  // リュウズ再描画
  if (crownObject !== undefined) {
    switch(checkedCrownValue) {
      case 'round':
        roundCrown.drawCrown();
        break;
      case 'square':
        squareCrown.drawCrown();
        break;
    }
  }
  // ベルト再描画
  // ベルトを描画する関数内で、ステッチとベルト穴を描画する関数も呼ばれる
  if (upperStrapObject !== undefined) {
    drawUpperStrap();
  }
  if (lowerStrapObject !== undefined) {
    drawLowerStrap();
  }
  // 重なり順を直す
  stackingOrder();
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
  stackingOrder();
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
  stackingOrder();
});

// ラグを描く ----------------
const lugs = document.querySelectorAll('input[name="lug-shape"]');
// ラグ幅が入力されたらcanvasに描画
document.getElementById('lug-width').addEventListener('input', () => {
  lugWidth = inputValueToPixel('lug-width');
  lugs.forEach(lug => {
    if(lug.checked){
      checkedLugValue = lug.value;
    }
  });
  switch(checkedLugValue) { // checkedLugValueの初期値は'round'
    case 'round':
      roundLug.drawLug();
      break;
    case 'square':
      squareLug.drawLug();
      break;
  }
  // ベルト再描画
  // ベルトを描画する関数内で、ステッチとベルト穴を描画する関数も呼ばれる
  if (upperStrapObject !== undefined) {
    drawUpperStrap();
  }
  if (lowerStrapObject !== undefined) {
    drawLowerStrap();
  }
});
// ラグの形状が選ばれたらcanvasに描画
lugs.forEach(lug => {
  lug.addEventListener('input', () => {
    switch(lug.value) {
      case 'round':
        roundLug.drawLug();
        break;
      case 'square':
        squareLug.drawLug();
        break;
    }
  });
});
// ラグのクラス
//* ラグ4つをグループ化したい→うまくできない
class WatchLug {
  constructor(url) {
    this.url = url;
  }
  drawLug() {
    const adjustValue = 1.7; //! 要検討
    lugArray.forEach(lugObject => {
      mainCanvas.remove(lugObject);
    });
    for(let i = 0; i < 4; i++) { // i= 0, 1, 2, 3
      fabric.loadSVGFromURL(this.url, (objects, options) => {
        lugArray[i] = fabric.util.groupSVGElements(objects, options);
        lugArray[i].set({
          originX: 'center',
          left: mainCanvasHalfWidth - lugWidth / 2 - lugThickness / 2,
          top: mainCanvasCenterHeight - caseObject.height / adjustValue,
          fill: inputCaseColor,
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
        stackingOrder();
      });
    }
    mainCanvas.renderAll();
  }
}

// memo: roundLugはオブジェクトではなく、インスタンスが持つメソッドdrawLugで生成したlugArrayがオブジェクト？
const roundLug = new WatchLug('./assets/lug-round.svg');
const squareLug = new WatchLug('./assets/lug-square.svg');

// リュウズを描く ----------------
const crowns = document.querySelectorAll('input[name="crown-shape"]');
crowns.forEach(crown => {
  crown.addEventListener('input', () => {
    checkedCrownValue = crown.value;
    switch(checkedCrownValue) {
      case 'round':
        roundCrown.drawCrown();
        break;
      case 'square':
        squareCrown.drawCrown();
        break;
    }
  });
});
// リュウズのクラス
class WatchCrown {
  constructor(url) {
    this.url = url;
  }
  drawCrown() {
    mainCanvas.remove(crownObject);
    fabric.loadSVGFromURL(this.url, (objects, options) => {
      crownObject = fabric.util.groupSVGElements(objects, options);
      crownObject.set({
        originY: 'center',
        left: caseObject.left + caseObject.width / 2,
        top: mainCanvasCenterHeight,
        fill: inputCaseColor,
      });
      mainCanvas.add(crownObject);
    });
  }
}
// リュウズのインスタンス生成
const roundCrown = new WatchCrown('./assets/crown-round_re.svg');
const squareCrown = new WatchCrown('./assets/crown-square_re.svg');

// 金属色 ----------------
// グラデーションクラス
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

// カラーピッカー
const caseColorPicker = document.getElementById('case-color-picker');
const strapColorPicker = document.getElementById('strap-color-picker');
caseColorPicker.addEventListener('input', () => {
  // ボタンの色を変える
  caseColorPicker.previousElementSibling.style.backgroundColor = caseColorPicker.value;
  // inputCaseColorに値を入れておく
  inputCaseColor = caseColorPicker.value;
  // オブジェクトに色をつける
  applyCaseColor();
  // colorPicker(caseColorPicker, inputCaseColor)
});
strapColorPicker.addEventListener('input', () => {
  // ボタンの色を変える
  strapColorPicker.previousElementSibling.style.backgroundColor = strapColorPicker.value;
  // inputCaseColorに値を入れておく
  inputStrapColor = strapColorPicker.value;
  // オブジェクトに色をつける
  applyStrapColor();
  // colorPicker(caseColorPicker, inputCaseColor)
});
// カラーピッカーをクリックしたときにも、radioをクリックしたことにする
caseColorPicker.addEventListener('click', () => {
  caseColorPicker.previousElementSibling.previousElementSibling.firstElementChild.click();
});

// オブジェクトがすでにあれば色を付ける
// オブジェクトがまだなければ色を保持しておいて、オブジェクトが生成されたときに色を付ける
const metalColors = document.querySelectorAll('input[name="case-color"]');
metalColors.forEach(metalColor => {
  metalColor.addEventListener('input', () => {
    // 色のラジオボタンを押した時点で、inputCaseColorに値を入れておく
    switch(metalColor.value) {
      case 'gold':
        inputCaseColor = goldGradation;
        break;
      case 'silver':
        inputCaseColor = silverGradation;
        break;
      case 'pink-gold':
        inputCaseColor = pinkGoldGradation;
        break;
      case 'custom-color':
        inputCaseColor = caseColorPicker.value;
        break;
    }
    // オブジェクトに色をつける
    applyCaseColor();
  });
});

// オブジェクトに色をつける関数 
function applyCaseColor() {
  if (caseObject !== undefined) {
    caseObject.set({
      fill: inputCaseColor,
    });
  }
  if (crownObject !== undefined) {
    crownObject.set({
      fill: inputCaseColor,
    });
  }
  if (lugArray !== undefined) {
    lugArray.forEach(lugObject => {
      lugObject.set({
        fill: inputCaseColor,
      });
    });
  }
  mainCanvas.renderAll();
}

// 重なり順を直す関数 ----------------
function stackingOrder() {
  if (lugArray !== undefined) {
    lugArray.forEach(lugObject => {
      lugObject.moveTo(1);
    });
  }
  if (caseObject !== undefined) {
    caseObject.moveTo(5);
  }
  if (openingObject !== undefined) {
    openingObject.moveTo(6);
  }
  if (dialObject !== undefined) {
    dialObject.moveTo(7);
  }
  if (upperStrapObject !== undefined) {
    upperStrapObject.moveTo(8);
  }
  if (lowerStrapObject !== undefined) {
    lowerStrapObject.moveTo(9);
  }
  if (upperStrapStitchObject !== undefined) {
    upperStrapObject.moveTo(10);
  }
  if (lowerStrapStitchObject !== undefined) {
    lowerStrapObject.moveTo(11);
  }
  if (strapHoleObjects.length !== 0) {
    strapHoleObjects.forEach(strapHoleObject => {
      strapHoleObject.moveTo(12);
    });
  }
}

// ベルト ----------------
let strapWidth;
let upperStrapObject;
let lowerStrapObject;
const defaultStrapWidth = mmToPixel(16); //用意したSVGのベルト幅
const defaultUpperStrapLength = mmToPixel(70); //用意したSVGのベルト長さ
const defaultLowerStrapLength = mmToPixel(110); //用意したSVGのベルト長さ

document.getElementById('upper-strap-length').addEventListener('input', () => {
  drawUpperStrap();
});
document.getElementById('lower-strap-length').addEventListener('input', () => {
  drawLowerStrap();
});

// ベルトを描く ----------------
function drawUpperStrap() {
  mainCanvas.remove(upperStrapObject);
  fabric.loadSVGFromURL('./assets/upper-strap.svg', (objects, options) =>{
    upperStrapObject = fabric.util.groupSVGElements(objects, options);
    strapWidth = lugWidth;
    upperStrapObject.set({
      originX: 'center',
      originY: 'bottom',
      left: mainCanvasHalfWidth,
      // strapを描く位置(高さ)を、ケースの位置から取得する
      top: caseObject.top - caseObject.height / 2 - mmToPixel(1),
      // 入力値にあわせて幅と長さを拡大縮小
      scaleX: strapWidth / defaultStrapWidth,
      scaleY: inputValueToPixel('upper-strap-length') / defaultUpperStrapLength,
      // 線幅を保つ
      strokeUniform: true,
    });
    mainCanvas.add(upperStrapObject);
    // 重なり順を直す
    //* stackingOrderはここで呼ばないとだめ!{}外だと効かない
    stackingOrder();
  });
  // ベルト穴再描画
  if (strapHoleObjects.length !== 0) {
    drawStrapHoles();
  }
  // ステッチ再描画
  if (upperStrapStitchObject !== undefined || lowerStrapStitchObject !== undefined) {
    drawStitch();
  }
}

function drawLowerStrap() {
  mainCanvas.remove(lowerStrapObject);
  fabric.loadSVGFromURL('./assets/lower-strap.svg', (objects, options) =>{
    lowerStrapObject = fabric.util.groupSVGElements(objects, options);
    strapWidth = lugWidth;
    lowerStrapObject.set({
      originX: 'center',
      left: mainCanvasHalfWidth,
      // strapを描く位置(高さ)を、ケースの位置から取得する
      top: caseObject.top + caseObject.height / 2 + mmToPixel(1),
      // 入力値にあわせて幅と長さを拡大縮小
      scaleX: strapWidth / defaultStrapWidth,
      scaleY: inputValueToPixel('lower-strap-length') / defaultLowerStrapLength,
      // 線幅を保つ
      strokeUniform: true,
    });
    mainCanvas.add(lowerStrapObject);
    // 重なり順を直す
    //* stackingOrderはここで呼ばないとだめ!{}外だと効かない
    stackingOrder();
  });
  // ベルト穴再描画
  if (strapHoleObjects.length !== 0) {
    drawStrapHoles();
  }
  // ステッチ再描画
  if (upperStrapStitchObject !== undefined || lowerStrapStitchObject !== undefined) {
    drawStitch();
  }
}

// ベルト穴を描く ---------------- 

// 変数定義
let strapHoleObjects = [];
let strapHoleQuantity = 6; // 初期値
let strapHoleDistance = mmToPixel(7); // 初期値
let upperStrapStitchObject;
let lowerStrapStitchObject;
let countDistance = 0; // 一番下の穴からどれくらい移動するかを保持する変数

// inputで関数呼び出し
const strapHoleQuantityInputs = document.querySelectorAll('input[name="hole-quantity"]');
strapHoleQuantityInputs.forEach(strapHoleQuantityInput => {
  strapHoleQuantityInput.addEventListener('input', () => {
    strapHoleQuantity = parseInt(strapHoleQuantityInput.value);
    drawStrapHoles();
  });
});

const holeDistanceInputs = document.querySelectorAll('input[name="hole-distance"]');
holeDistanceInputs.forEach(holeDistanceInput => {
  holeDistanceInput.addEventListener('input', () => {
    strapHoleDistance = mmToPixel(parseInt(holeDistanceInput.value));
    drawStrapHoles();
  });
});

// ベルト穴を描く関数
function drawStrapHoles() {
  // canvasから前回のオブジェクトを取り除く
  strapHoleObjects.forEach(strapHoleObject => {
    mainCanvas.remove(strapHoleObject);
  });
  // canvasから取り除いても配列内にはオブジェクトが残ったままなので、
  // 前回分もあわせた、例えば14個のオブジェクトが描画されてしまう
  // よってここで配列を空にしておく
  strapHoleObjects = [];
  
  for(let i = 0; i < strapHoleQuantity ; i++) {
    const strapHoleObject = new fabric.Circle({
      radius: mmToPixel(0.75),
      originX: 'center',
      originY: 'center',
      left: mainCanvasHalfWidth,
      top: lowerStrapObject.top + (lowerStrapObject.height * inputValueToPixel('lower-strap-length') / defaultLowerStrapLength) - mmToPixel(25) - countDistance,
      stroke: 'black',
      fill: 'white',
    });
    strapHoleObjects.push(strapHoleObject);
    countDistance += strapHoleDistance;
  }
  strapHoleObjects.forEach(strapHoleObject => {
    mainCanvas.add(strapHoleObject);
  });
  // 一番下の穴からどれくらい移動するかを保持する変数を0に戻す
  countDistance = 0;
}

// ステッチを描く
const stitchInputs = document.querySelectorAll('input[name="stitch"]');
stitchInputs.forEach(stitchInput => {
  stitchInput.addEventListener('input', () => {
    if (stitchInput.value === 'with-stitch') {
      drawStitch();
    }
  });
});

// ステッチを描く関数
function drawStitch() {
  mainCanvas.remove(upperStrapStitchObject);
  mainCanvas.remove(lowerStrapStitchObject);
  // 基本はlowerStrapObjectと同じで、位置の調整と点線に変更
  // upper
  fabric.loadSVGFromURL('./assets/upper-strap-stitch.svg', (objects, options) =>{
    upperStrapStitchObject = fabric.util.groupSVGElements(objects, options);
    strapWidth = lugWidth;
    upperStrapStitchObject.set({
      originX: 'center',
      originY: 'bottom',
      left: mainCanvasHalfWidth,
      // strapを描く位置(高さ)を、ケースの位置から取得する 3mm上に移動する
      top: caseObject.top - caseObject.height / 2 - mmToPixel(1) - mmToPixel(3),
      // 入力値にあわせて幅と長さを拡大縮小
      scaleX: strapWidth / defaultStrapWidth,
      scaleY: inputValueToPixel('upper-strap-length') / defaultUpperStrapLength,
      // 線幅を保つ
      strokeUniform: true,
      // 点線に
      strokeDashArray: [8, 2],
    });
    mainCanvas.add(upperStrapStitchObject);
  });
  // lower
  fabric.loadSVGFromURL('./assets/lower-strap-stitch.svg', (objects, options) =>{
    lowerStrapStitchObject = fabric.util.groupSVGElements(objects, options);
    strapWidth = lugWidth;
    lowerStrapStitchObject.set({
      originX: 'center',
      left: mainCanvasHalfWidth,
      // strapを描く位置(高さ)を、ケースの位置から取得する 3mm下に移動する
      top: caseObject.top + caseObject.height / 2 + mmToPixel(1) + mmToPixel(3),
      // 入力値にあわせて幅と長さを拡大縮小
      scaleX: strapWidth / defaultStrapWidth,
      scaleY: inputValueToPixel('lower-strap-length') / defaultLowerStrapLength,
      // 線幅を保つ
      strokeUniform: true,
      // 点線に
      strokeDashArray: [8, 2],
    });
    mainCanvas.add(lowerStrapStitchObject);
  });
}

// テスト用
//* widthとheightを指定しても、余白がその分増えるだけで線を書いた部分のwidth/heightが指定できるわけではない。
//* SVGを読み込んでFabric.jsオブジェクトに変換した場合、SVG内の要素はパスやシェイプとして解釈されます。このため、線のある部分を単独で拡大するという操作は、SVG要素の構造的な変更を伴うため、単純には行えません。
// *SVG読み込み時には、周りに余白があっても無視されているようだ。

document.getElementById('button-for-test').addEventListener('click', () => {

});

document.getElementById('button-for-test2').addEventListener('click', () => {

});


// info canvas ----------------------------------------------------------------

// fabricインスタンス ----------------
const caseInfoCanvas = new fabric.StaticCanvas('case-info-canvas');
// const caseInfoCanvas = new fabric.Canvas('case-info-canvas');
const caseInfoCanvasCenterHeight = 118;
const caseInfoCanvasHalfWidth = 130;
const caseInfoCanvasCaseRadius = 45;
const caseInfoCanvasOpeningRadius = 39;
const caseInfoCanvasDialRadius = 36;
const caseInfoCanvasLugHalfDistance = 26;

// 時計の図を生成 ----------------
// ケースなど
const caseInfoCanvasCase = new WatchCircle({
  radius: caseInfoCanvasCaseRadius,
  left: caseInfoCanvasHalfWidth,
  top: caseInfoCanvasCenterHeight,
});
const caseInfoCanvasOpening = new WatchCircle({
  radius: caseInfoCanvasOpeningRadius,
  left: caseInfoCanvasHalfWidth,
  top: caseInfoCanvasCenterHeight,
});
const caseInfoCanvasDial = new WatchCircle({
  radius: caseInfoCanvasDialRadius,
  left: caseInfoCanvasHalfWidth,
  top: caseInfoCanvasCenterHeight,
});
caseInfoCanvas.add(caseInfoCanvasCase, caseInfoCanvasOpening, caseInfoCanvasDial);
// ラグ
const infoLugArray = [];
for(let i = 0; i < 4; i++) { // i= 0, 1, 2, 3
  fabric.loadSVGFromURL('./assets/lug-round.svg', (objects, options) => {
    infoLugArray[i] = fabric.util.groupSVGElements(objects, options);
    infoLugArray[i].set({
      originX: 'center',
      originY: 'center',
      left: caseInfoCanvasHalfWidth - caseInfoCanvasLugHalfDistance,
      top: caseInfoCanvasCenterHeight - 44,
    });
    if (i === 1 || i === 3) {
      infoLugArray[i].set({
        left: caseInfoCanvasHalfWidth + caseInfoCanvasLugHalfDistance,
      });
    }
    if(i === 2 || i === 3) {
      infoLugArray[i].set({
        flipY: true,
        top: caseInfoCanvasCenterHeight + 44,
      });
    }
    caseInfoCanvas.add(infoLugArray[i]);
    infoLugArray[i].sendToBack();
  });
}
mainCanvas.renderAll();
// リュウズ
let caseInfoCanvasCrown;
fabric.loadSVGFromURL('./assets/crown-round_re.svg', (objects, options) => {
  caseInfoCanvasCrown = fabric.util.groupSVGElements(objects, options);
  caseInfoCanvasCrown.set({
    originY: 'center',
    top: caseInfoCanvasCenterHeight,
    left: caseInfoCanvasHalfWidth + caseInfoCanvasCaseRadius,
  });
  caseInfoCanvas.add(caseInfoCanvasCrown);
});

// 矢印 ----------------
// 矢印クラス
class Arrow {
  constructor(radius) {
    this.leftMost = caseInfoCanvasHalfWidth - radius;
    this.rightMost = caseInfoCanvasHalfWidth + radius;
    this.line = new fabric.Polyline([
      {x: this.leftMost, y: caseInfoCanvasCenterHeight},
      {x: this.rightMost, y: caseInfoCanvasCenterHeight}], {
      stroke: 'red',
    });
    this.tipLeft = new fabric.Polyline([
      {x: this.leftMost + 16, y: caseInfoCanvasCenterHeight - 6},
      {x: this.leftMost, y: caseInfoCanvasCenterHeight},
      {x: this.leftMost + 16, y: caseInfoCanvasCenterHeight + 6}],{
      stroke: 'red',
      fill: 'transparent',
    });
    this.tipRight = new fabric.Polyline([
      {x: this.rightMost - 16, y: caseInfoCanvasCenterHeight - 6},
      {x: this.rightMost, y: caseInfoCanvasCenterHeight},
      {x: this.rightMost - 16, y: caseInfoCanvasCenterHeight + 6}],{
      stroke: 'red',
      fill: 'transparent',
    });
  }
  drawArrow() {
    caseInfoCanvas.add(this.line, this.tipLeft, this.tipRight);
  }
  removeArrow() {
    caseInfoCanvas.remove(this.line, this.tipLeft, this.tipRight)
  }
}
const caseArrow = new Arrow(caseInfoCanvasCaseRadius);
const openingArrow = new Arrow(caseInfoCanvasOpeningRadius);
const dialArrow = new Arrow(caseInfoCanvasDialRadius);
const lugArrow = new Arrow(caseInfoCanvasLugHalfDistance - lugThickness / 2);

// 説明を表示 ----------------
// 変数定義
const infoIntroduction = document.querySelector('.info-introduction');
const textBoxCase = document.getElementById('case-size');
const textBoxOpening = document.getElementById('opening-size');
const textBoxDial = document.getElementById('dial-size');
const textBoxLug = document.getElementById('lug-width');
const comment = {
  default: '入力するパーツの説明が表示されます',
  caseSize: 'ケースの直径をmm単位で入力してください',
  openingSize: 'ケース見切りの直径をmm単位で入力してください',
  dialSize: '文字盤の直径をmm単位で入力してください',
  lugWidth: 'ラグの間の距離をmm単位で入力してください',
  lugShape: 'ラグの形状を選択してください',
  crownShape: 'りゅうずの形状を選択してください',
  metalColor: 'ケース、ラグ、りゅうずにつける色を選択してください',
}
// イベントで関数呼び出し
// case
textBoxCase.addEventListener('focus', () => {
  appearArrowInfo(caseInfoCanvasCase, caseArrow);
  fadeInComment(comment.caseSize);
});
textBoxCase.addEventListener('blur', () => {
  disappearArrowInfo(caseInfoCanvasCase, caseArrow);
  fadeOutComment();
});
textBoxCase.addEventListener('input', () => {
  disappearArrowInfo(caseInfoCanvasCase, caseArrow);
  fadeOutComment();
});
// opening
textBoxOpening.addEventListener('focus', () => {
  appearArrowInfo(caseInfoCanvasOpening, openingArrow);
  fadeInComment(comment.openingSize);
});
textBoxOpening.addEventListener('blur', () => {
  disappearArrowInfo(caseInfoCanvasOpening, openingArrow);
  fadeOutComment();
});
textBoxOpening.addEventListener('input', () => {
  disappearArrowInfo(caseInfoCanvasOpening, openingArrow);
  fadeOutComment();
});
// dial
textBoxDial.addEventListener('focus', () => {
  appearArrowInfo(caseInfoCanvasDial, dialArrow);
  fadeInComment(comment.dialSize);
});
textBoxDial.addEventListener('blur', () => {
  disappearArrowInfo(caseInfoCanvasDial, dialArrow);
  fadeOutComment();
});
textBoxDial.addEventListener('input', () => {
  disappearArrowInfo(caseInfoCanvasDial, dialArrow);
  fadeOutComment();
});
// lug
textBoxLug.addEventListener('focus', () => {
  lugArrow.drawArrow();
  // 生成したオブジェクトの位置を書き換え
  // memo: インスタンスのフィールドであるlineなどがfabricオブジェクト？
  lugArrow.line.set({
    top: caseInfoCanvasCenterHeight - caseInfoCanvasCaseRadius - 6,
  });
  lugArrow.tipLeft.set({
    top: caseInfoCanvasCenterHeight - caseInfoCanvasCaseRadius - 12,
  });
  lugArrow.tipRight.set({
    top: caseInfoCanvasCenterHeight - caseInfoCanvasCaseRadius - 12,
  });
  fadeInComment(comment.lugWidth);
});
textBoxLug.addEventListener('blur', () => {
  lugArrow.removeArrow();
  fadeOutComment();
});
textBoxLug.addEventListener('input', () => {
  lugArrow.removeArrow();
  fadeOutComment();
});
// lug shape
const lugLists = document.querySelectorAll('.shape-list-lug li');
lugLists.forEach(list => {
  list.addEventListener('mouseover', () => {
    infoLugArray.forEach(lug => {
      appearShapeInfo(lug, comment.lugShape);
    });
  });
  list.addEventListener('mouseleave', () => {
    infoLugArray.forEach(lug => {
      disappearShapeInfo(lug);
    });
  });
});
// crown shape
const crownLists = document.querySelectorAll('.shape-list-crown li');
crownLists.forEach(list => {
  list.addEventListener('mouseover', () => {
    appearShapeInfo(caseInfoCanvasCrown, comment.crownShape);
  });
  list.addEventListener('mouseleave', () => {
    disappearShapeInfo(caseInfoCanvasCrown);
  });
});
// metal color
let colorChangeLists;
window.addEventListener('load', () => {
  // 色を変えたいオブジェクトを配列にまとめておく
  colorChangeLists = [caseInfoCanvasCase, caseInfoCanvasCrown, ...infoLugArray];
});
const colorLists = document.querySelectorAll('.shape-list-color li');
colorLists.forEach(list => {
  list.addEventListener('mouseover', () => {
    colorChangeLists.forEach(colorChangeList => {
      colorChangeList.set({
        fill: '#e2e2e2',
      });
    });
    caseInfoCanvas.renderAll();
    infoIntroduction.textContent = comment.metalColor;
  });
  list.addEventListener('mouseleave', () => {
    colorChangeLists.forEach(colorChangeList => {
      colorChangeList.set({
        fill: 'white',
      });
    });
    caseInfoCanvas.renderAll();
    infoIntroduction.textContent = comment.default;
  });
});

// 説明(矢印つき)を表示,非表示する関数
function appearArrowInfo(object, arrow) {
  object.set({
    stroke: 'red',
  });
  arrow.drawArrow();
}
function disappearArrowInfo(object, arrow) {
  object.set({
    stroke: 'black',
  });
  arrow.removeArrow();
}

// 説明(形)を表示,非表示する関数
function appearShapeInfo(object, com) {
  object.set({
    stroke: 'red',
  });
  caseInfoCanvas.renderAll();
  infoIntroduction.textContent = com;
}
function disappearShapeInfo(object) {
  object.set({
    stroke: 'black',
  });
  caseInfoCanvas.renderAll();
  infoIntroduction.textContent = comment.default;
}

// ふわっとテキストを切り替え
function fadeInComment(com) {
  infoIntroduction.style.opacity = 0;
  infoIntroduction.textContent = com;
  setTimeout(() => {
    infoIntroduction.style.transition = 'all .5s';
    infoIntroduction.style.opacity = '1';
  }, 10);
}
function fadeOutComment() {
  infoIntroduction.style.transition = 'none';
  infoIntroduction.textContent = comment.default;
}





// 確認用コード ----------------------------------------------------------------

// canvasの(ページの？)座標をconsoleに表示する ----------------
const headerHeight = 62;
mainCanvas.on('mouse:down', function(options) {
  console.log(`x座標:${options.e.clientX}`, `y座標:${options.e.clientY - headerHeight}`);
});





// test -----------------------------------------------------------------------------------


// const text = new fabric.Text('hello', {
//   left: 100,
//   top: 100,
//   originX: 'center',
//   originY: 'center',
//   fill: 'red',
//   fontFamily: 'cursive',
//   stroke: 'black',
// });
// mainCanvas.add(text);


// const circle = new fabric.Circle({
//   radius: 50,
//   left: 200,
//   top: 300,
//   fill: 'blue',
// });
// mainCanvas.add(circle);

// const group = new fabric.Group([ text, circle ], {
//   left: 200,
//   top: 200,
//   originX: 'center',
//   originY: 'center',
// });
// mainCanvas.add(group);

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

// var textPath = new fabric.Text('Text on a path', {
//   top: 150,
//   left: 150,
//   textAlign: 'center',
//   charSpacing: -50,
//   path: new fabric.Path('M 0 0 C 50 -100 150 -100 200 0', {
//       strokeWidth: 1,
//       visible: false
//   }),
//   pathSide: 'left',
//   pathStartOffset: 0
// });
// mainCanvas.add(textPath);

const canvasRange = document.getElementById('canvas-range');
canvasRange.addEventListener('input', () => {
  mainCanvas.setZoom(canvasRange.value);
});

const ctx = document.getElementById('test-canvas').getContext('2d');
ctx.font = '14px sans-serif';
ctx.fillText('ケースの直径を入力', 10, 50);

export { mainCanvas };

