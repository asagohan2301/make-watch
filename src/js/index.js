'use strict';

//* import --------------------------------------------------------------------------------

import '../css/style.css';
import { fabric } from "fabric";

import { downloadSVG } from './download.js';
downloadSVG();

//* common --------------------------------------------------------------------------------

// mmからpixelに変換する関数 ----------------
// 引数にmmを受け取って、pixelにして返す
//! dpiが72で良いのかどうかわからない
function mmToPixel(mm) {
  const dpi = 72;
  // mmをインチに
  const inch = mm / 25.4;
  // インチをpixelに(72dpiとして)
  const pixel = inch * dpi;
  return pixel;
}

// ケースなどの重なり順を直す関数 ----------------
function caseStackingOrder() {
  if (lugObjects !== undefined) {
    lugObjects.forEach(lugObject => {
      lugObject.moveTo(1);
    });
  }
  if (caseObject !== undefined) {
    caseObject.moveTo(5);
  }
  if (caseOpeningObject !== undefined) {
    caseOpeningObject.moveTo(6);
  }
  if (dialOpeningObject !== undefined) {
    dialOpeningObject.moveTo(7);
  }
}

// カラーピッカー ----------------
// カラーピッカーで色を選択したときの処理 ----
// ケース
const caseColorPicker = document.getElementById('case-color-picker');
caseColorPicker.addEventListener('input', () => {
  // ボタンの色を変える
  caseColorPicker.previousElementSibling.style.backgroundColor = caseColorPicker.value;
  // inputCaseColorに値を入れておく
  inputCaseColor = caseColorPicker.value;
  // オブジェクトに色をつける
  applyCaseColor();
});
// ベルト
const strapColorPicker = document.getElementById('strap-color-picker');
strapColorPicker.addEventListener('input', () => {
  // カラーピッカーから色が選択されたら、色を変えたいリスト(strapColorChangeLists)を更新しておく
  // ここで更新しないと、
  // 例えば上ベルトの長さを変えた時には、上ベルトは書き直されて新しいオブジェクトになっているのに
  // strapColorChangeListsの値が更新されていないので、色を変えても前のオブジェクトに色が適用され続けて、
  // 長さを変えた後の上ベルトには色が適用されないことになる
  strapColorChangeLists = [upperStrapObject, lowerStrapObject, fixedStrapLoopObject, moveableStrapLoopObject];
  // ボタンの色を変える
  strapColorPicker.previousElementSibling.style.backgroundColor = strapColorPicker.value;
  // inputStrapColorに値を入れておく
  inputStrapColor = strapColorPicker.value;
  // オブジェクトに色をつける
  applyStrapColor(strapColorChangeLists);
});

// カラーピッカー(input type="color")をクリックしたときにも、radioをクリックしたことにする ----
// ゴールドなど他の色にした後も、その他の色のボタンをクリックしただけで、その色にするための処理
caseColorPicker.addEventListener('click', () => {
  caseColorPicker.previousElementSibling.previousElementSibling.firstElementChild.click();
});
strapColorPicker.addEventListener('click', () => {
  strapColorPicker.previousElementSibling.previousElementSibling.firstElementChild.click();
});

//* style --------------------------------------------------------------------------------

// 選択されたラジオボタンに枠線をつける ----------------------------------------

// 配列を準備 ----------------
// 配列の中に配列が、さらにその配列にも複数の要素が入っている
const radioArray = [ //ここにラジオボタン要素を追加していく
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
// 配列の各要素(の集まり)から関数を呼び出す ----------------
radioArray.forEach(radios => {
  selectRadio(radios);
});
// ラジオボタンの枠線をつけ外しする関数 ----------------
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

// タブを切り替える ----------------------------------------

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

//* main canvas ----------------------------------------------------------------------------------

// fabricインスタンス ----------------------------------------

// オブジェクトを選択できるようにするなら Canvas
const mainCanvas = new fabric.Canvas('main-canvas');
// オブジェクトを選択できないようにするなら StaticCanvas
// const mainCanvas = new fabric.StaticCanvas('main-canvas');
const mainCanvasHalfWidth = 192;
const mainCanvasCenterHeight = mmToPixel(125);

//* main case ------------------------------------------------------------------------------------

// 変数定義 ----------------------------------------

// オブジェクト
let caseObject;
let caseOpeningObject;
let dialOpeningObject;
let crownObject; // 2種類のクラウンで同じ変数名でOK？→OKそう。同時には存在しないから？
const lugObjects = [];
// サイズ・形状・色
let lugWidth;
let inputLugValue = 'round'; //初期値
let inputCrownValue = 'round'; //初期値
const defaultLugThickness = mmToPixel(2);
const defaultLugLength = mmToPixel(8);
let inputCaseColor = 'white'; //初期値
// Node
const caseSizeInput = document.getElementById('case-size');
const caseOpeningSizeInput = document.getElementById('case-opening-size');
const dialOpeningSizeInput = document.getElementById('dial-opening-size');
const lugWidthInput = document.getElementById('lug-width');

// 円のクラス ----------------------------------------

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

//* main ケース ----------------------------------------

// ケースサイズが入力されたらcanvasに描画 ----------------
caseSizeInput.addEventListener('input', () => {
  // すでにオブジェクトが描かれていたらcanvasから削除
  mainCanvas.remove(caseObject);
  // ケースオブジェクト生成
  caseObject = new WatchCircle({
    radius: mmToPixel(caseSizeInput.value) / 2,
    left: mainCanvasHalfWidth,
    top: mainCanvasCenterHeight,
  });
  // すでに色が選ばれていた場合はその色にする
  caseObject.set({
    fill: inputCaseColor,
  });
  // canvasに描画
  mainCanvas.add(caseObject);
  // ラグ再描画
  if (lugObjects.length !== 0) {
    switch(inputLugValue) { // 初期値は'round'
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
    switch(inputCrownValue) {
      case 'round':
        roundCrown.drawCrown();
        break;
      case 'square':
        squareCrown.drawCrown();
        break;
    }
  }
  // ベルト再描画
  // すでに上ベルトが描かれていたら、再描画する
  if (upperStrapObject !== undefined) {
    drawUpperStrap();
  }
  if (lowerStrapObject !== undefined) {
    drawLowerStrap();
  }
  // 重なり順を直す
  caseStackingOrder();
});

//* main ケース見切り ----------------------------------------

caseOpeningSizeInput.addEventListener('input', () => {
  mainCanvas.remove(caseOpeningObject);
  caseOpeningObject = new WatchCircle({
    radius: mmToPixel(caseOpeningSizeInput.value) / 2,
    left: mainCanvasHalfWidth,
    top: mainCanvasCenterHeight,
  });
  mainCanvas.add(caseOpeningObject);
  caseStackingOrder();
});

//* main ダイヤル見切 ----------------------------------------

dialOpeningSizeInput.addEventListener('input', () => {
  mainCanvas.remove(dialOpeningObject);
  dialOpeningObject = new WatchCircle({
    radius: mmToPixel(dialOpeningSizeInput.value) / 2,
    left: mainCanvasHalfWidth,
    top: mainCanvasCenterHeight,
  });
  mainCanvas.add(dialOpeningObject);
  caseStackingOrder();
});

//* main ラグ ----------------------------------------

// ラグ幅が入力されたらcanvasに描画 ----------------
const lugShapeInputs = document.querySelectorAll('input[name="lug-shape"]');
lugWidthInput.addEventListener('input', () => {
  // lugWidthに値を代入
  lugWidth = mmToPixel(lugWidthInput.value);
  // すでにラグの形が選択されていた場合は、inputLugValueに値を代入
  lugShapeInputs.forEach(lugShapeInput => {
    if(lugShapeInput.checked){
      inputLugValue = lugShapeInput.value;
    }
  });
  // ラグを描く関数呼び出し
  // ラグの形がまだ選択されていない場合は、inputLugValueの初期値は'round'で描画されることになる
  switch(inputLugValue) { 
    case 'round':
      roundLug.drawLug();
      break;
    case 'square':
      squareLug.drawLug();
      break;
  }
  // ベルト再描画
  // ラグ幅が変更されたらベルトの幅も変わるので
  if (upperStrapObject !== undefined) {
    drawUpperStrap();
  }
  if (lowerStrapObject !== undefined) {
    drawLowerStrap();
  }
});

// ラグの形状が選ばれたらcanvasに描画 ----------------
lugShapeInputs.forEach(lugShapeInput => {
  lugShapeInput.addEventListener('input', () => {
    switch(lugShapeInput.value) {
      case 'round':
        roundLug.drawLug();
        break;
      case 'square':
        squareLug.drawLug();
        break;
    }
  });
});

// ラグのクラス ----------------
//? ラグ4つをグループ化したいがうまくできない
class WatchLug {
  constructor(url) {
    this.url = url;
  }
  drawLug() {
    const adjustValue = 1.7; //! 要検討
    // すでにオブジェクトが描かれていたらcanvasから削除
    lugObjects.forEach(lugObject => {
      mainCanvas.remove(lugObject);
    });
    // ラグオブジェクト生成
    for(let i = 0; i < 4; i++) { // i= 0, 1, 2, 3
      fabric.loadSVGFromURL(this.url, (objects, options) => {
        lugObjects[i] = fabric.util.groupSVGElements(objects, options);
        lugObjects[i].set({
          originX: 'center',
          left: mainCanvasHalfWidth - lugWidth / 2 - defaultLugThickness / 2,
          top: mainCanvasCenterHeight - caseObject.height / adjustValue,
          fill: inputCaseColor,
        });
        if (i === 1 || i === 3) {
          lugObjects[i].set({
            left: mainCanvasHalfWidth - lugWidth / 2 - defaultLugThickness / 2 + lugWidth + defaultLugThickness,
          });
        }
        if(i === 2 || i === 3) {
          lugObjects[i].set({
            flipY: true,
            top: mainCanvasCenterHeight + caseObject.height / adjustValue - defaultLugLength,
          });
        }
        // canvasに描画
        mainCanvas.add(lugObjects[i]);
        // 重なり順を直す
        caseStackingOrder();
      });
    }
    //* renderAllは必要なのかどうか
    // mainCanvas.renderAll();
  }
}

// ラグのインスタンス生成 ----------------
const roundLug = new WatchLug('./assets/lug-round.svg');
const squareLug = new WatchLug('./assets/lug-square.svg');

//* main リュウズ ----------------------------------------

const crownShapeInputs = document.querySelectorAll('input[name="crown-shape"]');
crownShapeInputs.forEach(crownShapeInput => {
  crownShapeInput.addEventListener('input', () => {
    inputCrownValue = crownShapeInput.value;
    switch(inputCrownValue) {
      case 'round':
        roundCrown.drawCrown();
        break;
      case 'square':
        squareCrown.drawCrown();
        break;
    }
  });
});

// リュウズのクラス ----------------
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
// リュウズのインスタンス生成 ----------------
const roundCrown = new WatchCrown('./assets/crown-round_re.svg');
const squareCrown = new WatchCrown('./assets/crown-square_re.svg');

//* main ケース色 ----------------------------------------

// グラデーションクラス ----------------
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

// 色が選択されたら、ケース(とラグとリュウズ)に色をつける関数呼び出し ----------------
// 色が選択されたとき、オブジェクトがすでにあれば色を付ける
// オブジェクトがまだなければ色を保持しておいて、オブジェクトが生成されたときに色を付ける
// オブジェクトの有無は呼び出し先の関数で判定
const caseColorInputs = document.querySelectorAll('input[name="case-color"]');
caseColorInputs.forEach(caseColorInput => {
  caseColorInput.addEventListener('input', () => {
    // 色が選択された時点で、(オブジェクトがまだなくても)変数に値を入れておく
    switch(caseColorInput.value) {
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

// ケースに色をつける関数 ----------------
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
  if (lugObjects !== undefined) {
    lugObjects.forEach(lugObject => {
      lugObject.set({
        fill: inputCaseColor,
      });
    });
  }
  //* ここでrenderAllを書かないと、オブジェクトを生成し直さないと色が変わらない
  //* setで値を変更したとき、オブジェクトにすぐに反映させたい場合はrenderAllが必要てことかな
  mainCanvas.renderAll();
}

//* main strap -----------------------------------------------------------------------------------

// 変数定義 ----------------------------------------

// ベルト本体
let strapWidth;
let upperStrapObject;
let lowerStrapObject;
let inputStrapColor = 'white'; // 初期値
// ベルトサイズ
const defaultStrapWidth = mmToPixel(16); // 用意したSVGのベルト幅
const defaultUpperStrapLength = mmToPixel(70); // 用意したSVGのベルト長さ
const defaultLowerStrapLength = mmToPixel(110); // 用意したSVGのベルト長さ
// ベルトループ
let fixedStrapLoopObject;
let moveableStrapLoopObject;
// ベルト穴
let strapHoleObjects = [];
let strapHoleQuantity = 6; // ベルト穴の個数 初期値
let strapHoleDistance = mmToPixel(7); // ベルト穴の間隔 初期値
let countDistance = 0; // 一番下の穴からどれくらい移動するかを保持する変数
// ステッチ
let upperStrapStitchObject;
let lowerStrapStitchObject;
let topStitchObject;
let strapStitchExist = false; // ストラップ有無 初期値はfalse

// Node
const upperStrapLengthInput = document.getElementById('upper-strap-length');
const lowerStrapLengthInput = document.getElementById('lower-strap-length');

//* main ベルト本体 ----------------------------------------

// ベルトの長さが入力されたら、ベルト本体を描く関数呼び出し ----------------
// 上ベルト本体
upperStrapLengthInput.addEventListener('input', () => {
  drawUpperStrap();
});
// 下ベルト本体
lowerStrapLengthInput.addEventListener('input', () => {
  drawLowerStrap();
});

// ベルト本体を描く関数 ----------------
// 上ベルト本体 ----
function drawUpperStrap() {
  // すでにオブジェクトが描かれていたらcanvasから削除
  mainCanvas.remove(upperStrapObject);
  // SVGファイル読み込み
  fabric.loadSVGFromURL('./assets/upper-strap.svg', (objects, options) =>{
    upperStrapObject = fabric.util.groupSVGElements(objects, options);
    strapWidth = lugWidth;
    upperStrapObject.set({
      originX: 'center',
      originY: 'bottom',
      fill: inputStrapColor,
      left: mainCanvasHalfWidth,
      // strapを描く位置(高さ)を、ケースの位置から取得する
      top: caseObject.top - caseObject.height / 2 - mmToPixel(1),
      // 入力値にあわせて幅と長さを拡大縮小
      scaleX: strapWidth / defaultStrapWidth,
      scaleY: mmToPixel(upperStrapLengthInput.value) / defaultUpperStrapLength,
      // 線幅を保つ
      strokeUniform: true,
    });
    // canvasに描画
    mainCanvas.add(upperStrapObject);
    // ステッチ(再)描画
    if (strapStitchExist === true) {
      drawUpperStitch();
    }
    // ループ(再)描画
    drawStrapLoop();
  });
}
// 下ベルト本体 ----
function drawLowerStrap() {
  // すでにオブジェクトが描かれていたらcanvasから削除
  mainCanvas.remove(lowerStrapObject);
  // SVGファイル読み込み
  fabric.loadSVGFromURL('./assets/lower-strap.svg', (objects, options) =>{
    lowerStrapObject = fabric.util.groupSVGElements(objects, options);
    strapWidth = lugWidth;
    lowerStrapObject.set({
      originX: 'center',
      fill: inputStrapColor,
      left: mainCanvasHalfWidth,
      // strapを描く位置(高さ)を、ケースの位置から取得する
      top: caseObject.top + caseObject.height / 2 + mmToPixel(1),
      // 入力値にあわせて幅と長さを拡大縮小
      scaleX: strapWidth / defaultStrapWidth,
      scaleY: mmToPixel(lowerStrapLengthInput.value) / defaultLowerStrapLength,
      // 線幅を保つ
      strokeUniform: true,
    });
    // canvasに描画
    mainCanvas.add(lowerStrapObject);
    // ステッチ(再)描画
    if (strapStitchExist === true) {
      drawLowerStitch();
    }
    // ベルト穴(再)描画
    // もしすでにベルト穴が存在していたら書き直す
    // 初めて描かれる場合でも、仮の個数と間隔で描画する
    drawStrapHoles();
  });
  //! loadSVGFromURLは非同期処理である事に注意
  // {}外はloadSVGFromURLのコールバック関数外なので、SVGの読み込みより前に実行される可能性がある
  // そのためここに書いた処理が行われるとき、まだlowerStrapObjectは存在していない
  // よってlowerStrapObjectを使うような処理は{}内に書くこと
}

//* main ベルトループ ----------------------------------------

// ループを描く関数 ----------------
function drawStrapLoop() {
  // すでにオブジェクトが描かれていたらcanvasから削除
  mainCanvas.remove(fixedStrapLoopObject);
  mainCanvas.remove(moveableStrapLoopObject);
  // ループオブジェクトを生成
  // 固定ループ
  fixedStrapLoopObject = new fabric.Rect({
    width: strapWidth + mmToPixel(2),
    height: mmToPixel(5),
    originX: 'center',
    fill: inputStrapColor,
    left: mainCanvasHalfWidth,
    top: upperStrapObject.top - mmToPixel(upperStrapLengthInput.value) + mmToPixel(8),
    stroke: 'black',
  });
  mainCanvas.add(fixedStrapLoopObject);
  // 可動ループ 固定ループの深いコピーで作る
  moveableStrapLoopObject = fabric.util.object.clone(fixedStrapLoopObject);
  moveableStrapLoopObject.set({
    top: fixedStrapLoopObject.top + mmToPixel(5) + mmToPixel(10),
  });
  mainCanvas.add(moveableStrapLoopObject);
}

//* main ベルト穴 ----------------------------------------

// ベルト穴個数が選択されたら、ベルト穴を描く関数を呼び出し ----------------
const strapHoleQuantityInputs = document.querySelectorAll('input[name="hole-quantity"]');
strapHoleQuantityInputs.forEach(strapHoleQuantityInput => {
  strapHoleQuantityInput.addEventListener('input', () => {
    // 変数に値を代入
    strapHoleQuantity = parseInt(strapHoleQuantityInput.value);
    // 下ストラップがまだ無い場合はここでリターン
    if(lowerStrapObject === undefined) {
      alert('下ストラップの長さを入力してください');
      return;
    }
    // ベルト穴を描く関数呼び出し
    drawStrapHoles();
  });
});

// ベルト穴間隔が選択されたら、ベルト穴を描く関数を呼び出し ----------------
const holeDistanceInputs = document.querySelectorAll('input[name="hole-distance"]');
holeDistanceInputs.forEach(holeDistanceInput => {
  holeDistanceInput.addEventListener('input', () => {
    // 変数に値を代入
    strapHoleDistance = mmToPixel(parseInt(holeDistanceInput.value));
    /// 下ストラップがまだ無い場合はここでリターン
    if(lowerStrapObject === undefined) {
      alert('下ストラップの長さを入力してください');
      return;
    }
    // ベルト穴を描く関数呼び出し
    drawStrapHoles();
  });
});

// ベルト穴を描く関数 ----------------
function drawStrapHoles() {
  // すでにオブジェクトが描かれていたらcanvasから削除
  strapHoleObjects.forEach(strapHoleObject => {
    mainCanvas.remove(strapHoleObject);
  });
  // canvasから取り除いても配列内にはオブジェクトが残ったままなので、
  // 前回分もあわせた、例えば14個のオブジェクトが描画されてしまう
  // よってここで配列を空にしておく
  strapHoleObjects = [];
  // ベルト穴オブジェクトを生成
  for(let i = 0; i < strapHoleQuantity ; i++) {
    const strapHoleObject = new fabric.Circle({
      radius: mmToPixel(0.75),
      originX: 'center',
      originY: 'center',
      left: mainCanvasHalfWidth,
      top: lowerStrapObject.top + (lowerStrapObject.height * mmToPixel(lowerStrapLengthInput.value) / defaultLowerStrapLength) - mmToPixel(25) - countDistance,
      stroke: 'black',
      fill: 'white',
    });
    strapHoleObjects.push(strapHoleObject);
    countDistance += strapHoleDistance;
  }
  // ベルト穴オブジェクトを描画
  strapHoleObjects.forEach(strapHoleObject => {
    mainCanvas.add(strapHoleObject);
  });
  // 一番下の穴からどれくらい移動するかを保持する変数を0に戻す
  countDistance = 0;
}

//* main ベルトステッチ ----------------------------------------

// ステッチの有無が選択されたら、ステッチを描く関数を呼び出し ----------------
const stitchInputs = document.querySelectorAll('input[name="stitch"]');
stitchInputs.forEach(stitchInput => {
  stitchInput.addEventListener('input', () => {
    // ステッチの有無を変数に代入 inputする前の初期値はfalse
    strapStitchExist = stitchInput.value;
    if (strapStitchExist === 'true') {
      strapStitchExist = true;
    } else {
      strapStitchExist = false;
    }
    // 上下両方もしくはどちらかのストラップがまだ無い場合はここでリターン
    if (upperStrapObject === undefined || lowerStrapObject === undefined) {
      alert('ストラップの長さを入力してください');
      return;
    }
    // ステッチの有無がfalseならcanvasから削除
    if (strapStitchExist === false) {
      mainCanvas.remove(upperStrapStitchObject);
      mainCanvas.remove(lowerStrapStitchObject);
      mainCanvas.remove(topStitchObject);
    }
    // ステッチの有無がtrueならステッチを描く関数呼び出し
    if (strapStitchExist === true) {
      drawUpperStitch();
      drawLowerStitch();
    }
  });
});

// ステッチを描く関数 ----------------
// 上ベルトステッチ ----
function drawUpperStitch() {
  // すでにオブジェクトが描かれていたらcanvasから削除
  mainCanvas.remove(upperStrapStitchObject);
  mainCanvas.remove(topStitchObject);
  // 上ベルトステッチ生成
  // 基本はlowerStrapObjectと同じで、位置の調整と点線に変更
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
      scaleY: mmToPixel(upperStrapLengthInput.value) / defaultUpperStrapLength,
      // 線幅を保つ
      strokeUniform: true,
      // 点線に
      strokeDashArray: [8, 2],
    });
    // canvasに描画
    mainCanvas.add(upperStrapStitchObject);
    // 重なり順を直す ステッチよりループが上にくるように
    if (fixedStrapLoopObject !== undefined) {
      fixedStrapLoopObject.bringToFront();
    }
    if (moveableStrapLoopObject !== undefined) {
      moveableStrapLoopObject.bringToFront();
    }
  });
  // バックル近くのステッチ生成
  topStitchObject = new fabric.Polyline([
    {
      x: mainCanvasHalfWidth - strapWidth / 2 + mmToPixel(2.5),
      y: upperStrapObject.top - mmToPixel(upperStrapLengthInput.value) + mmToPixel(6)
    },
    {
      x: mainCanvasHalfWidth + strapWidth / 2 - mmToPixel(2.5),
      y: upperStrapObject.top - mmToPixel(upperStrapLengthInput.value) + mmToPixel(6)
    }],
    {
      stroke: 'black',
      strokeDashArray: [8, 2],
    }
  );
  // canvasに描画
  mainCanvas.add(topStitchObject);
}
// 下ベルトステッチ ----
function drawLowerStitch() {
  // すでにオブジェクトが描かれていたらcanvasから削除
  mainCanvas.remove(lowerStrapStitchObject);
  // 下ベルトステッチ生成
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
      scaleY: mmToPixel(lowerStrapLengthInput.value) / defaultLowerStrapLength,
      // 線幅を保つ
      strokeUniform: true,
      // 点線に
      strokeDashArray: [8, 2],
    });
    // canvasに描画
    mainCanvas.add(lowerStrapStitchObject);
  });
}

//* main ベルト色 ----------------------------------------

// 色を変えたいオブジェクトをまとめるための配列を準備
let strapColorChangeLists;
// 色が選択されたら、ベルトに色をつける関数呼び出し ----------------
// もとから用意している色、もしくはカスタムカラー
const strapColorInputs = document.querySelectorAll('input[name="strap-color"]');
strapColorInputs.forEach(strapColorInput => {
  strapColorInput.addEventListener('input', () => {
    // オブジェクトを生成してから配列に入れないとundefinedが入ってエラーが出てしまうので、
    // 色が選択された時点で配列にオブジェクトを入れる
    strapColorChangeLists = [upperStrapObject, lowerStrapObject, fixedStrapLoopObject, moveableStrapLoopObject];
    // 色が選択された時点で、(オブジェクトがまだなくても)変数に値を入れておく
    switch(strapColorInput.value) {
      case 'black':
        inputStrapColor = 'black';
        break;
      case 'brown':
        inputStrapColor = 'brown';
        break;
      case 'gray':
        inputStrapColor = 'gray';
        break;
      case 'custom-color':
        inputStrapColor = strapColorPicker.value;
        break;
    }
    // オブジェクトに色をつける
    applyStrapColor(strapColorChangeLists);
  });
});

// ベルトに色をつける関数 --------
function applyStrapColor(array) {
  array.forEach(object => {
    if (object !== undefined) {
      object.set({
        fill: inputStrapColor,
      });
      mainCanvas.renderAll();
    }
  });
}

//* case info canvas ---------------------------------------------------------------------------

// fabricインスタンス ----------------------------------------

const caseInfoCanvas = new fabric.StaticCanvas('case-info-canvas');

// 変数定義 ----------------------------------------
// サイズ ----
const caseInfoCanvasCenterHeight = 118;
const caseInfoCanvasHalfWidth = 130;
const caseInfoCanvasCaseRadius = 45;
const caseInfoCanvasCaseOpeningRadius = 39;
const caseInfoCanvasDialOpeningRadius = 36;
const caseInfoCanvasLugHalfDistance = 26;
// オブジェクト ----
const infoLugObjects = [];
let infoCrownObject;
let infoColorChangeLists;
// Node ----
const caseInfoComment = document.querySelector('.case-info-comment');

// case info canvas に時計の図を描画 ----------------------------------------

// info ケース ----------------
const infoCaseObject = new WatchCircle({
  radius: caseInfoCanvasCaseRadius,
  left: caseInfoCanvasHalfWidth,
  top: caseInfoCanvasCenterHeight,
});

// info 見切り ----------------
const infoCaseOpeningObject = new WatchCircle({
  radius: caseInfoCanvasCaseOpeningRadius,
  left: caseInfoCanvasHalfWidth,
  top: caseInfoCanvasCenterHeight,
});

// info 文字盤 ----------------
const infoDialOpeningObject = new WatchCircle({
  radius: caseInfoCanvasDialOpeningRadius,
  left: caseInfoCanvasHalfWidth,
  top: caseInfoCanvasCenterHeight,
});
caseInfoCanvas.add(infoCaseObject, infoCaseOpeningObject, infoDialOpeningObject);

// info ラグ ----------------
for (let i = 0; i < 4; i++) { // i= 0, 1, 2, 3
  fabric.loadSVGFromURL('./assets/lug-round.svg', (objects, options) => {
    infoLugObjects[i] = fabric.util.groupSVGElements(objects, options);
    infoLugObjects[i].set({
      originX: 'center',
      originY: 'center',
      left: caseInfoCanvasHalfWidth - caseInfoCanvasLugHalfDistance,
      top: caseInfoCanvasCenterHeight - 44,
    });
    if (i === 1 || i === 3) {
      infoLugObjects[i].set({
        left: caseInfoCanvasHalfWidth + caseInfoCanvasLugHalfDistance,
      });
    }
    if(i === 2 || i === 3) {
      infoLugObjects[i].set({
        flipY: true,
        top: caseInfoCanvasCenterHeight + 44,
      });
    }
    caseInfoCanvas.add(infoLugObjects[i]);
    infoLugObjects[i].sendToBack();
  });
}

// info リュウズ ----------------
fabric.loadSVGFromURL('./assets/crown-round_re.svg', (objects, options) => {
  infoCrownObject = fabric.util.groupSVGElements(objects, options);
  infoCrownObject.set({
    originY: 'center',
    top: caseInfoCanvasCenterHeight,
    left: caseInfoCanvasHalfWidth + caseInfoCanvasCaseRadius,
  });
  caseInfoCanvas.add(infoCrownObject);
});

// 矢印の準備 ----------------------------------------

// 矢印クラス ----------------
class Arrow {
  // コンストラクタ
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
  // メソッド
  drawArrow() {
    caseInfoCanvas.add(this.line, this.tipLeft, this.tipRight);
  }
  removeArrow() {
    caseInfoCanvas.remove(this.line, this.tipLeft, this.tipRight)
  }
}

// 矢印インスタンス ----------------
// 円の半径を渡してインスタンスを生成
const caseArrow = new Arrow(caseInfoCanvasCaseRadius);
const openingArrow = new Arrow(caseInfoCanvasCaseOpeningRadius);
const dialArrow = new Arrow(caseInfoCanvasDialOpeningRadius);
const lugArrow = new Arrow(caseInfoCanvasLugHalfDistance - defaultLugThickness / 2);

// case info canvas に説明を表示 ----------------------------------------

// 表示するコメントの配列を準備 ----------------
const comment = {
  default: '入力するパーツの説明が表示されます',
  caseSize: 'ケースの直径をmm単位で入力してください',
  caseOpeningSize: 'ケース見切りの直径をmm単位で入力してください',
  dialOpeningSize: '文字盤の直径をmm単位で入力してください',
  lugWidth: 'ラグの間の距離をmm単位で入力してください',
  lugShape: 'ラグの形状を選択してください',
  crownShape: 'りゅうずの形状を選択してください',
  caseColor: 'ケース、ラグ、りゅうずにつける色を選択してください',
}

// ケース・ケース見切り・文字盤見切りの info を表示するための配列を準備 ----------------
const caseInfoCircleLists = [
  {
    node: caseSizeInput,
    arrow: caseArrow,
    object: infoCaseObject,
    comment: comment.caseSize,
  },
  {
    node: caseOpeningSizeInput,
    arrow: openingArrow,
    object: infoCaseOpeningObject,
    comment: comment.caseOpeningSize,
  },
  {
    node: dialOpeningSizeInput,
    arrow: dialArrow,
    object: infoDialOpeningObject,
    comment: comment.dialOpeningSize,
  },
];

// ケース・ケース見切り・文字盤見切りの info を表示・非表示 ----------------
// focus ----
for(let i = 0; i < caseInfoCircleLists.length; i++) {
  caseInfoCircleLists[i].node.addEventListener('focus', () => {
    // 矢印を描画
    caseInfoCircleLists[i].arrow.drawArrow();
    // オブジェクトの線の色を変える
    changeColorToRed(caseInfoCircleLists[i].object);
    // コメントを表示
    fadeInComment(caseInfoCircleLists[i].comment);
  });
}
// blur(focusが外れた時) ----
for(let i = 0; i < caseInfoCircleLists.length; i++) {
  caseInfoCircleLists[i].node.addEventListener('blur', () => {
    // 矢印を取り除く
    caseInfoCircleLists[i].arrow.removeArrow();
    // オブジェクトの線の色を変える
    changeColorToBlack(caseInfoCircleLists[i].object);
    // コメントを戻す
    fadeOutComment();
  });
}

// ラグ幅の info を表示・非表示 ----------------
// focus ----
lugWidthInput.addEventListener('focus', () => {
  lugArrow.drawArrow();
  // drawArrow で描いた矢印の top は円の中心なので、位置を書き換える
  // インスタンスのフィールドであるlineなどがfabricオブジェクトなので、
  // lugArrow ではなく lugArrow.line に set する
  lugArrow.line.set({
    top: caseInfoCanvasCenterHeight - caseInfoCanvasCaseRadius - 6,
  });
  lugArrow.tipLeft.set({
    top: caseInfoCanvasCenterHeight - caseInfoCanvasCaseRadius - 12,
  });
  lugArrow.tipRight.set({
    top: caseInfoCanvasCenterHeight - caseInfoCanvasCaseRadius - 12,
  });
  // コメントを表示
  fadeInComment(comment.lugWidth);
});
// blur(focusが外れた時) ----
lugWidthInput.addEventListener('blur', () => {
  // 矢印を取り除く
  lugArrow.removeArrow();
  // コメントを戻す
  fadeOutComment();
});
// input ----
lugWidthInput.addEventListener('input', () => {
  // 矢印を取り除く
  lugArrow.removeArrow();
  // コメントを戻す
  fadeOutComment();
});

// ラグ形状の info を表示・非表示 ----------------
// mouseover ----
document.querySelector('.shape-list-lug').addEventListener('mouseover', () => {
  infoLugObjects.forEach(infoLugObject => {
    // オブジェクトの線の色を変える
    changeColorToRed(infoLugObject);
    // コメントを表示
    fadeInComment(comment.lugShape);
  });
});
// mouseleave ----
document.querySelector('.shape-list-lug').addEventListener('mouseleave', () => {
  infoLugObjects.forEach(infoLugObject => {
    // オブジェクトの線の色を変える
    changeColorToBlack(infoLugObject);
    // コメントを戻す
    fadeOutComment();
  });
});

// リュウズ形状の info を表示・非表示 ----------------
// mouseover ----
document.querySelector('.shape-list-crown').addEventListener('mouseover', () => {
  // オブジェクトの線の色を変える
  changeColorToRed(infoCrownObject);
  // コメントを表示
  fadeInComment(comment.crownShape);
});
// mouseleave ----
document.querySelector('.shape-list-crown').addEventListener('mouseleave', () => {
  // オブジェクトの線の色を変える
  changeColorToBlack(infoCrownObject);
  // コメントを戻す
  fadeOutComment();
});

// ケース色の info を表示・非表示 ----------------
// mouseover ----
document.querySelector('.shape-list-color').addEventListener('mouseover', () => {
  // mouseoverした時点で配列に値を入れる
  // loadした時点で配列に値を入れる処理にしていたらエラーが出ることがあったので注意
  infoColorChangeLists = [infoCaseObject, infoCrownObject, ...infoLugObjects];
  console.log(infoColorChangeLists);
  // オブジェクトの色を変える
  infoColorChangeLists.forEach(colorChangeList => {
    colorChangeList.set({
      fill: '#e2e2e2',
    });
  });
  caseInfoCanvas.renderAll();
  // コメントを表示
  fadeInComment(comment.caseColor);
});
// mouseleave ----
document.querySelector('.shape-list-color').addEventListener('mouseleave', () => {
  // オブジェクトの色を変える
  infoColorChangeLists.forEach(colorChangeList => {
    colorChangeList.set({
      fill: 'white',
    });
  });
  caseInfoCanvas.renderAll();
  // コメントを戻す
  fadeOutComment();
});

// オブジェクトの線の色を変更する関数 ----------------
// 引数に線の色を変えるオブジェクトを受け取る
// 赤にする ----
function changeColorToRed(object) {
  object.set({
    stroke: 'red',
  });
  caseInfoCanvas.renderAll();
}
// 黒に戻す ----
function changeColorToBlack(object) {
  object.set({
    stroke: 'black',
  });
  caseInfoCanvas.renderAll();
}

// ふわっとコメントを切り替える関数 ----------------
// 引数に表示する文字列を受け取る
// 表示する ----
function fadeInComment(com) {
  // いったん透明にして
  caseInfoComment.style.opacity = 0;
  // コメントを変更して
  caseInfoComment.textContent = com;
  // ふわっと表示
  setTimeout(() => {
    caseInfoComment.style.transition = 'all .5s';
    caseInfoComment.style.opacity = '1';
  }, 10);
}
// デフォルトに戻す ----
function fadeOutComment() {
  caseInfoComment.style.transition = 'none';
  caseInfoComment.textContent = comment.default;
}

//* 確認用コード ----------------------------------------------------------------------------------

// canvasの(ページの？)座標をconsoleに表示する ----------------
const headerHeight = 62;
mainCanvas.on('mouse:down', function(options) {
  console.log(`x座標:${options.e.clientX}`, `y座標:${options.e.clientY - headerHeight}`);
});

//* test -----------------------------------------------------------------------------------------

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



//* テスト用 -------------------------------------------------------------------------
const testButton1 = document.getElementById('button-for-test');
testButton1.addEventListener('click', () => {
  console.log(roundLug);
  console.log(typeof(roundLug));
  });

document.getElementById('button-for-test2').addEventListener('click', () => {


});
//* テスト用 -------------------------------------------------------------------------



//* export ---------------------------------------------------------------------------------------

export { mainCanvas };

