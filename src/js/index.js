'use strict';

//* import ----------------------------------------------------------------------------------------

import '../css/style.css';
import { fabric } from "fabric";

import { downloadSVG } from './download.js';
downloadSVG();

//* common ----------------------------------------------------------------------------------------

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
  if (dialObject !== undefined) {
    dialObject.moveTo(7);
  }
  if (hourObjects.length !== 0) {
    hourObjects.forEach(hourObject => {
      hourObject.moveTo(8);
    });
  }
  if (barDotObjects.length !== 0) {
    barDotObjects.forEach(barDotObject => {
      barDotObject.moveTo(20);
    });
  }
}

//* カラーピッカー ----------------------------------------
// カラーピッカーで色を選択したときの処理 ----
// ケース
const caseColorPicker = document.getElementById('case-color-picker');
caseColorPicker.addEventListener('input', () => {
  // ボタンの色を変える
  caseColorPicker.previousElementSibling.style.backgroundColor = caseColorPicker.value;
  // caseColorに値を入れておく
  caseColor = caseColorPicker.value;
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
// 文字盤
const dialColorPicker = document.getElementById('dial-color-picker');
dialColorPicker.addEventListener('input', () => {
  // ボタンの色を変える
  dialColorPicker.previousElementSibling.style.backgroundColor = dialColorPicker.value;
  // dialColorに値を入れておく
  dialColor = dialColorPicker.value;
  // オブジェクトに色をつける
  if (dialObject !== undefined) {
    dialObject.set({
      fill: dialColor,
    });
  }
  mainCanvas.renderAll();
});
// 数字とバーorドット
const hourColorPicker = document.getElementById('hour-color-picker');
hourColorPicker.addEventListener('input', () => {
  // ボタンの色を変える
  hourColorPicker.previousElementSibling.style.backgroundColor = hourColorPicker.value;
  // hourColorに値を入れておく
  hourColor = hourColorPicker.value;
  // 数字たちに色をつける
  if (hourObjects.length !== 0) {
    hourObjects.forEach(hourObject => {
      hourObject.set({
        fill: hourColor,
      });
    });
  }
  // 透明にしているバーorドットには色がつかないように、
  // それ以外のバーorドットの色を変える
  barDotObjects.forEach(barDotObject => {
    if (barDotObject.fill !== 'transparent') {
      barDotObject.set({
        fill: hourColor,
      });
    }
  });
  mainCanvas.renderAll();
});

// カラーピッカー(input type="color")をクリックしたときにも、radioをクリックしたことにする ----
// 以下のコードがないと、
// ゴールドなど他の色を選択した後、「その他の色」ボタンをクリックしたときに、すぐに色が変わらない
caseColorPicker.addEventListener('click', () => {
  caseColorPicker.previousElementSibling.previousElementSibling.firstElementChild.click();
});
strapColorPicker.addEventListener('click', () => {
  strapColorPicker.previousElementSibling.previousElementSibling.firstElementChild.click();
});
dialColorPicker.addEventListener('click', () => {
  dialColorPicker.previousElementSibling.previousElementSibling.firstElementChild.click();
});
hourColorPicker.addEventListener('click', () => {
  hourColorPicker.previousElementSibling.previousElementSibling.firstElementChild.click();
});

//* style -----------------------------------------------------------------------------------------

// 選択されたラジオボタンに枠線をつける ----------------------------------------

// 配列を準備 ----------------
// ラジオボタン要素が増えたらここに変数を追加して、radioArray にも追加する
const lugShapeInputs = document.querySelectorAll('input[name="lug-shape"]');
const crownShapeInputs = document.querySelectorAll('input[name="crown-shape"]');
const caseColorInputs = document.querySelectorAll('input[name="case-color"]');
const strapHoleQuantityInputs = document.querySelectorAll('input[name="hole-quantity"]');
const strapHoleDistanceInputs = document.querySelectorAll('input[name="hole-distance"]');
const strapStitchInputs = document.querySelectorAll('input[name="stitch"]');
const strapShapeInputs = document.querySelectorAll('input[name="strap-shape"]');
const strapColorInputs = document.querySelectorAll('input[name="strap-color"]');
const buckleShapeInputs = document.querySelectorAll('input[name="buckle-shape"]');
const dialColorInputs = document.querySelectorAll('input[name="dial-color"]');
const hourLayoutInputs = document.querySelectorAll('input[name="hour-layout"]');
const hourFontFamilyInputs = document.querySelectorAll('input[name="hour-font"]');
const hourColorInputs = document.querySelectorAll('input[name="hour-color"]');
const barDotInputs = document.querySelectorAll('input[name="bar-dot"]');

// 配列 radioArray の中に、複数の要素が配列のようになった lugShapeInputs などが入っている
// lugShapeInputs などの中に、個々の input 要素が入っている
const radioArray = [
  lugShapeInputs,
  crownShapeInputs,
  caseColorInputs,
  strapHoleQuantityInputs,
  strapHoleDistanceInputs,
  strapStitchInputs,
  strapShapeInputs,
  strapColorInputs,
  buckleShapeInputs,
  dialColorInputs,
  hourLayoutInputs,
  hourFontFamilyInputs,
  hourColorInputs,
  barDotInputs,
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
        radio.parentElement.classList.remove('active');
      });
      radio.parentElement.classList.add('active');
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
    // ベルトタブをクリックしたときに、まだケース直径とラグ幅が入力されていなければ return
    if (tab.id === 'strap-tab') {
      //* 判定をcaseObjectやlugObjectsでするのか、caseSize.valueやlugWidthでするのか検討
      if (caseObject === undefined && lugWidth === undefined) {
        window.alert('先にこのページでケース直径とラグ幅を入力してから、ベルトの入力に進んでください');
        return;
      }
      if (lugObjects.length === 0) {
        window.alert('先にこのページでラグ幅を入力してから、ベルトの入力に進んでください');
        return;
      }
    }
    // 文字盤タブをクリックしたときに、まだケース直径と文字盤見切り直径が入力されていなければ return
    if (tab.id === 'dial-tab') {
      if (caseObject === undefined && dialObject === undefined) {
        window.alert('先にこのページでケース直径と文字盤見切り直径を入力してから、文字盤の入力に進んでください');
        return;
      }
      if (dialObject === undefined) {
        window.alert('先にこのページで文字盤見切り直径を入力してから、文字盤の入力に進んでください');
        return;
      }
    }
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

// 数字フォントのサンプル"2"を各フォントで表示 ----------------------------------------

hourFontFamilyInputs.forEach(hourFontFamilyInput => {
  hourFontFamilyInput.parentElement.nextElementSibling.style.fontFamily = hourFontFamilyInput.value;
});

//* main canvas ----------------------------------------------------------------------------------

// fabricインスタンス ----------------------------------------

// オブジェクトを選択できるようにするなら ただの Canvas
const mainCanvas = new fabric.Canvas('main-canvas');
// オブジェクトを選択できないようにするなら StaticCanvas
// const mainCanvas = new fabric.StaticCanvas('main-canvas');
const mainCanvasCenterWidth = 192;
const mainCanvasCenterHeight = mmToPixel(125);

//* main case ------------------------------------------------------------------------------------

// 変数定義 ----------------------------------------

// オブジェクト
let caseObject;
let caseOpeningObject;
let dialObject;
let crownObject; // 2種類のクラウンで同じ変数名を共有。同時には存在しないからOK？
const lugObjects = [];
// サイズ・形状・色
let lugWidth;
let lugShape = 'round'; //初期値
let crownShape; //初期値無し
const defaultLugThickness = mmToPixel(2);
const defaultLugLength = mmToPixel(8);
let caseColor = 'white'; //初期値
let dialColor = 'white'; //初期値
// Node
const caseSizeInput = document.getElementById('case-size');
const caseOpeningSizeInput = document.getElementById('case-opening-size');
const dialSizeInput = document.getElementById('dial-size');
const lugWidthInput = document.getElementById('lug-width');

//* このdialSizeのような変数に、入力値を入れておいて使うのか、dialObjectのradiusなどを使う方が良いか要検討
let dialSize;

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
    left: mainCanvasCenterWidth,
    top: mainCanvasCenterHeight,
  });
  // すでに色が選ばれていた場合はその色にする
  caseObject.set({
    fill: caseColor,
  });
  // canvasに描画
  mainCanvas.add(caseObject);
  // ラグ再描画 ----
  // すでにラグが描かれていたら、再描画する
  // まだラグが描かれていないなら、何もしない
  // ただしラグ幅さえ入力されていれば、ラグ形状がまだ選択されていなくても初期値の round で描画する
  if (lugObjects.length !== 0) {
    switch(lugShape) { // 初期値は'round'
      case 'round':
        roundLug.drawLug();
        break;
      case 'square':
        squareLug.drawLug();
        break;
    }
  }
  // リュウズ再描画 ----
  // リュウズがまだ描かれていなくても、すでにリュウズ形状が選択されているなら描画する
  // すでにリュウズが描かれている場合は、条件式に当てはまるので再描画することになる
  if (crownShape !== undefined) {
    switch(crownShape) {
      case 'round':
        roundCrown.drawCrown();
        break;
      case 'square':
        squareCrown.drawCrown();
        break;
    }
  }
  // ベルト再描画 ----
  // すでにベルトが描かれていたら、再描画する
  // まだベルトが描かれていないなら、何もしない
  if (upperStrapObject !== undefined) {
    switch(strapShape) {
      case 'straight':
        upperStraightStrap.drawUpperStrap();
        break;
      case 'taper':
        upperTaperStrap.drawUpperStrap();
        break;
    }
  }
  if (lowerStrapObject !== undefined) {
    switch(strapShape) {
      case 'straight':
        lowerStraightStrap.drawLowerStrap();
        break;
      case 'taper':
        lowerTaperStrap.drawLowerStrap();
        break;
    }
  }
  // 重なり順を直す
  caseStackingOrder();
  // ラグ幅を入力できるようにする
  lugWidthInput.disabled = false;
});

//* main ケース見切り ----------------------------------------

// ケース見切りサイズが入力されたらcanvasに描画 ----------------
caseOpeningSizeInput.addEventListener('input', () => {
  mainCanvas.remove(caseOpeningObject);
  caseOpeningObject = new WatchCircle({
    radius: mmToPixel(caseOpeningSizeInput.value) / 2,
    left: mainCanvasCenterWidth,
    top: mainCanvasCenterHeight,
  });
  mainCanvas.add(caseOpeningObject);
  caseStackingOrder();
});

//* main 文字盤 ----------------------------------------

// 文字盤サイズが入力されたらcanvasに描画 ----------------
dialSizeInput.addEventListener('input', () => {
  // すでにオブジェクトが描かれていたらcanvasから削除
  mainCanvas.remove(dialObject);
  // dialSizeに値を代入
  dialSize = mmToPixel(dialSizeInput.value);
  // オブジェクト生成
  dialObject = new WatchCircle({
    radius: dialSize / 2,
    left: mainCanvasCenterWidth,
    top: mainCanvasCenterHeight,
    fill: dialColor,
  });
  mainCanvas.add(dialObject);
  // 数字再描画 ----
  // すでに数字が描かれていたら、再描画する
  if (hourObjects.length !== 0) {
    // 文字盤サイズが変われば数字の位置も変わるので、配置用円の値を計算しなおす
    hourLayoutCircleRadius = dialObject.radius - hourFontSize / 2 - hourFontSize / 4;
    drawHours();
  }
  // バーorドット再描画 ----
  // すでにバーorドットが描かれていたら、再描画する
  if (barOrDot !== undefined) {
    // 文字盤サイズが変わればバーorドットの位置も変わるので、配置用円の値を計算しなおす
    barDotLayoutCircleRadius = dialObject.radius - hourFontSize / 2 - hourFontSize / 4;
    drawBarDot();
  }
  // 重なり順を直す
  caseStackingOrder();
});

//* main ラグ ----------------------------------------

// ラグ幅の入力の順番を制限 ----------------
// 初期値は入力不可
lugWidthInput.disabled = true;
// ラグ幅の入力部分をクリックしたときの処理
lugWidthInput.parentElement.addEventListener('click', () => {
  // すでにケースが描かれていたら、何もしない
  if (caseObject !== undefined) {
    return;
  }
  // まだケースが描かれていなければアラートを表示
  window.alert('先にケース直径を入力してから、ラグ幅を入力してください');
});

// ラグ幅が入力されたらcanvasに描画 ----------------
lugWidthInput.addEventListener('input', () => {
  // lugWidthに値を代入
  lugWidth = mmToPixel(lugWidthInput.value);
  // ラグを描く関数呼び出し
  // ラグの形がまだ選択されていない場合は、lugShapeの初期値 round で描画されることになる
  switch(lugShape) { 
    case 'round':
      roundLug.drawLug();
      break;
    case 'square':
      squareLug.drawLug();
      break;
  }
  // ベルト(再)描画
  // ラグ幅が変更されたらベルトの幅も変わるので再描画する
  // すでにベルトが描かれているなら再描画、描かれていないなら何もしない
  if (upperStrapObject !== undefined) {
    switch(strapShape) {
      case 'straight':
        upperStraightStrap.drawUpperStrap();
        break;
      case 'taper':
        upperTaperStrap.drawUpperStrap();
        break;
    }
  }
  if (lowerStrapObject !== undefined) {
    switch(strapShape) {
      case 'straight':
        lowerStraightStrap.drawLowerStrap();
        break;
      case 'taper':
        lowerTaperStrap.drawLowerStrap();
        break;
    }
  }
});

// ラグの形状が選ばれたらcanvasに描画 ----------------
lugShapeInputs.forEach(lugShapeInput => {
  lugShapeInput.addEventListener('input', () => {
    // lugShapeに値を代入
    lugShape = lugShapeInput.value;
    // アラートを表示
    if (caseObject === undefined && lugWidth === undefined) {
      window.alert('ケース直径とラグ幅を入力するとラグが描かれます');
      return;
    }
    if (lugWidth === undefined) {
      window.alert('ラグ幅を入力するとラグが描かれます');
      return;
    }
    // ラグを描く関数呼び出し
    switch(lugShape) {
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
    //* 位置を計算するときに、直接入力値を使うのか、それともケースオブジェクトのheightなどを使うのか
    //* ここではケースオブジェクトのプロパティ(caseObject.height)を使っているが、
    //* heightだけではなくradiusなどもあるし、どれを使うべきか
    //* 今のところ混在してごちゃごちゃしている
    for(let i = 0; i < 4; i++) { // i= 0, 1, 2, 3
      fabric.loadSVGFromURL(this.url, (objects, options) => {
        lugObjects[i] = fabric.util.groupSVGElements(objects, options);
        lugObjects[i].set({
          originX: 'center',
          left: mainCanvasCenterWidth - lugWidth / 2 - defaultLugThickness / 2,
          top: mainCanvasCenterHeight - caseObject.height / adjustValue,
          fill: caseColor,
        });
        if (i === 1 || i === 3) {
          lugObjects[i].set({
            left: mainCanvasCenterWidth - lugWidth / 2 - defaultLugThickness / 2 + lugWidth + defaultLugThickness,
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

// リュウズの形状が選ばれたらcanvasに描画 ----------------
crownShapeInputs.forEach(crownShapeInput => {
  crownShapeInput.addEventListener('input', () => {
    // crownShapeに値を代入
    crownShape = crownShapeInput.value;
    // アラートを表示
    if (caseObject === undefined) {
      window.alert('ケース直径を入力するとリュウズが描かれます');
      return;
    }
    // リュウズを描く関数呼び出し
    switch(crownShape) {
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
        fill: caseColor,
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

// 色が選択されたら、ケース(とラグとリュウズとバックル)に色をつける関数呼び出し ----------------
// 色が選択されたとき、オブジェクトがすでにあれば色を付ける
// オブジェクトがまだなければ色を保持しておいて、オブジェクトが生成されたときに色を付ける
caseColorInputs.forEach(caseColorInput => {
  caseColorInput.addEventListener('input', () => {
    // 色が選択された時点で、(オブジェクトがまだなくても)変数に値を入れておく
    switch(caseColorInput.value) {
      case 'gold':
        caseColor = goldGradation;
        break;
      case 'silver':
        caseColor = silverGradation;
        break;
      case 'pink-gold':
        caseColor = pinkGoldGradation;
        break;
      case 'custom-color':
        caseColor = caseColorPicker.value;
        break;
    }
    //* ケースさえもまだ描かれていない(色を付けるオブジェクトがまだ何もない)場合は、アラートを表示
    if (caseObject === undefined) {
      window.alert('ケース直径などを入力すると、選択した色がつきます');
      return;
    }
    // オブジェクトに色をつける関数呼び出し
    // オブジェクトの有無は呼び出し先の関数で判定
    applyCaseColor();
  });
});

// ケース(とラグとリュウズとバックル)に色をつける関数 ----------------
function applyCaseColor() {
  // caseObjectの有無は、呼び出し元で判定済みなのでここでは判定不要
  caseObject.set({
    fill: caseColor,
  });
  if (crownObject !== undefined) {
    crownObject.set({
      fill: caseColor,
    });
  }
  if (lugObjects !== undefined) {
    lugObjects.forEach(lugObject => {
      lugObject.set({
        fill: caseColor,
      });
    });
  }
  if (buckleObject !== undefined) {
    buckleObject._objects.forEach(object => {
      object.set({
        fill: caseColor,
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
let strapShape = 'taper'; // 初期値
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
let strapHoleQuantity; // ベルト穴の個数 初期値なし
let strapHoleDistance; // ベルト穴の間隔 初期値なし
let countDistance = 0; // 一番下の穴からどれくらい移動するかを保持する変数
// ステッチ
let upperStrapStitchObject;
let lowerStrapStitchObject;
let topStitchObject;
let strapStitchExist = false; // ストラップ有無 初期値はfalse
// バックル
let buckleObject;
let buckleShape;
// Node
const upperStrapLengthInput = document.getElementById('upper-strap-length');
const lowerStrapLengthInput = document.getElementById('lower-strap-length');

//* main ベルト本体 ----------------------------------------

// ベルト本体のクラス ----------------
// 上ベルトクラス
class WatchUpperStrap {
  constructor(url) {
    this.url = url;
  }
  drawUpperStrap() {
    // すでにオブジェクトが描かれていたらcanvasから削除
    mainCanvas.remove(upperStrapObject);
    // SVGファイル読み込み
    fabric.loadSVGFromURL(this.url, (objects, options) =>{
      upperStrapObject = fabric.util.groupSVGElements(objects, options);
      strapWidth = lugWidth;
      upperStrapObject.set({
        originX: 'center',
        originY: 'bottom',
        fill: inputStrapColor,
        left: mainCanvasCenterWidth,
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
        switch(strapShape) {
          case 'straight':
            upperStraightStitch.drawUpperStitch();
            break;
          case 'taper':
            upperTaperStitch.drawUpperStitch();
            break;
        }
      }
      // ループ(再)描画 ----
      drawStrapLoop();
      // バックル再描画 ----
      // バックルがまだ描かれていなくても、すでにバックル形状が選択されているなら描画する
      // すでにバックルが描かれている場合は、条件式に当てはまるので再描画することになる
      // バックルがまだ描かれておらず、バックル形状が選択されていないなら何もしない
      if (buckleShape !== undefined) {
        switch(buckleShape) {
          case 'round':
            roundBuckle.drawBuckle();
            break;
          case 'square':
            squareBuckle.drawBuckle();
            break;
        }
      }
    });
  }
}
// 下ベルトクラス
class WatchLowerStrap {
  constructor(url) {
    this.url = url;
  }
  drawLowerStrap() {
    // すでにオブジェクトが描かれていたらcanvasから削除
    mainCanvas.remove(lowerStrapObject);
    // SVGファイル読み込み
    fabric.loadSVGFromURL(this.url, (objects, options) =>{
      lowerStrapObject = fabric.util.groupSVGElements(objects, options);
      strapWidth = lugWidth;
      lowerStrapObject.set({
        originX: 'center',
        fill: inputStrapColor,
        left: mainCanvasCenterWidth,
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
        switch(strapShape) {
          case 'straight':
            lowerStraightStitch.drawLowerStitch();
            break;
          case 'taper':
            lowerTaperStitch.drawLowerStitch();
            break;
        }
      }
      // ベルト穴(再)描画 ----
      // ベルト穴がまだ描かれていなくても、すでにベルト穴個数と間隔が両方選択されているなら描画する
      // すでにベルト穴が描かれている場合は、条件式に当てはまるので再描画することになる
      // ベルト穴がまだ描かれておらず、ベルト穴個数と間隔どちらかが選択されていないなら何もしない
      if (strapHoleQuantity !== undefined && strapHoleDistance !== undefined) {
        drawStrapHoles();
      }
    });
    // loadSVGFromURLは非同期処理である事に注意
    // {}外はloadSVGFromURLのコールバック関数外なので、SVGの読み込みより前に実行される可能性がある
    // そのためここに書いた処理が行われるとき、まだlowerStrapObjectは存在していない
    // よってlowerStrapObjectを使うような処理は{}内に書くこと
  }
}

// ベルトのインスタンス生成 ----------------
const upperStraightStrap = new WatchUpperStrap('./assets/upper-straight-strap.svg');
const upperTaperStrap = new WatchUpperStrap('./assets/upper-taper-strap.svg');
const lowerStraightStrap = new WatchLowerStrap('./assets/lower-straight-strap.svg');
const lowerTaperStrap = new WatchLowerStrap('./assets/lower-taper-strap.svg');

// ベルトの形状が入力されたら、ベルト本体を描く関数呼び出し ----------------
strapShapeInputs.forEach(strapShapeInput => {
  strapShapeInput.addEventListener('input', () => {
    // 変数に値を代入
    strapShape = strapShapeInput.value;
    // ストラップがまだ無い場合はここでリターン
    if(upperStrapObject === undefined || lowerStrapObject === undefined) {
      alert('ベルトの長さを上側下側両方入力すると、選択した形のベルトが描かれます');
      return;
    }
    // ベルトを描く関数呼び出し
    switch(strapShape) {
      case 'straight':
        upperStraightStrap.drawUpperStrap();
        lowerStraightStrap.drawLowerStrap();
        break;
      case 'taper':
        upperTaperStrap.drawUpperStrap();
        lowerTaperStrap.drawLowerStrap();
        break;
    }
  });
});

// ベルトの長さが入力されたら、ベルト本体を描く関数呼び出し ----------------
// 上ベルト本体
upperStrapLengthInput.addEventListener('input', () => {
  switch(strapShape) {
    case 'straight':
      upperStraightStrap.drawUpperStrap();
      break;
    case 'taper':
      upperTaperStrap.drawUpperStrap();
      break;
  }
});
// 下ベルト本体
lowerStrapLengthInput.addEventListener('input', () => {
  switch(strapShape) {
    case 'straight':
      lowerStraightStrap.drawLowerStrap();
      break;
    case 'taper':
      lowerTaperStrap.drawLowerStrap();
      break;
  }
});

//* main ベルトループ ----------------------------------------

// ループを描く関数 ----------------
function drawStrapLoop() {
  // すでにオブジェクトが描かれていたらcanvasから削除
  mainCanvas.remove(fixedStrapLoopObject);
  mainCanvas.remove(moveableStrapLoopObject);
  // ループオブジェクトを生成
  // 固定ループ ----
  fixedStrapLoopObject = new fabric.Rect({
    width: strapWidth + mmToPixel(2),
    height: mmToPixel(5),
    originX: 'center',
    fill: inputStrapColor,
    left: mainCanvasCenterWidth,
    top: upperStrapObject.top - mmToPixel(upperStrapLengthInput.value) + mmToPixel(8),
    stroke: 'black',
  });
  // ベルト形状がストレートの場合は、ループの幅を広くする
  if (strapShape === 'straight') {
    fixedStrapLoopObject.set({
      width: strapWidth + mmToPixel(4),
    });
  }
  // 可動ループ 固定ループの深いコピーで作る ----
  moveableStrapLoopObject = fabric.util.object.clone(fixedStrapLoopObject);
  moveableStrapLoopObject.set({
    top: fixedStrapLoopObject.top + mmToPixel(5) + mmToPixel(10),
  });
  // canvasに描画
  mainCanvas.add(fixedStrapLoopObject);
  mainCanvas.add(moveableStrapLoopObject);
}

//* main ベルト穴 ----------------------------------------

// ベルト穴個数が選択されたら、ベルト穴を描く関数を呼び出し ----------------
strapHoleQuantityInputs.forEach(strapHoleQuantityInput => {
  strapHoleQuantityInput.addEventListener('input', () => {
    // 変数に値を代入
    strapHoleQuantity = parseInt(strapHoleQuantityInput.value);
    // 下ストラップがまだ無い場合はここでリターン
    if(lowerStrapObject === undefined) {
      alert('ベルト長さ(下側)を入力するとベルト穴が描かれます');
      return;
    }
    // ベルト穴間隔がまだ入力されていない場合はここでリターン
    if (strapHoleDistance === undefined) {
      alert('ベルト穴間隔も入力するとベルト穴が描かれます');
    }
    // ベルト穴を描く関数呼び出し
    drawStrapHoles();
  });
});

// ベルト穴間隔が選択されたら、ベルト穴を描く関数を呼び出し ----------------
strapHoleDistanceInputs.forEach(holeDistanceInput => {
  holeDistanceInput.addEventListener('input', () => {
    // 変数に値を代入
    strapHoleDistance = mmToPixel(parseInt(holeDistanceInput.value));
    /// 下ストラップがまだ無い場合はここでリターン
    if(lowerStrapObject === undefined) {
      alert('ベルト長さ(下側)を入力するとベルト穴が描かれます');
      return;
    }
    // ベルト穴個数がまだ入力されていない場合はここでリターン
    if (strapHoleQuantity === undefined) {
      alert('ベルト穴個数も入力するとベルト穴が描かれます');
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
      left: mainCanvasCenterWidth,
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
strapStitchInputs.forEach(stitchInput => {
  stitchInput.addEventListener('input', () => {
    // ステッチの有無を変数に代入 inputする前の初期値はfalse
    strapStitchExist = stitchInput.value;
    if (strapStitchExist === 'true') {
      strapStitchExist = true;
    } else {
      strapStitchExist = false;
    }
    // 上下両方もしくはどちらかのストラップがまだ無い場合はここでリターン
    // 上下両方のストラップがなければ、ステッチを描く関数は呼ばれない
    if (upperStrapObject === undefined || lowerStrapObject === undefined) {
      alert('ベルトの長さを上側下側両方入力すると、ステッチが描かれます');
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
      switch(strapShape) {
        case 'straight':
          upperStraightStitch.drawUpperStitch();
          lowerStraightStitch.drawLowerStitch();
          break;
        case 'taper':
          upperTaperStitch.drawUpperStitch();
          lowerTaperStitch.drawLowerStitch();
          break;
      }
    }
  });
});

// ステッチのクラス ----------------
// 上ベルトステッチクラス ----
class WatchUpperStitch {
  constructor(url) {
    this.url = url;
  }
  drawUpperStitch() {
    // すでにオブジェクトが描かれていたらcanvasから削除
    mainCanvas.remove(upperStrapStitchObject);
    mainCanvas.remove(topStitchObject);
    // 上ベルトステッチ生成
    // 基本はlowerStrapObjectと同じで、位置の調整と点線に変更
    fabric.loadSVGFromURL(this.url, (objects, options) =>{
      upperStrapStitchObject = fabric.util.groupSVGElements(objects, options);
      strapWidth = lugWidth;
      upperStrapStitchObject.set({
        originX: 'center',
        originY: 'bottom',
        left: mainCanvasCenterWidth,
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
        x: mainCanvasCenterWidth - strapWidth / 2 + mmToPixel(2.5),
        y: upperStrapObject.top - mmToPixel(upperStrapLengthInput.value) + mmToPixel(6)
      },
      {
        x: mainCanvasCenterWidth + strapWidth / 2 - mmToPixel(2.5),
        y: upperStrapObject.top - mmToPixel(upperStrapLengthInput.value) + mmToPixel(6)
      }],
      {
        stroke: 'black',
        strokeDashArray: [8, 2],
      }
    );
    // ベルト形状がストレートの場合、バックル近くのステッチの幅を長くする
    if (strapShape === 'straight') {
      topStitchObject.set({
        points: [
          {
            x: mainCanvasCenterWidth - strapWidth / 2 + mmToPixel(1.5),
            y: upperStrapObject.top - mmToPixel(upperStrapLengthInput.value) + mmToPixel(6)
          },
          {
            x: mainCanvasCenterWidth + strapWidth / 2 - mmToPixel(1.5),
            y: upperStrapObject.top - mmToPixel(upperStrapLengthInput.value) + mmToPixel(6)
          }
        ]
      });
    }
    // canvasに描画
    mainCanvas.add(topStitchObject);
  }
}
// 下ベルトステッチクラス ----
class WatchLowerStitch {
  constructor(url) {
    this.url = url;
  }
  drawLowerStitch() {
    // すでにオブジェクトが描かれていたらcanvasから削除
    mainCanvas.remove(lowerStrapStitchObject);
    // 下ベルトステッチ生成
    fabric.loadSVGFromURL(this.url, (objects, options) =>{
      lowerStrapStitchObject = fabric.util.groupSVGElements(objects, options);
      strapWidth = lugWidth;
      lowerStrapStitchObject.set({
        originX: 'center',
        left: mainCanvasCenterWidth,
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
}

// ステッチのインスタンス生成 ----
const upperStraightStitch = new WatchUpperStitch('./assets/upper-straight-stitch.svg');
const upperTaperStitch = new WatchUpperStitch('./assets/upper-taper-stitch.svg');
const lowerStraightStitch = new WatchLowerStitch('./assets/lower-straight-stitch.svg');
const lowerTaperStitch = new WatchLowerStitch('./assets/lower-taper-stitch.svg');

//* main ベルト色 ----------------------------------------

// 色を変えたいオブジェクトをまとめるための配列を準備
let strapColorChangeLists;
// 色が選択されたら、ベルトに色をつける関数呼び出し ----------------
strapColorInputs.forEach(strapColorInput => {
  strapColorInput.addEventListener('input', () => {
    // オブジェクトを生成してから配列に入れないとundefinedが入ってエラーが出てしまうので、
    // 色が選択された時点で配列にオブジェクトを入れる
    strapColorChangeLists = [upperStrapObject, lowerStrapObject, fixedStrapLoopObject, moveableStrapLoopObject];
    // 色が選択された時点で、(オブジェクトがまだなくても)変数に値を入れておく
    //* ここ直せそう
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
    // まだ上下どちらのベルトもなければここでリターン
    // 上下どちらかのベルトがあれば、オブジェクトに色を付ける関数呼び出し
    if (upperStrapObject === undefined && lowerStrapObject === undefined) {
      alert('ベルトの長さを入力すると、選択した色がつきます');
      return;
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

//* main バックル ----------------------------------------

// バックルのクラス ----------------
class WatchBuckle {
  constructor(url) {
    this.url = url;
  }
  drawBuckle() {
    // すでにオブジェクトが描かれていたらcanvasから削除
    mainCanvas.remove(buckleObject);
    // バックルオブジェクト生成
    fabric.loadSVGFromURL(this.url, (objects, options) => {
      buckleObject = fabric.util.groupSVGElements(objects, options);
      buckleObject.set({
        originX: 'center',
        left: mainCanvasCenterWidth,
        originY:'bottom',
        // バックルを描く位置(高さ)を、上ベルトの位置から取得する
        top: upperStrapObject.top - mmToPixel(upperStrapLengthInput.value) + mmToPixel(4),
        // 幅と長さを拡大縮小
        //* 調整必要
        scaleX: strapWidth / defaultStrapWidth,
        scaleY: strapWidth / defaultStrapWidth,
      });
      // fabric.util.groupSVGElementsは、複数のSVGパスをグループ化して1つのオブジェクトとして作成する
      // この場合、fillなどの属性は直接設定できないが、
      // グループオブジェクト内の各パスには、_objectsというプロパティでアクセスできる
      // このプロパティはパスの配列となっており、個々のパスに対して属性を変更することができる
      buckleObject._objects.forEach(object => {
        object.set({
          fill: caseColor,
          // 線幅を保つ
          strokeUniform: true,
        });
      });
      // canvasに描画
      mainCanvas.add(buckleObject);
    });
  }
}

// バックルインスタンス生成 ----------------
const roundBuckle = new WatchBuckle('./assets/buckle-round.svg');
const squareBuckle = new WatchBuckle('./assets/buckle-square.svg');

// バックルの形状が選択されたら、バックルを描く関数を呼び出し ----------------
buckleShapeInputs.forEach(buckleShapeInput => {
  buckleShapeInput.addEventListener('input', () => {
    // 変数に値を代入
    buckleShape = buckleShapeInput.value;
    /// 上ストラップがまだ無い場合はここでリターン
    if(upperStrapObject === undefined) {
      alert('ベルト長さ(上側)を入力するとバックルが描かれます');
      return;
    }
    // バックルを描く関数呼び出し
    switch(buckleShape) {
      case 'round':
        roundBuckle.drawBuckle();
        break;
      case 'square':
        squareBuckle.drawBuckle();
        break;
    }
  });
});

//* main dial ----------------------------------------------------------------------------------

// memo: dialObject の描画は、caseのところで定義してある

// 変数定義 ----------------------------------------

// オブジェクト
let hourObjects = [];
let barDotObjects = [];

// インスタンス用の変数
// これらはcanvasに描かれるオブジェクトではない
// これらのインスタンスから呼び出したメソッドの中で、
// hourObjects 配列に追加されていく名もなきオブジェクトたちが fabric オブジェクト
let hour1, hour2, hour3, hour4, hour5, hour6, hour7, hour8, hour9, hour10, hour11, hour12;

// 数字の位置を計算するための数値
const sin30 = Math.sin(30 * Math.PI / 180);
const cos30 = Math.cos(30 * Math.PI / 180);
const sin60 = Math.sin(60 * Math.PI / 180);
const cos60 = Math.cos(60 * Math.PI / 180);

// 値・サイズ・色
let hourFontSize = 12; // 初期値12
let hourLayout; // 全数字 or 4ポイント or 2ポイント
let hourLayoutCircleRadius; // 数字たちを配置するための(数字それぞれの中心がこの円の円周上にくる)円の半径
let barDotLayoutCircleRadius; // バードットを配置するための(それぞれの中心がこの円の円周上にくる)円の半径
let hourFontFamily = 'sans-serif'; // 初期値
let hourColor = 'black'; // 初期値
let barOrDot; // バーかドットかを保持する変数
let barWidth = mmToPixel(1);
let barLength = mmToPixel(5);
let dotRadius = mmToPixel(1);
const goldDeepColor = 'rgb(255,222,0)';
const goldPaleColor = 'rgb(255,234,96)';
const silverDeepColor = 'rgb(115,115,115)';
const silverPaleColor = 'rgb(195,195,195)';
const pinkGoldDeepColor = 'rgb(175,108,54)';
const pinkGoldPaleColor = 'rgb(225,153,94)';
// 文字盤の中心座標(=バーなどを回転させるときの中心点)
const centerPoint = new fabric.Point(mainCanvasCenterWidth, mainCanvasCenterHeight);
// バーなどを配置するための円の、円周上の点の初期位置(12時位置)
let initialPoint;
// 回転角度を保持する変数
let rotateDegrees = 0;

//* main 文字盤色 ----------------------------------------

// 文字盤ベース色が選択されたら、色を付ける ----------------
dialColorInputs.forEach(dialColorInput => {
  dialColorInput.addEventListener('input', () => {
    // dialColor に input の value を代入
    dialColor = dialColorInput.value;
    // 「その他の色」が選択された時は dialColor にカラーピッカーの値を代入
    // ↓のコードがなかったので、カスタムカラーを選択したときにすぐに色が変わらない問題が起きていた
    // dialColor( dialColorInput.value )は、すでに用意した色の値はblackやwhiteだが、
    // カスタムカラーの時は custom-color という文字列なので、
    // この先で fill: 'custom-color'となってしまうから色が変わらない
    if (dialColorInput.value === 'custom-color') {
      dialColor = dialColorPicker.value;
    }
    // アラートを表示
    if (dialObject === undefined) {
      alert('「ケース」タブの「文字盤見切り直径」を入力すると、選択した色がつきます');
      return;
    }
    // 文字盤に色をつける
    dialObject.set({
      fill: dialColor,
    });
    mainCanvas.renderAll();
  });
});

//* main 文字盤数字 ----------------------------------------

// 数字のクラス ----------------
class Hour {
  constructor(left, top, text) {
    this.left = left;
    this.top = top;
    this.text = text;
  }
  // 1つの数字を描くメソッド
  // インスタンスから drawHour メソッドを呼び出すと、canvasにオブジェクトが描かれ、
  // さらに hourObjects 配列に hourObject オブジェクトが入っていく
  // 配列に入れるのは、後から数字の大きさを変えたりするのにループを回すため
  // 配列に入っているオブジェクトは全て hourObject という名前?
  // 実際には名前はついておらず、名もなきオブジェクトが配列に入っている?
  drawHour() {
    const hourObject = new fabric.Text(this.text, {
      originX: 'center',
      originY: 'center',
      fill: hourColor,
      fontFamily: hourFontFamily,
      fontSize: hourFontSize,
      left: this.left,
      //* 数字の下に少し隙間が空いてしまう問題が解決できていない
      //* textBaselineなどのプロパティがうまく効かないのでとりあえずtopで調整している
      // top: this.top,
      top: this.top + hourFontSize / 14,
      // lineHeight: 1,
      // pathAlign: 'center',
      // textBaseline: 'middle',
      //* test stroke
      // stroke: 'black',
      // strokeWidth: .5,
    });
    mainCanvas.add(hourObject);
    hourObjects.push(hourObject);
  }
}

// 数字の配置が選択されたらcanvasに描画する ----------------
hourLayoutInputs.forEach(hourLayoutInput => {
  hourLayoutInput.addEventListener('input', () => {
    // hourLayout に値を代入
    hourLayout = hourLayoutInput.value;
    // hourLayoutCircleRadius を計算
    // 文字盤半径から数字のフォントサイズの半分を引くと、ちょうど数字の外側が文字盤の円に触れる位置になる
    // そこから内側に少し調整した円の半径
    hourLayoutCircleRadius = dialObject.radius - hourFontSize / 2 - hourFontSize / 4;
    // レンジの入力可・不可の切り替え ----
    switchRange();
    // 数字たちを描く関数呼び出し
    drawHours();
    // すでにバーorドットが描かれている場合は、再描画する
    // (barDotObjects.length !== 0) での条件分岐だと、
    // 前回全数字を選んでいた場合に barDotObjects.length は 0 だから バーorドットを描く関数が呼ばれない
    // なので barOrDot に値が入っているかどうかで条件分岐する
    if (barOrDot !== undefined) {
      drawBarDot();
    }
  });
});

// 数字のフォントが選択されたらcanvasに描画する ----------------
hourFontFamilyInputs.forEach(hourFontFamilyInput => {
  hourFontFamilyInput.addEventListener('input', () => {
    // hourFontFamily に値を代入
    hourFontFamily = hourFontFamilyInput.value;
    // 数字の配置がまだ選択されていない場合にアラートを表示
    if (hourLayout === undefined) {
      alert('数字の配置を選択すると、数字が描画されます');
      return;
    }
    if (hourLayout === 'no-hour') {
      alert('数字なしが選択されています。数字があるデザインを選択すると指定のフォントで描かれます。');
    }
    // 数字たちを描く関数呼び出し
    drawHours();
  });
});

// 数字たちを描く関数 ----------------
function drawHours() {
  // 数字の位置を計算する式は何度も書くことになるのでここで変数に入れておく
  // 4種類の距離で、全ての数字の位置を計算できる
  // 1, 5, 7, 11 用 ----
  // X = x + r * cosΘ の r * cosΘ の部分
  const distanceX1 = (hourLayoutCircleRadius) * cos60;
  // Y = y + r * sinΘ の r * sinΘ の部分
  const distanceY1 = (hourLayoutCircleRadius) * sin60;
  // 2, 4, 8, 10 用 ----
  // X = x + r * cosΘ の r * cosΘ の部分
  const distanceX2 = (hourLayoutCircleRadius) * cos30;
  // X = x + r * cosΘ の r * cosΘ の部分
  const distanceY2 = (hourLayoutCircleRadius) * sin30;

  // すでにオブジェクトが描かれていたらcanvasから削除し、配列も空にする ----
  if (hourObjects.length !== 0) {
    hourObjects.forEach(hourObject => {
      mainCanvas.remove(hourObject);
    });
    hourObjects = [];
  }
  // 数字なしの場合
  if (hourLayout === 'no-hour') {
    return;
  }
  // Hourインスタンスを生成 ----
  // 引数は順に left, top, text
  //* 全数字、4ポイント、2ポイント 共通 ----
  // 6
  hour6 = new Hour(
    mainCanvasCenterWidth,
    mainCanvasCenterHeight + hourLayoutCircleRadius,
    '6',
  );
  hour6.drawHour();
  // 12
  hour12 = new Hour(
    mainCanvasCenterWidth,
    mainCanvasCenterHeight - hourLayoutCircleRadius,
    '12',
  );
  hour12.drawHour();
  //* 全数字、4ポイント 共通 ----
  if (hourLayout === 'all-hour' || hourLayout === 'four-point-hour') {
    // 3
    hour3 = new Hour(
      mainCanvasCenterWidth + hourLayoutCircleRadius,
      mainCanvasCenterHeight,
      '3',
    );
    hour3.drawHour();
    // 9
    hour9 = new Hour(
      mainCanvasCenterWidth - hourLayoutCircleRadius,
      mainCanvasCenterHeight,
      '9',
    );
    hour9.drawHour();
  }
  //* 全数字のみ ----
  if (hourLayout === 'all-hour') {
    // 1
    hour1 = new Hour(
      mainCanvasCenterWidth + distanceX1,
      mainCanvasCenterHeight - distanceY1,
      '1',
    );
    hour1.drawHour();
    // 2
    hour2 = new Hour(
      mainCanvasCenterWidth + distanceX2,
      mainCanvasCenterHeight - distanceY2,
      '2',
    );
    hour2.drawHour();
    // 4
    hour4 = new Hour(
      mainCanvasCenterWidth + distanceX2,
      mainCanvasCenterHeight + distanceY2,
      '4',
    );
    hour4.drawHour();
    // 5
    hour5 = new Hour(
      mainCanvasCenterWidth + distanceX1,
      mainCanvasCenterHeight + distanceY1,
      '5',
    );
    hour5.drawHour();
    // 7
    hour7 = new Hour(
      mainCanvasCenterWidth - distanceX1,
      mainCanvasCenterHeight + distanceY1,
      '7',
    );
    hour7.drawHour();
    // 8
    hour8 = new Hour(
      mainCanvasCenterWidth - distanceX2,
      mainCanvasCenterHeight + distanceY2,
      '8',
    );
    hour8.drawHour();
    // 10
    hour10 = new Hour(
      mainCanvasCenterWidth - distanceX2,
      mainCanvasCenterHeight - distanceY2,
      '10',
    );
    hour10.drawHour();
    // 11
    hour11 = new Hour(
      mainCanvasCenterWidth - distanceX1,
      mainCanvasCenterHeight - distanceY1,
      '11',
    );
    hour11.drawHour();
  }
  // 数字とバーorドットに色を付ける関数 を呼び出す関数を呼び出し
  callApplyIndexColor(hourColor);
}

//* main 文字盤 バー・ドット ----------------------------------------
// ドットを2つ一組でグループ化して、それをcloneして回転させていきたいけどうまくcloneできなかった
// fabric.Pointを使って点の位置を取得する方法を採用
//* 数字もこれでできそうなので後で直す?

// バーorドットが選択されたらcanvasに描画する ----------------
barDotInputs.forEach(barDotInput => {
  barDotInput.addEventListener('input', () => {
    // 変数に値を代入
    barOrDot = barDotInput.value;
    // 計算に必要な数値を準備する ----
    // バーorドットを配置するための円の半径を計算
    // 呼び出し先の drawBarDot 内でこの値を計算してしまうと、レンジを変えても再計算されるため値が変わらない
    // そのため呼び出し元で計算する
    barDotLayoutCircleRadius = dialObject.radius - hourFontSize / 2 - hourFontSize / 4;
    // レンジの入力可・不可の切り替え ----
    switchRange();
    // バーorドットを描く関数呼び出し
    drawBarDot();
  });
});

// バーorドットを描く関数 ----------------
function drawBarDot() {
  // すでにオブジェクトが描かれていたらcanvasから削除し、配列も空にする ----
  barDotObjects.forEach(barDotObject => {
    mainCanvas.remove(barDotObject);
  });
  barDotObjects = [];
  // 計算に必要な数値を準備する ----
  // バーorドットを配置するための円の、円周上の点の初期位置(12時位置)
  // fabric.Point(x座標, y座標)
  initialPoint = new fabric.Point(mainCanvasCenterWidth, mainCanvasCenterHeight - barDotLayoutCircleRadius);
  // ループを回してバーorドットを描く ----
  for (let i = 0; i < 12; i++) {
    // barDotObject は、このループ内でしか使わない、個々のバーorドットオブジェクトの変数名
    // バーorドットが不要な位置を透明にsetするときに名前が必要なのでつけている
    // 実際に配列 barDotObjects に入るときは、この名前が使われるわけではないと思われる
    let barDotObject;
    // fabric.util.rotatePointメソッドを使用して、
    // 初期位置の点 initialPoint を、centerPoint を 中心に、指定の度数回転させた位置を取得
    // rotatedPoint の値はループのたびに rotateDegrees によって更新される
    // fabric.util.rotatePoint(回転前の元の座標, 回転の中心座標, 回転角度)
    // 取得したrotatedPoint は、プロパティにx座標とy座標を持つので、rotatedPoint.x のように使う
    const rotatedPoint = fabric.util.rotatePoint(initialPoint, centerPoint, fabric.util.degreesToRadians(rotateDegrees));
    // 全数字が選択されていたら何も描かない
    if (hourLayout === 'all-hour') {
      return;
    }
    // バーオブジェクト
    if (barOrDot === 'bar') {
      barDotObject = new fabric.Rect({
        width: barWidth,
        height: barLength,
        fill: hourColor,
        originX: 'center',
        originY: 'center',
        top: rotatedPoint.y,
        left: rotatedPoint.x,
      });
      // バーの向きを回転させる
      barDotObject.rotate(rotateDegrees);
    }
    // ドットオブジェクト
    if (barOrDot === 'dot') {
      barDotObject = new fabric.Circle({
        radius: dotRadius,
        fill: hourColor,
        originX: 'center',
        originY: 'center',
        top: rotatedPoint.y,
        left: rotatedPoint.x,
      });
    }
    // ここからはバードット共通
    // 数字が4ポイントの時 3, 6, 9, 12 位置を透明に
    if (hourLayout === 'four-point-hour') {
      if (i % 3 === 0) {
        barDotObject.set({
          fill: 'transparent',
        });
      }
    }
    // 数字が2ポイントの時 6, 12 位置を透明に
    if (hourLayout === 'two-point-hour') {
      if (i % 6 === 0) {
        barDotObject.set({
          fill: 'transparent',
        });
      }
    }
    // barDotObjects 配列に入れる
    barDotObjects.push(barDotObject);
    // 回転角度を更新
    rotateDegrees += 30;
  }
  // ループが終わってオブジェクトが配列に入ったら、canvasに描画 ----
  barDotObjects.forEach(barDotObject => {
    mainCanvas.add(barDotObject);
  });
  // 数字とバーorドットに色を付ける関数 を呼び出す関数を呼び出し
  callApplyIndexColor(hourColor);
}

//* main 数字とバーorドットの色 ----------------------------------------

// 数字色が選択されたら、色を付ける ----------------
hourColorInputs.forEach(hourColorInput => {
  hourColorInput.addEventListener('input', () => {
    // 変数 hourColor に値を代入しておく
    //* hourColor は、グラデーション色が選択されたときは分岐条件に使われ、
    //* 単色が選択されたときはそのまま hourColorInput.value が色の値として使われ、
    //* カスタム色が選択されたときは、カラーピッカーの値を代入しなおすことになる
    hourColor = hourColorInput.value;
    // アラートを表示
    if (hourObjects.length === 0 && barDotObjects.length === 0) {
      alert('「数字の配置」や「バーorドット」を入力すると、選択した色で描かれます');
      return;
    }
    //* 数字色にもグラデーションクラスを使いたいが、なぜか作成したグラデーションクラスを指定すると色がつかない
    //*  →とりあえず直接Gradientを指定
    //* 数字にstrokeをつけると、ダウンロードしたときに塗と線で別のオブジェクトになってしまい使いにくい
    //*  →テキストのパス化は色々試したができなかった
    //*  →shadowで対応しようかと思ったがダウンロードするとshadowは消えてしまう
    //*  →線無し、塗だけで表現する方法しか今は思いつかない
    //* webフォントで変わったデザインのフォントを使いたいが、
    //* ダウンロードしたときにユーザーの環境にそのフォントはたぶん無いので代替フォントになってしまう
    //* そのためダウンロード前にパス化したいが、今のところは方法がわからない
    //*  →とりあえず一般的なフォントだけ使う
    //! 塗りだけで表現するところまでは良かったが、ダウンロードしてillustratorで開くとグラデーションが適用されていない
    //! あと透明にしたバーとドットも存在はしているので邪魔かも
    // 数字とバーorドットに色を付ける関数 を呼び出す関数を呼び出し
    callApplyIndexColor(hourColor);
    mainCanvas.renderAll();
  });
});

// 数字とバーorドットに色を付ける関数 を呼び出す関数 ----------------
function callApplyIndexColor(parameter) {
  switch(parameter) {
    case 'gold':
      // 数字に色をつける
      applyIndexGradientColor(hourObjects, goldDeepColor,  goldPaleColor);
      // バーorドットにも色をつける(透明にしているバーorドット以外)
      // バーorドットが不要な位置は、バーorドットを透明にして対応していることに注意
      // 呼び出し先の関数で条件分岐している
      applyIndexGradientColor(barDotObjects, goldDeepColor, goldPaleColor);
      break;
    case 'silver':
      applyIndexGradientColor(hourObjects, silverDeepColor, silverPaleColor);
      applyIndexGradientColor(barDotObjects, silverDeepColor, silverPaleColor);
      break;
    case 'pink-gold':
      applyIndexGradientColor(hourObjects, pinkGoldDeepColor, pinkGoldPaleColor);
      applyIndexGradientColor(barDotObjects, pinkGoldDeepColor, pinkGoldPaleColor);
      break;
    case 'custom-color':
      // custom-colorのときは hourColor にカラーピッカーの値を代入しなおす
      hourColor = hourColorPicker.value;
      applyIndexSolidColor(hourObjects);
      applyIndexSolidColor(barDotObjects);
      break;
    default:
      // 単色の時はそのまま hourColor の値を使う
      applyIndexSolidColor(hourObjects);
      applyIndexSolidColor(barDotObjects);
  }
}

// 数字とバーorドットにグラデーション色をつける関数 ----------------
function applyIndexGradientColor(objects, deepColor, PaleColor) {
  objects.forEach(object => {
    // バーorドット用の条件分岐
    // 数字には関係ない条件分岐だが、数字はtransparentであることはないので、処理が行われる
    if (object.fill !== 'transparent') {
      object.set('fill', new fabric.Gradient({
        type: 'linear',
        coords:{
          x1: 0, 
          y1: 0,
          x2: object.width,
          y2: 0,
        },
        colorStops: [
          {color: deepColor, offset: 0},
          {color: PaleColor, offset: .5},
          {color: deepColor, offset: 1}
        ]
      }));
    }
  });
}

// 数字とバーorドットに単色をつける関数 ----------------
function applyIndexSolidColor(objects) {
  objects.forEach(object => {
    // バーorドット用の条件分岐
    // 数字には関係ない条件分岐だが、数字はtransparentであることはないので、処理が行われる
    if (object.fill !== 'transparent') {
      object.set({
        fill: hourColor,
      });
    }
  });
}

//* main 文字盤レンジ ----------------------------------------

// 数字のサイズを変えるレンジ ----------------
const hourFontSizeRange = document.getElementById('hour-font-size-range');
// 初期は入力不可
hourFontSizeRange.disabled = true;
// レンジが動かされたら数字のサイズを変える ----
hourFontSizeRange.addEventListener('input', () => {
  // hourFontSizeにレンジの値を代入した上で、
  hourFontSize = parseInt(hourFontSizeRange.value);
  // 数字たちを描く関数呼び出し
  drawHours();
});

// 数字の位置を変えるレンジ ----------------
const hourLayoutCircleRadiusRange = document.getElementById('hour-layout-circle-radius-range');
// 初期は入力不可
hourLayoutCircleRadiusRange.disabled = true;
// レンジが動かされたら数字の位置を変える ----
hourLayoutCircleRadiusRange.addEventListener('input', () => {
  // 数字たちを配置する円の半径を、レンジの値に合わせて変える
  hourLayoutCircleRadius = dialObject.radius - hourFontSize / 2 + parseInt(hourLayoutCircleRadiusRange.value);
  // 数字たちを描く関数呼び出し
  drawHours();
});

// バーの幅を変えるレンジ ----------------
const barWidthRange = document.getElementById('bar-width-range');
// 初期は入力不可
barWidthRange.disabled = true;
// レンジが動かされたらバーの幅を変える ----
barWidthRange.addEventListener('input', () => {
  // width: mmToPixel(barWidthRange.value) のように値をsetし直して、renderAllする方法と、
  // barWidth などの値を変更して、drawBarDot などオブジェクトを描く関数を呼び出しなおす方法がある
  // barWidth などの値を保持したいので、2つめの方法を採用している
  barWidth = mmToPixel(barWidthRange.value);
  drawBarDot();
});
// バーの長さを変えるレンジ ----------------
const barLengthRange = document.getElementById('bar-length-range');
// 初期は入力不可
barLengthRange.disabled = true;
// レンジが動かされたらバーの長さを変える ----
barLengthRange.addEventListener('input', () => {
  barLength = mmToPixel(barLengthRange.value);
  drawBarDot();
});
// ドットの大きさを変えるレンジ ----------------
const dotSizeRange = document.getElementById('dot-size-range');
// 初期は入力不可
dotSizeRange.disabled = true;
// レンジが動かされたらドットの大きさを変える ----
dotSizeRange.addEventListener('input', () => {
  dotRadius = mmToPixel(dotSizeRange.value);
  drawBarDot();
});

// バーorドットの位置を変えるレンジ ----------------
const barDotLayoutCircleRadiusRange = document.getElementById('bardot-layout-circle-radius-range');
// 初期は入力不可
barDotLayoutCircleRadiusRange.disabled = true;
// レンジが動かされたらバーorドットの位置を変える ----
barDotLayoutCircleRadiusRange.addEventListener('input', () => {
  // バーorドットを配置する円の半径を、レンジの値に合わせて変える
  barDotLayoutCircleRadius = dialObject.radius - hourFontSize / 2 + parseInt(barDotLayoutCircleRadiusRange.value);
  // 数字たちを描く関数呼び出し
  drawBarDot();
});

// レンジの入力可・不可の切り替え ----
function switchRange() {
  // 全数字のとき ----
  if (hourLayout === 'all-hour') {
    // 数字
    hourFontSizeRange.disabled = false;
    hourLayoutCircleRadiusRange.disabled = false;
    // バードット
    barDotLayoutCircleRadiusRange.disabled = true;
    barWidthRange.disabled = true;
    barLengthRange.disabled = true;
    dotSizeRange.disabled = true;
  }
  // 4ポイント or 2ポイントのとき ----
  if (hourLayout === 'four-point-hour' || hourLayout === 'two-point-hour') {
    // 数字
    hourFontSizeRange.disabled = false;
    hourLayoutCircleRadiusRange.disabled = false;
    // バードット
    barDotLayoutCircleRadiusRange.disabled = false;
    if (barOrDot === 'bar') {
      barWidthRange.disabled = false;
      barLengthRange.disabled = false;
      dotSizeRange.disabled = true;
    } else if (barOrDot === 'dot') {
      barWidthRange.disabled = true;
      barLengthRange.disabled = true;
      dotSizeRange.disabled = false;
    }
  }
  // 数字無しのとき ----
  if (hourLayout === 'no-hour') {
    // 数字
    hourFontSizeRange.disabled = true;
    hourLayoutCircleRadiusRange.disabled = true;
    // バードット
    barDotLayoutCircleRadiusRange.disabled = false;
    if (barOrDot === 'bar') {
      barWidthRange.disabled = false;
      barLengthRange.disabled = false;
      dotSizeRange.disabled = true;
    } else if (barOrDot === 'dot') {
      barWidthRange.disabled = true;
      barLengthRange.disabled = true;
      dotSizeRange.disabled = false;
    }
  }
}

// disabled = true のレンジをクリックした時の処理 ----------------
document.querySelectorAll('input[type="range"]').forEach(range => {
  range.parentElement.addEventListener('click', () => {
    if (range.disabled) {
      alert('該当のオブジェクトを生成してから大きさなどを調整してください');
    }
  });
});


//* case info canvas ------------------------------------------------------------------------------

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
const infoDialObject = new WatchCircle({
  radius: caseInfoCanvasDialOpeningRadius,
  left: caseInfoCanvasHalfWidth,
  top: caseInfoCanvasCenterHeight,
});
caseInfoCanvas.add(infoCaseObject, infoCaseOpeningObject, infoDialObject);

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
  dialSize: '文字盤の直径をmm単位で入力してください',
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
    node: dialSizeInput,
    arrow: dialArrow,
    object: infoDialObject,
    comment: comment.dialSize,
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
document.querySelector('.design-list-lug').addEventListener('mouseover', () => {
  infoLugObjects.forEach(infoLugObject => {
    // オブジェクトの線の色を変える
    changeColorToRed(infoLugObject);
    // コメントを表示
    fadeInComment(comment.lugShape);
  });
});
// mouseleave ----
document.querySelector('.design-list-lug').addEventListener('mouseleave', () => {
  infoLugObjects.forEach(infoLugObject => {
    // オブジェクトの線の色を変える
    changeColorToBlack(infoLugObject);
    // コメントを戻す
    fadeOutComment();
  });
});

// リュウズ形状の info を表示・非表示 ----------------
// mouseover ----
document.querySelector('.design-list-crown').addEventListener('mouseover', () => {
  // オブジェクトの線の色を変える
  changeColorToRed(infoCrownObject);
  // コメントを表示
  fadeInComment(comment.crownShape);
});
// mouseleave ----
document.querySelector('.design-list-crown').addEventListener('mouseleave', () => {
  // オブジェクトの線の色を変える
  changeColorToBlack(infoCrownObject);
  // コメントを戻す
  fadeOutComment();
});

// ケース色の info を表示・非表示 ----------------
// mouseover ----
document.querySelector('.design-list-case-color').addEventListener('mouseover', () => {
  // mouseoverした時点で配列に値を入れる
  // loadした時点で配列に値を入れる処理にしていたらエラーが出ることがあったので注意
  infoColorChangeLists = [infoCaseObject, infoCrownObject, ...infoLugObjects];
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
document.querySelector('.design-list-case-color').addEventListener('mouseleave', () => {
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

// const canvasRange = document.getElementById('canvas-range');
// canvasRange.addEventListener('input', () => {
//   mainCanvas.setZoom(canvasRange.value);
// });

const ctx = document.getElementById('test-canvas').getContext('2d');
ctx.font = '14px sans-serif';
ctx.fillText('ケースの直径を入力', 10, 50);



//* テスト用 -------------------------------------------------------------------------

const centerLine = new fabric.Polyline([
  {x: 0, y: mainCanvasCenterHeight},
  {x: 384, y: mainCanvasCenterHeight}], {
  stroke: 'red',
});
mainCanvas.add(centerLine);


const testButton1 = document.getElementById('button-for-test');
testButton1.addEventListener('click', () => {

  // ここから試しコードを書く ----------------------------
  

  
  // ここまで試しコードを書く ----------------------------

});

document.getElementById('button-for-test2').addEventListener('click', () => {


var shadowText2 = new fabric.Text("And another shadow", {
  fill: 'black',
  shadow: 'red 0 0 2px'
});
mainCanvas.add(shadowText2);
  


  


});

//* テスト用 -------------------------------------------------------------------------



//* export ---------------------------------------------------------------------------------------

export { mainCanvas };

