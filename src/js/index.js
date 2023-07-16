'use strict';

//* memo ---------------------------------------------------------------------------------------------

//* SVGを読み込むときの処理について
// ベルトの長さなどの入力時に、複数のキーをほぼ同時に押してしまうと、オブジェクトが複数できてしまう問題
// fabric.loadSVGFromURLは非同期処理だから、一回目のloadSVGが終わらないうちに、
// 二回目の mainCanvas.remove() が実行されてしまい、
// 一回目のオブジェクトが削除されずに二回目のオブジェクトも描かれてしまっていたと思われる
// つまり 消す→消す→読み込み→読み込み になっているからオブジェクトが2つになってしまう
// 消す→読み込み→消す→読み込みにしないといけない
// ので Promise を導入した けどどういう動きになっているかよくわかっていない

//* レンジを動かしたときの処理について
// width: mmToPixel(barWidthRange.value) のように値をsetし直してrenderAllする方法と、
// barWidth などの値を変更して、drawBarDot などオブジェクトを描く関数を呼び出しなおす方法がある
// 複雑な関数を呼び出すよりsetの方が処理が軽量になる可能性があるため、
// プロパティを変えるだけのときはset + renderAll
// setでは変えられないプロパティ以外の値を変更するときはオブジェクトを書き直すために関数を呼ぶことにする

//* オブジェクトの有無の判定について
//  caseObjectやlugObjectsでするのか、caseSize.valueやlugWidthでするのか検討
// →基本caseObjectやhourObjects.lengthで、必要に応じてcaseSize.valueなどを使う?

//* 文字盤直径などの値について
// 基本は dialSize のような変数を用意して、入力値を代入して使う
// caseOpeningObject の radius は、変数を使わず入力値をそのまま使っているが、
// このように別のところで使いまわさない値については、変数を用意しなくても良さそうかな
// caseObjectのサイズも変数に入れて使うように修正した方が良い?
// 現状は変数に入れずに、他のオブジェクトではcaseObjectのプロパティを使っている
// lugObject ではcaseObject.height、crownObject では caseObject.left など
// どちらでも問題はなさそうだけど統一するべきか?

//* オブジェクト毎のイベントなどの並び順
// クラス → インスタンス → メインの関数 → inputなどメインのイベント → その他サブ的なイベントや関数

//* import -------------------------------------------------------------------------------------------

import '../css/style.css';
import { fabric } from "fabric";
import opentype from 'opentype.js';

import { downloadSVG } from './download.js';

//* test
// ダウンロードボタンをクリックしたときの処理 ----------------
document.getElementById('dl-btn').addEventListener('click', () => {
  // ダウンロードする前に、オブジェクトをグループ化する関数呼び出し
  makeGroup();
  // canvasの内容をSVGに変換してダウンロードする関数呼び出し
  downloadSVG();
  // ダウンロード後はグループオブジェクトたちは削除して、グループ化前のオブジェクトたちを戻す
  destroyGroup();
  // 重なり順を直す
  stackingOrder();
  mainCanvas.renderAll();
});

//* common -------------------------------------------------------------------------------------------

//* 共通で使う関数など ----------------------------------------

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

// オブジェクトの重なり順を直す関数 ----------------
function stackingOrder() {
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
  if (hourHandBodyObject !== undefined) {
    hourHandBodyObject.moveTo(32);
    hourHandCircleObject.moveTo(33);
    minuteHandBodyObject.moveTo(34);
    minuteHandCircleObject.moveTo(35);
    secondHandBodyObject.moveTo(36);
    secondHandCircleObject.moveTo(37);
  }
}

// 配列に入ったオブジェクトたちに色をつける関数 ----------------
function applyColorToArrayObjects(array, color) {
  array.forEach(object => {
    if (object !== undefined) {
      object.set({
        fill: color,
      });
    }
  });
  mainCanvas.renderAll();
}

// disabled = true のレンジをクリックした時の処理 ----------------
document.querySelectorAll('input[type="range"]').forEach(range => {
  range.parentElement.addEventListener('click', () => {
    if (range.disabled) {
      alert('該当のオブジェクトを生成してから大きさなどを調整してください');
    }
  });
});

// オブジェクトのグループ化とグループ解除 ----------------
// 変数定義
let lugGroup;
let strapGroup;
let strapStitchGroup;
let strapLoopGroup;
let strapHoleGroup;
let hourGroup;
let barDotGroup;
let hourHandGroup;
let minuteHandGroup;
let secondHandGroup;
// オブジェクトをグループ化する関数
function makeGroup() {
  // ラグ ----
  if (lugObjects.length !== 0) {
    // オブジェクトをグループ化
    lugGroup = new fabric.Group([...lugObjects]);
    // グループ化前のオブジェクトはcanvasから削除
    mainCanvas.remove(...lugObjects);
    // グループ化したオブジェクトをcanvasに描画
    mainCanvas.add(lugGroup);
    // ケースの上にラグが重ならないように、重なり順を直す
    lugGroup.sendToBack();
  }
  // ベルト本体 ----
  if (upperStrapObject !== undefined && lowerStrapObject !== undefined) {
    strapGroup = new fabric.Group([upperStrapObject, lowerStrapObject]);
    mainCanvas.remove(upperStrapObject, lowerStrapObject);
    mainCanvas.add(strapGroup);
    // バックルの上にベルト本体が重ならないように、重なり順を直す
    strapGroup.sendToBack();
  }
  // ベルトステッチ ----
  if (upperStrapStitchObject !== undefined && lowerStrapStitchObject !== undefined && strapStitchExist === true) {
    strapStitchGroup = new fabric.Group([upperStrapStitchObject, lowerStrapStitchObject, topStitchObject]);
    mainCanvas.remove(upperStrapStitchObject, lowerStrapStitchObject, topStitchObject);
    mainCanvas.add(strapStitchGroup);
  }
  // ベルトループ ----
  if (fixedStrapLoopObject !== undefined) {
    strapLoopGroup = new fabric.Group([fixedStrapLoopObject, moveableStrapLoopObject]);
    mainCanvas.remove(fixedStrapLoopObject, moveableStrapLoopObject);
    mainCanvas.add(strapLoopGroup);
  }
  // ベルト穴 ----
  if (strapHoleObjects.length !== 0) {
    strapHoleGroup = new fabric.Group([...strapHoleObjects]);
    mainCanvas.remove(...strapHoleObjects);
    mainCanvas.add(strapHoleGroup);
  }
  // 文字盤数字 ----
  if (hourObjects.length !== 0 && hourLayout !== 'no-hour') {
    hourGroup = new fabric.Group([...hourObjects]);
    mainCanvas.remove(...hourObjects);
    mainCanvas.add(hourGroup);
  }
  // 文字盤バーorドット ----
  if (barDotObjects.length !== 0 && hourLayout !== 'all-hour') {
    barDotGroup = new fabric.Group([...barDotObjects]);
    mainCanvas.remove(...barDotObjects);
    mainCanvas.add(barDotGroup);
  }
  // 針 ----
  if (hourHandBodyObject !== undefined) {
    hourHandGroup = new fabric.Group([hourHandBodyObject, hourHandCircleObject]);
    minuteHandGroup = new fabric.Group([minuteHandBodyObject, minuteHandCircleObject]);
    secondHandGroup = new fabric.Group([secondHandBodyObject, secondHandCircleObject]);
    mainCanvas.remove(hourHandBodyObject, hourHandCircleObject, minuteHandBodyObject, minuteHandCircleObject, secondHandBodyObject, secondHandCircleObject);
    mainCanvas.add(hourHandGroup, minuteHandGroup, secondHandGroup);
  }
}
// オブジェクトのグループを解除する関数
function destroyGroup() {
  // ラグ ----
  if (lugGroup !== undefined) {
    // グループ解除
    lugGroup.destroy();
    // destroyメソッドを使うとcanvasからなくなったように見えるが、周りの枠だけ残っている
    // なのでさらにcanvasからremoveする
    mainCanvas.remove(lugGroup);
    // グループ化前のオブジェクトをcanvasに追加
    lugObjects.forEach(lugObject => {
      mainCanvas.add(lugObject);
      lugObject.sendToBack();
    });
  }
  // ベルト本体 ----
  if (strapGroup !== undefined) {
    strapGroup.destroy();
    mainCanvas.remove(strapGroup);
    mainCanvas.add(upperStrapObject, lowerStrapObject);
    upperStrapObject.sendToBack();
    lowerStrapObject.sendToBack();
  }
  // ベルトステッチ ----
  if (strapStitchGroup !== undefined) {
    strapStitchGroup.destroy();
    mainCanvas.remove(strapStitchGroup);
    mainCanvas.add(upperStrapStitchObject, lowerStrapStitchObject, topStitchObject);
  }
  // ベルトループ ----
  if (strapLoopGroup !== undefined) {
    strapLoopGroup.destroy();
    mainCanvas.remove(strapLoopGroup);
    mainCanvas.add(fixedStrapLoopObject, moveableStrapLoopObject);
  }
  // ベルト穴 ----
  if (strapHoleGroup !== undefined) {
    strapHoleGroup.destroy();
    mainCanvas.remove(strapHoleGroup);
    strapHoleObjects.forEach(strapHoleObject => {
      mainCanvas.add(strapHoleObject);
    });
  }
  // 文字盤数字 ----
  if (hourGroup !== undefined) {
    hourGroup.destroy();
    mainCanvas.remove(hourGroup);
    hourObjects.forEach(hourObject => {
      mainCanvas.add(hourObject);
    });
  }
  // 文字盤バーorドット ----
  if (barDotGroup !== undefined) {
    barDotGroup.destroy();
    mainCanvas.remove(barDotGroup);
    barDotObjects.forEach(barDotObject => {
      mainCanvas.add(barDotObject);
    });
  }
  // 針 ----
  if (hourHandGroup !== undefined) {
    hourHandGroup.destroy();
    mainCanvas.remove(hourHandGroup);
    mainCanvas.add(hourHandBodyObject, hourHandCircleObject, minuteHandBodyObject, minuteHandCircleObject, secondHandBodyObject, secondHandCircleObject);
  }
}

//* カラーピッカー ----------------------------------------

// カラーピッカーで色を選択したときの処理 ----------------
// ケース(とラグとリュウズとバックル) ----
const caseColorPicker = document.getElementById('case-color-picker');
caseColorPicker.addEventListener('input', () => {
  // ボタンの色を変える
  caseColorPicker.previousElementSibling.style.backgroundColor = caseColorPicker.value;
  // 変数に値を入れておく
  caseColor = caseColorPicker.value;
  // オブジェクトに色をつける関数呼び出し
  // ラグやバックルは配列になっていて処理が複雑なため、
  // ここでは applyColorToArrayObjects 関数ではなく独自の関数を使用する
  // オブジェクトの有無は呼び出し先の関数でしているのでここでは不要
  applyCaseColor();
});
// ベルト ----
const strapColorPicker = document.getElementById('strap-color-picker');
strapColorPicker.addEventListener('input', () => {
  // カラーピッカーから色が選択されたら、色を変えたいリスト(strapColorChangeLists)を更新しておく
  // ここで更新しないと、例えば上ベルトの長さを変えた時には、上ベルトは書き直されて新しいオブジェクトになっているのに
  // strapColorChangeListsの値が更新されていないので、色を変えても前のオブジェクトに色が適用され続けて、
  // 長さを変えた後の上ベルトには色が適用されないことになる
  strapColorChangeLists = [upperStrapObject, lowerStrapObject, fixedStrapLoopObject, moveableStrapLoopObject];
  // ボタンの色を変える
  strapColorPicker.previousElementSibling.style.backgroundColor = strapColorPicker.value;
  // 変数に値を入れておく
  strapColor = strapColorPicker.value;
  // オブジェクトに色をつける関数呼び出し
  // オブジェクトの有無は呼び出し先の関数でしているのでここでは不要
  applyColorToArrayObjects(strapColorChangeLists, strapColor);
});
// 文字盤 ----
const dialColorPicker = document.getElementById('dial-color-picker');
dialColorPicker.addEventListener('input', () => {
  // ボタンの色を変える
  dialColorPicker.previousElementSibling.style.backgroundColor = dialColorPicker.value;
  // 変数に値を入れておく
  dialColor = dialColorPicker.value;
  // オブジェクトに色をつける
  if (dialObject !== undefined) {
    dialObject.set({
      fill: dialColor,
    });
  }
  mainCanvas.renderAll();
});
// 数字とバーorドット ----
const hourColorPicker = document.getElementById('hour-color-picker');
hourColorPicker.addEventListener('input', () => {
  // ボタンの色を変える
  hourColorPicker.previousElementSibling.style.backgroundColor = hourColorPicker.value;
  // 変数に値を入れておく
  hourColor = hourColorPicker.value;
  // オブジェクトに色をつける
  applyColorToArrayObjects(hourObjects, hourColor);
  applyColorToArrayObjects(barDotObjects, hourColor);
  mainCanvas.renderAll();
});
// 針 ----
const handsColorPicker = document.getElementById('hands-color-picker');
handsColorPicker.addEventListener('input', () => {
  // カラーピッカーから色が選択されたら、色を変えたいリストを更新しておく
  handsColorChangeLists = [hourHandBodyObject, hourHandCircleObject, minuteHandBodyObject, minuteHandCircleObject, secondHandCircleObject, secondHandBodyObject];
  // ボタンの色を変える
  handsColorPicker.previousElementSibling.style.backgroundColor = handsColorPicker.value;
  // 変数に値を入れておく
  handsColor = handsColorPicker.value;
  // オブジェクトに色をつける関数呼び出し
  // オブジェクトの有無は呼び出し先の関数でしているのでここでは不要
  applyColorToArrayObjects(handsColorChangeLists, handsColor);
});

// カラーピッカー(input type="color")をクリックしたときにも、radioをクリックしたことにする ----------------
// 以下のコードがないと、ゴールドなど他の色を選択した後、「その他の色」ボタンをクリックしたときに、すぐに色が変わらない
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
handsColorPicker.addEventListener('click', () => {
  handsColorPicker.previousElementSibling.previousElementSibling.firstElementChild.click();
});

//* 選択されたラジオボタンに枠線をつける処理 ----------------------------------------

// 配列を準備
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
const hourFontTypeInputs = document.querySelectorAll('input[name="hour-font"]');
const hourColorInputs = document.querySelectorAll('input[name="hour-color"]');
const barDotInputs = document.querySelectorAll('input[name="bar-dot"]');
const handsShapeInputs = document.querySelectorAll('input[name="hands-shape"]');
const handsColorInputs = document.querySelectorAll('input[name="hands-color"]');

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
  hourFontTypeInputs,
  hourColorInputs,
  barDotInputs,
  handsShapeInputs,
  handsColorInputs,
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

//* タブを切り替える処理 ----------------------------------------

// 一つめのworkspaceを表示させておく
document.querySelector('.component:first-child .workspace').classList.add('appear');
// タブ切り替え
const tabs = document.querySelectorAll('.tab');
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    // ベルトタブをクリックしたときに、まだケース直径とラグ幅が入力されていない場合はここでリターン
    //* test
    //* ケースは無くてもラグがあればOKに変更
    if (tab.id === 'strap-tab') {
      // if (caseObject === undefined && lugWidth === undefined) {
      //   window.alert('先にケースのページでケース直径とラグ幅を入力してから、ベルトの入力に進んでください');
      //   return;
      // }
      if (lugObjects.length === 0) {
        window.alert('先に「ケース」のページで「ラグを含むケースの全長」と「ラグ幅」を入力してラグを描いてから、ベルトの入力に進んでください');
        return;
      }
    }
    // 文字盤タブをクリックしたときに、まだ文字盤見切り直径が入力されていない場合はここでリターン
    if (tab.id === 'dial-tab') {
      if (dialObject === undefined) {
        window.alert('先に「ケース」のページで「文字盤見切り直径」を入力してから、文字盤の入力に進んでください');
        return;
      }
    }
    // 針タブをクリックしたときに、まだ文字盤見切り直径が入力されていない場合はここでリターン
    if (tab.id === 'hands-tab') {
      if (dialObject === undefined) {
        window.alert('先に「ケース」のページで「文字盤見切り直径」を入力してから、針の入力に進んでください');
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

// 数字フォントのサンプル"2"を各フォントで表示する処理 ----------------------------------------

hourFontTypeInputs.forEach(hourFontTypeInput => {
  hourFontTypeInput.parentElement.nextElementSibling.style.fontFamily = hourFontTypeInput.value;
});

//* main canvas --------------------------------------------------------------------------------------

// fabricインスタンス ----------------------------------------

// オブジェクトを選択できるようにするなら ただの Canvas
const mainCanvas = new fabric.Canvas('main-canvas');
// オブジェクトを選択できないようにするなら StaticCanvas
// const mainCanvas = new fabric.StaticCanvas('main-canvas');
const mainCanvasCenterWidth = 192;
const mainCanvasCenterHeight = mmToPixel(125);

//* ケースタブ ----------------------------------------------------------------------------------------

// 変数定義 ----------------------------------------

// オブジェクト
let caseObject;
let caseOpeningObject;
let dialObject;
let crownObject;
let lugObjects = [];

// サイズ・形状・色など
let caseColor = 'white';
let dialColor = 'white';
let dialSize;
let crownShape;
let lugWidth;
let lugShape = 'round';
const defaultLugThickness = mmToPixel(2);
const defaultLugLength = mmToPixel(8);
//* test
let caseTotalSize;
const caseTotalSizeInput = document.getElementById('case-total-size');
//* test
// ケース+ラグ全長が入力されたらcanvasに描画? ----------------
caseTotalSizeInput.addEventListener('input', () => {
  // 変数に値を入れておく
  caseTotalSize = mmToPixel(caseTotalSizeInput.value);
  // ラグ幅を入力可にする
  lugWidthInput.disabled = false;
  // ラグ幅がまだ入力されていない場合はここでリターン
  if (lugWidth === undefined) {
    window.alert('ラグ幅を入力するとラグが描かれます');
    return;
  }
  // ラグを描く関数 を呼び出す関数 を呼び出し
  callDrawLug();
});

// Node
const caseSizeInput = document.getElementById('case-size');
const caseOpeningSizeInput = document.getElementById('case-opening-size');
const dialSizeInput = document.getElementById('dial-size');
const lugWidthInput = document.getElementById('lug-width');

// 円のクラス ----------------------------------------
// mainCanvasの ケース・ケース見切・文字盤 に使用
// インスタンス生成時は radius,left,top などのプロパティを何個でも渡して良いみたい
// 継承元のプロパティにあるものなら options で全て受け取ってくれるみたい
class WatchCircleForMain extends fabric.Circle {
  constructor(options) {
    super(options);
    this.originX = 'center';
    this.originY = 'center';
    this.left = mainCanvasCenterWidth,
      this.top = mainCanvasCenterHeight,
      this.stroke = 'black';
    this.strokeWidth = 1;
  }
}

//*  main canvas ケース ----------------------------------------

// ケースサイズが入力されたらcanvasに描画 ----------------
caseSizeInput.addEventListener('input', () => {
  // すでにオブジェクトが描かれていたらcanvasから削除
  mainCanvas.remove(caseObject);
  // ケースオブジェクト生成
  caseObject = new WatchCircleForMain({
    radius: mmToPixel(caseSizeInput.value) / 2,
    fill: caseColor,
  });
  // canvasに描画
  mainCanvas.add(caseObject);
  // ラグ再描画 ----
  // すでにラグが描かれていたら、再描画する
  // まだラグが描かれていないなら、何もしない
  // ただしラグ幅さえ入力されていれば、ラグ形状がまだ選択されていなくても初期値の round で描画する
  if (lugObjects.length !== 0) {
    // ラグを描く関数 drawLug を呼び出す関数 callDrawLug を呼び出す
    callDrawLug();
  }
  // リュウズ再描画 ----
  // すでにリュウズが描かれていたら、再描画する
  // リュウズがまだ描かれていなくても、すでにリュウズ形状が選択されているなら描画する
  // そのためここでは crownShape に値が入っているかどうかで条件分岐している
  // すでにリュウズが描かれている場合は、条件式に当てはまる(crownShapeに値が入っている)ので再描画することになる
  if (crownShape !== undefined) {
    callDrawCrown();
  }
  // ベルト再描画 ----
  // すでにベルトが描かれていたら、再描画する
  // まだベルトが描かれていないなら、何もしない
  if (upperStrapObject !== undefined) {
    callDrawUpperStrap();
  }
  if (lowerStrapObject !== undefined) {
    callDrawLowerStrap();
  }
  // 重なり順を直す
  stackingOrder();
  // ラグ幅を入力可にする
  // lugWidthInput.disabled = false;
});

//* main canvas ケース見切り ----------------------------------------

// ケース見切りサイズが入力されたらcanvasに描画 ----------------
caseOpeningSizeInput.addEventListener('input', () => {
  // すでにオブジェクトが描かれていたらcanvasから削除
  mainCanvas.remove(caseOpeningObject);
  // ケース見切りオブジェクト生成
  caseOpeningObject = new WatchCircleForMain({
    radius: mmToPixel(caseOpeningSizeInput.value) / 2,
    fill: '#FAFAFA',
  });
  // canvasに描画
  mainCanvas.add(caseOpeningObject);
  // 重なり順を直す
  stackingOrder();
});

//* main canvas 文字盤 ----------------------------------------

// 文字盤サイズが入力されたらcanvasに描画 ----------------
dialSizeInput.addEventListener('input', () => {
  // すでにオブジェクトが描かれていたらcanvasから削除
  mainCanvas.remove(dialObject);
  // 変数に値を入れておく
  dialSize = mmToPixel(dialSizeInput.value);
  // 文字盤オブジェクト生成
  dialObject = new WatchCircleForMain({
    radius: dialSize / 2,
    fill: dialColor,
  });
  // canvasに描画
  mainCanvas.add(dialObject);
  // 数字再描画 ----
  // すでに数字が描かれていたら、再描画する
  if (hourObjects.length !== 0) {
    // 文字盤サイズが変われば数字の位置も変わるので、配置用円の値を計算しなおす
    hourLayoutCircleRadius = dialObject.radius - hourFontSize / 2 - hourFontSize / 4;
    drawHour();
  }
  // バーorドット再描画 ----
  // すでにバーorドットが描かれていたら、再描画する
  if (barOrDot !== undefined) {
    // 文字盤サイズが変わればバーorドットの位置も変わるので、配置用円の値を計算しなおす
    barDotLayoutCircleRadius = dialObject.radius - hourFontSize / 2 - hourFontSize / 4;
    drawBarDot();
  }
  // 針再描画 ----
  // すでに針が描かれていたら、再描画する
  if (hourHandBodyObject !== undefined) {
    // 針長さの拡大倍率を初期値に戻しておく
    hourHandScaleY = dialObject.radius / defaultHandLength / hourHandScaleYAdjustValue;
    minuteSecondHandsScaleY = (dialObject.radius - minuteSecondHandsScaleYAdjustValue) / defaultHandLength;
    // 針たちを描く関数呼び出し
    drawHands();
  }
  // 重なり順を直す
  stackingOrder();
});

//* main canvas ラグ ----------------------------------------

// ラグのクラス ----------------
class WatchLug {
  constructor(url) {
    this.url = url;
    this.loadingPromises = [];
  }
  // ラグを描くメソッド ----
  async drawLug() {
    // const lugPositionAdjustValue = 1.7;
    // loadingPromises に Promise オブジェクトが入っていたら待機
    if (this.loadingPromises.length > 0) {
      return Promise.all(this.loadingPromises).then(() => {
        // ロード処理が完了した後に何かしらの処理を行う
      });
    }
    // すでにオブジェクトが描かれていたらcanvasから削除し、配列も空にする
    lugObjects.forEach(lugObject => {
      mainCanvas.remove(lugObject);
    });
    lugObjects = [];
    // ラグオブジェクト生成
    for (let i = 0; i < 4; i++) { // i= 0, 1, 2, 3
      const loadingPromise = new Promise((resolve) => {
        fabric.loadSVGFromURL(this.url, (objects, options) => {
          let lugObject = fabric.util.groupSVGElements(objects, options);
          lugObject.set({
            originX: 'center',
            left: mainCanvasCenterWidth - lugWidth / 2 - defaultLugThickness / 2,
            //* test
            // top: mainCanvasCenterHeight - caseObject.height / lugPositionAdjustValue,
            top: mainCanvasCenterHeight - caseTotalSize / 2,
            fill: caseColor,
          });
          if (i === 1 || i === 3) {
            lugObject.set({
              left: mainCanvasCenterWidth - lugWidth / 2 - defaultLugThickness / 2 + lugWidth + defaultLugThickness,
            });
          }
          if (i === 2 || i === 3) {
            lugObject.set({
              flipY: true,
              //* test
              // top: mainCanvasCenterHeight + caseObject.height / lugPositionAdjustValue - defaultLugLength,
              top: mainCanvasCenterHeight + caseTotalSize / 2 - defaultLugLength,
            });
          }
          // 配列に追加
          lugObjects.push(lugObject);
          // canvasに描画
          mainCanvas.add(lugObject);
          // 重なり順を直す
          stackingOrder();
          resolve();
        });
      });
      this.loadingPromises.push(loadingPromise);
    }
    // 全てのロード処理が完了するのを待機
    return Promise.all(this.loadingPromises).then(() => {
      // ロード処理が完了した後に何かしらの処理を行う
    }).finally(() => {
      // ロード処理が終了したら loadingPromises をクリア
      this.loadingPromises = [];
    });
  }
}

// ラグのインスタンス生成 ----------------
const roundLug = new WatchLug('./assets/lug-round.svg');
const squareLug = new WatchLug('./assets/lug-square.svg');

// ラグを描く関数 を呼び出す関数 ----------------
function callDrawLug() {
  switch (lugShape) { // 初期値は'round'
    case 'round':
      roundLug.drawLug();
      break;
    case 'square':
      squareLug.drawLug();
      break;
  }
}

// ラグ幅が入力されたらcanvasに描画 ----------------
lugWidthInput.addEventListener('input', () => {
  // 変数に値を入れておく
  lugWidth = mmToPixel(lugWidthInput.value);
  // ラグを描く関数を呼び出す関数 callDrawLug を呼び出す ----
  callDrawLug();
  // ベルト再描画 ----
  // ラグ幅が変更されたらベルトの幅も変わるので再描画する
  // すでにベルトが描かれているなら再描画、描かれていないなら何もしない
  if (upperStrapObject !== undefined) {
    callDrawUpperStrap();
  }
  if (lowerStrapObject !== undefined) {
    callDrawLowerStrap();
  }
});

// ラグの形状が選択されたらcanvasに描画 ----------------
lugShapeInputs.forEach(lugShapeInput => {
  lugShapeInput.addEventListener('input', () => {
    // 変数に値を入れておく
    lugShape = lugShapeInput.value;
    // ケースオブジェクトがまだなく、ラグ幅もまだ入力されていない場合はここでリターン
    if (caseObject === undefined && lugWidth === undefined) {
      window.alert('ケース直径とラグ幅を入力するとラグが描かれます');
      return;
    }
    // ラグ幅がまだ入力されていない場合はここでリターン
    if (lugWidth === undefined) {
      window.alert('ラグ幅を入力するとラグが描かれます');
      return;
    }
    // ラグを描く関数 を呼び出す関数 を呼び出し
    callDrawLug();
  });
});

// ラグ幅の入力の順番を制限 ----------------
// 初期は入力不可
lugWidthInput.disabled = true;
// ラグ幅の入力部分をクリックしたときの処理
lugWidthInput.parentElement.addEventListener('click', () => {
  //* test
  //// すでにケースが描かれていたら、何もしない
  // すでにケース+ラグ全長が入力されていたら何もしない
  if (caseTotalSize !== undefined) {
    return;
  }
  //// ケースオブジェクトがまだない場合はアラートを表示
  // ケース+ラグ全長がまだ入力されていない場合はアラートを表示
  window.alert('先にケース+ラグ全長を入力してから、ラグ幅を入力してください');
});

//* main canvas リュウズ ----------------------------------------

// リュウズのクラス ----------------
class WatchCrown {
  constructor(url) {
    this.url = url;
  }
  // リュウズを描くメソッド ----
  drawCrown() {
    // すでにオブジェクトが描かれていたらcanvasから削除
    mainCanvas.remove(crownObject);
    // リュウズオブジェクト生成
    fabric.loadSVGFromURL(this.url, (objects, options) => {
      crownObject = fabric.util.groupSVGElements(objects, options);
      crownObject.set({
        originY: 'center',
        left: caseObject.left + caseObject.width / 2,
        top: mainCanvasCenterHeight,
        fill: caseColor,
      });
      // canvasに描画
      mainCanvas.add(crownObject);
    });
  }
}

// リュウズのインスタンス生成 ----------------
const roundCrown = new WatchCrown('./assets/crown-round_re.svg');
const squareCrown = new WatchCrown('./assets/crown-square_re.svg');

// リュウズを描く関数 を呼び出す関数 ----------------
function callDrawCrown() {
  switch (crownShape) {
    case 'round':
      roundCrown.drawCrown();
      break;
    case 'square':
      squareCrown.drawCrown();
      break;
  }
}

// リュウズの形状が選択されたらcanvasに描画 ----------------
crownShapeInputs.forEach(crownShapeInput => {
  crownShapeInput.addEventListener('input', () => {
    // 変数に値を入れておく
    crownShape = crownShapeInput.value;
    // ケースオブジェクトがまだない場合はここでリターン
    if (caseObject === undefined) {
      window.alert('ケース直径を入力するとリュウズが描かれます');
      return;
    }
    // リュウズを描く関数 を呼び出す関数 を呼び出し
    callDrawCrown();
  });
});

//* main canvas ケース色 ----------------------------------------

// グラデーションクラス ----------------
class Gradation extends fabric.Gradient {
  constructor(options) {
    super(options);
    this.type = 'linear';
    this.gradientUnits = 'percentage';
    this.coords = { x1: 0, y1: 0, x2: 1, y2: 0 };
  }
}

// グラデーションインスタンス生成 ----------------
const goldGradation = new Gradation({
  colorStops: [
    { offset: 0, color: 'rgb(238,215,71)' },
    { offset: .5, color: '#fff' },
    { offset: 1, color: 'rgb(238,215,71)' },
  ]
});
const silverGradation = new Gradation({
  colorStops: [
    { offset: 0, color: 'rgb(211,211,211)' },
    { offset: .5, color: 'rgb(247,247,247)' },
    { offset: 1, color: 'rgb(211,211,211)' },
  ]
});
const pinkGoldGradation = new Gradation({
  colorStops: [
    { offset: 0, color: 'rgb(220,170,119)' },
    { offset: .5, color: 'rgb(255,239,230)' },
    { offset: 1, color: 'rgb(220,170,119)' },
  ]
});

// ケース(とラグとリュウズとバックル)に色をつける関数 ----------------
function applyCaseColor() {
  if (caseObject !== undefined) {
    caseObject.set({
      fill: caseColor,
    });
  }
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
  // ここでrenderAllを書かなかった場合、オブジェクトを生成し直さないと色が変わらない
  // rotate()などのメソッドで値を変えた時は不要で、setでプロパティを変えた時はrenderALlが必要かと思われる
  // ただしrenderAllはcanvas上の全てのオブジェクトを再描画するため、パフォーマンスの面では注意が必要
  mainCanvas.renderAll();
}

// 色が選択されたら、ケース(とラグとリュウズとバックル)に色をつける関数呼び出し ----------------
// 色が選択されたとき、オブジェクトがすでにあれば色をつける
// オブジェクトがまだなければ色を保持しておいて、オブジェクトが生成されたときに色をつける
caseColorInputs.forEach(caseColorInput => {
  caseColorInput.addEventListener('input', () => {
    // 色が選択された時点で、(オブジェクトがまだなくても)変数に値を入れておく
    switch (caseColorInput.value) {
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
    // ケースオブジェクトさえもまだない(色をつけるオブジェクトがまだ何もない)場合はここでリターン
    if (caseObject === undefined) {
      window.alert('ケース直径などを入力すると、選択した色がつきます');
      return;
    }
    // オブジェクトに色をつける関数呼び出し
    // オブジェクトの有無は呼び出し先の関数で判定
    applyCaseColor();
  });
});

//* ベルトタブ ----------------------------------------------------------------------------------------

// 変数定義 ----------------------------------------

// オブジェクト
let upperStrapObject;
let lowerStrapObject;
let fixedStrapLoopObject;
let moveableStrapLoopObject;
let strapHoleObjects = [];
let upperStrapStitchObject;
let lowerStrapStitchObject;
let topStitchObject;
let buckleObject;

// サイズ・形状・色など
let strapWidth;
const defaultStrapWidth = mmToPixel(16); // 用意したSVGのベルト幅
const defaultUpperStrapLength = mmToPixel(70); // 用意したSVGのベルト長さ
const defaultLowerStrapLength = mmToPixel(110); // 用意したSVGのベルト長さ
let strapShape = 'taper';
let strapColor = 'white';
let strapHoleQuantity; // ベルト穴の個数
let strapHoleDistance; // ベルト穴の間隔
let strapHoleCountDistance = 0; // 一番下の穴からどれくらい移動するかを保持する変数
let strapStitchExist = false; // ステッチの有無 初期値はfalse
let buckleShape;

// Node
const upperStrapLengthInput = document.getElementById('upper-strap-length');
const lowerStrapLengthInput = document.getElementById('lower-strap-length');

//* main canvas ベルト本体 ----------------------------------------

// ベルト本体のクラス ----------------
// 上ベルトクラス ----
class WatchUpperStrap {
  constructor(url) {
    this.url = url;
    // ロード処理の状態を管理する変数を準備 初期値は null
    this.loadingPromise = null;
  }
  // 上ベルトを描くメソッド ----
  drawUpperStrap() {
    // ロード処理の状態をチェックする
    // 初回は loadingPromise は null なので、if文の中には進まず、ロード処理へと進む
    // 2回目以降で、ロード処理がまだ実行中の場合は、loadingPromise が
    // null ではない(Promiseオブジェクトが入っている)のでif文の中に進み、待機状態に入る
    if (this.loadingPromise) {
      // loadingPromise に対して .then() メソッドを呼び出す
      // then メソッドは、Promise の状態が Fulfilled（解決済み）になったときに、指定したコールバック関数を実行する
      // この場合、this.loadingPromise の状態が Fulfilled になったら、this.drawUpperStrap() メソッドを実行する
      // return 文は、メソッド内で値を返す際に使用されるだけでなく、非同期処理の制御フローを制御するためにも使用される
      // この場合、return 文によって現在のメソッドの実行が一時停止され、Promise の解決を待つことで非同期処理の順序を制御している
      return this.loadingPromise.then(() => {
        this.drawUpperStrap();
      });
    }
    // すでにオブジェクトが描かれていたらcanvasから削除
    mainCanvas.remove(upperStrapObject);
    // 新しい Promise を作成
    // この Promise は fabric.loadSVGFromURL() のコールバック関数内で解決される
    this.loadingPromise = new Promise((resolve, reject) => {
      // ロード処理
      fabric.loadSVGFromURL(this.url, (objects, options) => {
        upperStrapObject = fabric.util.groupSVGElements(objects, options);
        strapWidth = lugWidth;
        upperStrapObject.set({
          originX: 'center',
          originY: 'bottom',
          fill: strapColor,
          left: mainCanvasCenterWidth,
          //* test
          //* ケースではなくラグを基準に
          // top: caseObject.top - caseObject.height / 2 - mmToPixel(1),
          top: mainCanvasCenterHeight - caseTotalSize / 2 + mmToPixel(2.5),
          scaleX: strapWidth / defaultStrapWidth,
          scaleY: mmToPixel(upperStrapLengthInput.value) / defaultUpperStrapLength,
          strokeUniform: true,
        });
        // canvasに描画
        mainCanvas.add(upperStrapObject);
        // ステッチ再描画 ----
        if (strapStitchExist === true) {
          switch (strapShape) {
            case 'straight':
              upperStraightStitch.drawUpperStitch();
              break;
            case 'taper':
              upperTaperStitch.drawUpperStitch();
              break;
          }
        }
        // ループ再描画 ----
        drawStrapLoop();
        // バックル再描画 ----
        // バックルがまだ描かれていなくても、すでにバックル形状が選択されているなら描画する
        // すでにバックルが描かれている場合は、条件式に当てはまるので再描画することになる
        // バックルがまだ描かれておらず、バックル形状が選択されていないなら何もしない
        if (buckleShape !== undefined) {
          switch (buckleShape) {
            case 'round':
              roundBuckle.drawBuckle();
              break;
            case 'square':
              squareBuckle.drawBuckle();
              break;
          }
        }
        // canvasに描画されたら、次のロード処理に進んで良いことになるので、
        // ロード処理の状態を管理する変数をnullに戻す
        // これにより次のロード処理を許可する
        // 内部の状態変数をリセットし、次の非同期処理の準備をする役割
        console.log(this.loadingPromise);
        this.loadingPromise = null;
        // resolve() がでてくるまでは次の処理に進まない
        // resolve() を呼び出すことで、Promise の状態が Fulfilled（解決済み）になる
        // これにより、this.loadingPromise の then() メソッド内で指定したコールバック関数が実行され、次の非同期処理が開始される
        // Promise を解決して次の処理を進めるシグナルを送る役割
        resolve();
        console.log(this.loadingPromise);
      });
    });
    // this.loadingPromise を返す
    // つまり、このメソッドを呼び出した際には、this.loadingPromise (ロード処理の状態) を受け取ることができる
    // これにより、次の drawUpperStrap() 呼び出し時に待機状態に入る
    return this.loadingPromise;
  }
}
// 下ベルトクラス ----
class WatchLowerStrap {
  constructor(url) {
    this.url = url;
    this.loadingPromise = null;
  }
  // 下ベルトを描くメソッド ----
  drawLowerStrap() {
    if (this.loadingPromise) {
      return this.loadingPromise.then(() => {
        this.drawLowerStrap();
      });
    }
    // すでにオブジェクトが描かれていたらcanvasから削除
    mainCanvas.remove(lowerStrapObject);

    // 新しい Promise を作成
    this.loadingPromise = new Promise((resolve, reject) => {
      // ロード処理
      fabric.loadSVGFromURL(this.url, (objects, options) => {
        lowerStrapObject = fabric.util.groupSVGElements(objects, options);
        strapWidth = lugWidth;
        lowerStrapObject.set({
          originX: 'center',
          fill: strapColor,
          left: mainCanvasCenterWidth,
          // strapを描く位置(高さ)を、ケースの位置から取得する
          //* test
          //* ケースではなくラグを基準に
          // top: caseObject.top + caseObject.height / 2 + mmToPixel(1),
          top: mainCanvasCenterHeight + caseTotalSize / 2 - mmToPixel(2.5),
          // 入力値にあわせて幅と長さを拡大縮小
          scaleX: strapWidth / defaultStrapWidth,
          scaleY: mmToPixel(lowerStrapLengthInput.value) / defaultLowerStrapLength,
          // 線幅を保つ
          strokeUniform: true,
        });
        // canvasに描画
        mainCanvas.add(lowerStrapObject);
        // ステッチ再描画
        if (strapStitchExist === true) {
          switch (strapShape) {
            case 'straight':
              lowerStraightStitch.drawLowerStitch();
              break;
            case 'taper':
              lowerTaperStitch.drawLowerStitch();
              break;
          }
        }
        // ベルト穴再描画 ----
        // ベルト穴がまだ描かれていなくても、すでにベルト穴個数と間隔が両方選択されているなら描画する
        // すでにベルト穴が描かれている場合は、条件式に当てはまるので再描画することになる
        // ベルト穴がまだ描かれておらず、ベルト穴個数と間隔どちらかが選択されていないなら何もしない
        if (strapHoleQuantity !== undefined && strapHoleDistance !== undefined) {
          drawStrapHoles();
        }
        // ロード処理の状態を管理する変数をnullに戻す
        this.loadingPromise = null;
        // resolve() を呼び出すことで、Promise の状態が Fulfilled（解決済み）になる
        resolve();
      });
    });
    // loadSVGFromURLは非同期処理である事に注意
    // {}外はloadSVGFromURLのコールバック関数外なので、SVGの読み込みより前に実行される可能性がある
    // そのためここに書いた処理が行われるとき、まだlowerStrapObjectは存在していない
    // よってlowerStrapObjectを使うような処理は{}内に書くこと
    return this.loadingPromise;
  }
}

// ベルトのインスタンス生成 ----------------
const upperStraightStrap = new WatchUpperStrap('./assets/upper-straight-strap.svg');
const upperTaperStrap = new WatchUpperStrap('./assets/upper-taper-strap.svg');
const lowerStraightStrap = new WatchLowerStrap('./assets/lower-straight-strap.svg');
const lowerTaperStrap = new WatchLowerStrap('./assets/lower-taper-strap.svg');

// ベルトを描く関数 を呼び出す関数 ----------------
function callDrawUpperStrap() {
  switch (strapShape) {
    case 'straight':
      upperStraightStrap.drawUpperStrap();
      break;
    case 'taper':
      upperTaperStrap.drawUpperStrap();
      break;
  }
}
function callDrawLowerStrap() {
  switch (strapShape) {
    case 'straight':
      lowerStraightStrap.drawLowerStrap();
      break;
    case 'taper':
      lowerTaperStrap.drawLowerStrap();
      break;
  }
}

// ベルトの長さが入力されたらcanvasに描画 ----------------
// 上ベルト本体
upperStrapLengthInput.addEventListener('input', () => {
  // 上ベルトを描く関数を呼び出す関数 を呼び出し
  callDrawUpperStrap();
});
// 下ベルト本体
lowerStrapLengthInput.addEventListener('input', () => {
  // 下ベルトを描く関数を呼び出す関数 を呼び出し
  callDrawLowerStrap();
});

// ベルトの形状が選択されたらcanvasに描画 ----------------
strapShapeInputs.forEach(strapShapeInput => {
  strapShapeInput.addEventListener('input', () => {
    // 変数に値を入れておく
    strapShape = strapShapeInput.value;
    // ストラップオブジェクトがまだない場合はここでリターン
    if (upperStrapObject === undefined || lowerStrapObject === undefined) {
      alert('ベルトの長さを上側下側両方入力すると、選択した形のベルトが描かれます');
      return;
    }
    callDrawUpperStrap();
    callDrawLowerStrap();
  });
});

//* main canvas ベルトループ ----------------------------------------

// ループを描く関数 ----------------
function drawStrapLoop() {
  // すでにオブジェクトが描かれていたらcanvasから削除
  mainCanvas.remove(fixedStrapLoopObject);
  mainCanvas.remove(moveableStrapLoopObject);
  // ループオブジェクト生成
  // 固定ループ ----
  fixedStrapLoopObject = new fabric.Rect({
    width: strapWidth + mmToPixel(2),
    height: mmToPixel(5),
    originX: 'center',
    fill: strapColor,
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

//* main canvas ベルト穴 ----------------------------------------

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
  // ベルト穴オブジェクト生成
  for (let i = 0; i < strapHoleQuantity; i++) {
    const strapHoleObject = new fabric.Circle({
      radius: mmToPixel(0.75),
      originX: 'center',
      originY: 'center',
      left: mainCanvasCenterWidth,
      top: lowerStrapObject.top + (lowerStrapObject.height * mmToPixel(lowerStrapLengthInput.value) / defaultLowerStrapLength) - mmToPixel(25) - strapHoleCountDistance,
      stroke: 'black',
      fill: 'white',
    });
    strapHoleObjects.push(strapHoleObject);
    strapHoleCountDistance += strapHoleDistance;
  }
  // canvasに描画
  strapHoleObjects.forEach(strapHoleObject => {
    mainCanvas.add(strapHoleObject);
  });
  // 一番下の穴からどれくらい移動するかを保持する変数を0に戻す
  strapHoleCountDistance = 0;
}

// ベルト穴個数が選択されたらcanvasに描画 ----------------
strapHoleQuantityInputs.forEach(strapHoleQuantityInput => {
  strapHoleQuantityInput.addEventListener('input', () => {
    // 変数に値を入れておく
    strapHoleQuantity = parseInt(strapHoleQuantityInput.value);
    // 下ストラップオブジェクトがまだない場合はここでリターン
    if (lowerStrapObject === undefined) {
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

// ベルト穴間隔が選択されたらcanvasに描画 ----------------
strapHoleDistanceInputs.forEach(holeDistanceInput => {
  holeDistanceInput.addEventListener('input', () => {
    // 変数に値を入れておく
    strapHoleDistance = mmToPixel(parseInt(holeDistanceInput.value));
    // 下ストラップオブジェクトがまだない場合はここでリターン
    if (lowerStrapObject === undefined) {
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

//* main canvas ベルトステッチ ----------------------------------------

// ステッチのクラス ----------------
// 上ベルトステッチクラス ----
class WatchUpperStitch {
  constructor(url) {
    this.url = url;
    this.loadingPromise = null;
  }
  drawUpperStitch() {
    if (this.loadingPromise) {
      return this.loadingPromise.then(() => {
        this.drawUpperStitch();
      });
    }
    // すでにオブジェクトが描かれていたらcanvasから削除
    mainCanvas.remove(upperStrapStitchObject);
    mainCanvas.remove(topStitchObject);
    // 上ベルトステッチオブジェクト生成
    // 基本はupperStrapObjectと同じで、位置の調整と点線に変更
    this.loadingPromise = new Promise((resolve, reject) => {
      fabric.loadSVGFromURL(this.url, (objects, options) => {
        upperStrapStitchObject = fabric.util.groupSVGElements(objects, options);
        strapWidth = lugWidth;
        upperStrapStitchObject.set({
          originX: 'center',
          originY: 'bottom',
          left: mainCanvasCenterWidth,
          //* test
          //* ケースではなくラグを基準に
          //* ベルト本体よりも3mm上に
          top: mainCanvasCenterHeight - caseTotalSize / 2 + mmToPixel(2.5) - mmToPixel(3),
          // top: caseObject.top - caseObject.height / 2 - mmToPixel(1) - mmToPixel(3),
          // 入力値にあわせて幅と長さを拡大縮小
          scaleX: strapWidth / defaultStrapWidth,
          scaleY: mmToPixel(upperStrapLengthInput.value) / defaultUpperStrapLength,
          // 線幅を保つ
          strokeUniform: true,
          // 点線にする
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
        // バックル近くのステッチオブジェクト生成
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
        // ベルト形状がストレートの場合、バックル近くのステッチオブジェクトの幅を長くする
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
        // 次のロード処理を許可する
        this.loadingPromise = null;
        resolve();
      });
    });
    // this.loadingPromise を返す
    return this.loadingPromise;
  }
}
// 下ベルトステッチクラス ----
class WatchLowerStitch {
  constructor(url) {
    this.url = url;
    this.loadingPromise = null;
  }
  drawLowerStitch() {
    if (this.loadingPromise) {
      return this.loadingPromise.then(() => {
        this.drawLowerStitch();
      });
    }
    // すでにオブジェクトが描かれていたらcanvasから削除
    mainCanvas.remove(lowerStrapStitchObject);
    // 下ベルトステッチオブジェクト生成
    this.loadingPromise = new Promise((resolve, reject) => {
      fabric.loadSVGFromURL(this.url, (objects, options) => {
        lowerStrapStitchObject = fabric.util.groupSVGElements(objects, options);
        strapWidth = lugWidth;
        lowerStrapStitchObject.set({
          originX: 'center',
          left: mainCanvasCenterWidth,
          //* test
          //* ケースではなくラグを基準に
          //* ベルト本体よりも3mm下に
          top: mainCanvasCenterHeight + caseTotalSize / 2 - mmToPixel(2.5) + mmToPixel(3),
          // top: caseObject.top + caseObject.height / 2 + mmToPixel(1) + mmToPixel(3),
          // 入力値にあわせて幅と長さを拡大縮小
          scaleX: strapWidth / defaultStrapWidth,
          scaleY: mmToPixel(lowerStrapLengthInput.value) / defaultLowerStrapLength,
          // 線幅を保つ
          strokeUniform: true,
          // 点線にする
          strokeDashArray: [8, 2],
        });
        // canvasに描画
        mainCanvas.add(lowerStrapStitchObject);
        // ロード処理の状態を管理する変数をnullに戻す
        this.loadingPromise = null;
        // resolve() を呼び出すことで、Promise の状態が Fulfilled（解決済み）になる
        resolve();
      });
    });
    return this.loadingPromise;
  }
}

// ステッチのインスタンス生成 ----------------
const upperStraightStitch = new WatchUpperStitch('./assets/upper-straight-stitch.svg');
const upperTaperStitch = new WatchUpperStitch('./assets/upper-taper-stitch.svg');
const lowerStraightStitch = new WatchLowerStitch('./assets/lower-straight-stitch.svg');
const lowerTaperStitch = new WatchLowerStitch('./assets/lower-taper-stitch.svg');

// ステッチの有無が選択されたらcanvasに描画 ----------------
strapStitchInputs.forEach(stitchInput => {
  stitchInput.addEventListener('input', () => {
    // 変数に値を入れておく inputする前の初期値はfalse
    strapStitchExist = stitchInput.value;
    if (strapStitchExist === 'true') {
      strapStitchExist = true;
    } else {
      strapStitchExist = false;
    }
    // 上下両方もしくはどちらかのストラップオブジェクトがまだない場合はここでリターン
    // 上下両方のストラップオブジェクトがある場合だけ、ステッチを描く関数が呼ばれる
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
      switch (strapShape) {
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

//* main canvas ベルト色 ----------------------------------------

// 色を変えたいオブジェクトをまとめるための配列を準備
let strapColorChangeLists;
// 色が選択されたら、ベルトに色をつける関数呼び出し ----------------
strapColorInputs.forEach(strapColorInput => {
  strapColorInput.addEventListener('input', () => {
    // オブジェクトを生成してから配列に入れないとundefinedが入ってエラーが出てしまうので、
    // 色が選択された時点で配列にオブジェクトを入れる
    strapColorChangeLists = [upperStrapObject, lowerStrapObject, fixedStrapLoopObject, moveableStrapLoopObject];
    // 色が選択された時点で、(オブジェクトがまだなくても)変数に値を入れておく
    strapColor = strapColorInput.value;
    if (strapColorInput.value === 'custom-color') {
      strapColor = strapColorPicker.value;
    }
    // 上下両方のストラップオブジェクトがまだない場合はここでリターン
    // 上下どちらかのストラップオブジェクトがあれば、オブジェクトに色をつける関数呼び出し
    if (upperStrapObject === undefined && lowerStrapObject === undefined) {
      alert('ベルトの長さを入力すると、選択した色がつきます');
      return;
    }
    // オブジェクトに色をつける関数呼び出し
    applyColorToArrayObjects(strapColorChangeLists, strapColor);
  });
});

//* main canvas バックル ----------------------------------------

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
        originY: 'bottom',
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

// バックルの形状が選択されたらcanvasに描画 ----------------
buckleShapeInputs.forEach(buckleShapeInput => {
  buckleShapeInput.addEventListener('input', () => {
    // 変数に値を入れておく
    buckleShape = buckleShapeInput.value;
    /// 上ストラップオブジェクトがまだない場合はここでリターン
    if (upperStrapObject === undefined) {
      alert('ベルト長さ(上側)を入力するとバックルが描かれます');
      return;
    }
    // バックルを描く関数呼び出し
    switch (buckleShape) {
      case 'round':
        roundBuckle.drawBuckle();
        break;
      case 'square':
        squareBuckle.drawBuckle();
        break;
    }
  });
});

//* 文字盤タブ ----------------------------------------------------------------------------------------

// 変数定義 ----------------------------------------

// オブジェクト
let hourObjects = [];
let barDotObjects = [];

// サイズ・形状・色など
let hourFontSize = 12;
let hourLayout; // 全数字 or 4ポイント or 2ポイント
let hourLayoutCircleRadius; // 数字を配置するための(数字それぞれの中心がこの円の円周上にくる)円の半径
let barDotLayoutCircleRadius; // バードットを配置するための(それぞれの中心がこの円の円周上にくる)円の半径
let hourColor = 'black';
let barOrDot; // バーかドットかを保持する変数
let barWidth = mmToPixel(1);
let barLength = mmToPixel(5);
let dotRadius = mmToPixel(1);
// 文字盤の中心座標(=バーなどを回転させるときの中心点)
const centerPoint = new fabric.Point(mainCanvasCenterWidth, mainCanvasCenterHeight);
let hourInitialPoint; // 数字を配置するための円の、円周上の点の初期位置(12時位置)
let barDotInitialPoint; // バードットを配置するための円の、円周上の点の初期位置(12時位置)
let rotateDegrees = 30; // 回転角度を保持する変数 初期値は1時位置の30度
let hourFontType = './assets/Kanit-Medium.ttf';

//* main canvas 文字盤色 ----------------------------------------

// 文字盤ベース色が選択されたら、色をつける ----------------
dialColorInputs.forEach(dialColorInput => {
  dialColorInput.addEventListener('input', () => {
    // 変数に値を入れておく
    dialColor = dialColorInput.value;
    // 「その他の色」が選択された時は dialColor にカラーピッカーの値を入れる
    // ↓のコードがなかったので、カスタムカラーを選択したときにすぐに色が変わらない問題が起きていた
    // dialColor( dialColorInput.value )は、すでに用意した色の値はblackやwhiteだが、
    // カスタムカラーの時は custom-color という文字列なので、
    // この先で fill: 'custom-color'となってしまうから色が変わらない
    if (dialColorInput.value === 'custom-color') {
      dialColor = dialColorPicker.value;
    }
    // 文字盤オブジェクトがまだない場合はここでリターン
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

//* main canvas 文字盤数字 ----------------------------------------

// 数字を描く関数 ----------------
function drawHour() {
  // フォントを読み込む
  // loadメソッドはフォントファイルを非同期で読み込み、読み込みが完了した後にコールバック関数を呼び出す
  opentype.load(hourFontType, (err, font) => {
    // 読み込みに失敗したときの処理 ----
    if (err) {
      console.error('フォントの読み込みエラー:', err);
      return;
    }
    // これ以降、読み込み完了後に行われる処理(コールバック関数) ----
    // すでにオブジェクトが描かれていたらcanvasから削除し、配列も空にする
    hourObjects.forEach(hourObject => {
      mainCanvas.remove(hourObject);
    });
    hourObjects = [];
    // 数字なしが選択されている場合はここでリターン
    if (hourLayout === 'no-hour') {
      return;
    }
    // 計算に必要な数値を準備する ----
    // 数字を配置するための円の、円周上の点の初期位置(12時位置)
    // fabric.Point(x座標, y座標)
    hourInitialPoint = new fabric.Point(mainCanvasCenterWidth, mainCanvasCenterHeight - hourLayoutCircleRadius);
    // 数字オブジェクト生成
    for (let i = 1; i <= 12; i++) {
      // fabric.util.rotatePointメソッドを使用して、
      // 初期位置の点 hourInitialPoint を、centerPoint を 中心に、指定の度数回転させた位置を取得
      // rotatedPoint の値はループのたびに rotateDegrees によって更新される
      // fabric.util.rotatePoint(回転前の元の座標, 回転の中心座標, 回転角度)
      // 取得したrotatedPoint は、プロパティにx座標とy座標を持つので、rotatedPoint.x のように使う
      const rotatedPoint = fabric.util.rotatePoint(hourInitialPoint, centerPoint, fabric.util.degreesToRadians(rotateDegrees));
      // テキストをパスに変換
      // Font.getPath(text, x, y, fontSize, options) : 指定されたテキストを表すパスオブジェクトを作成
      const hourPath = font.getPath(String(i), 0, 0, hourFontSize);
      // Path.toPathData(options) : パスオブジェクトをSVGのパスデータ形式に変換
      const hourPathData = hourPath.toPathData();
      // fabric.jsのパスオブジェクトに変換
      let hourObject = new fabric.Path(hourPathData, {
        originX: 'center',
        originY: 'center',
        top: rotatedPoint.y,
        left: rotatedPoint.x,
        fill: hourColor,
        stroke: 'rgb(118,99,4)',
        strokeWidth: .5,
      });
      // 配列に入れる
      hourObjects.push(hourObject);
      // 回転角度を更新
      rotateDegrees += 30;
    }
    // ループ後、選択されている数字の配置によって、該当する位置の数字を配列から削除
    // 4ポイントのとき
    if (hourLayout === 'four-point-hour') {
      for (let i = 0; i < 4; i++) {
        hourObjects.splice(i, 2);
      }
    }
    // 2ポイントのとき
    if (hourLayout === 'two-point-hour') {
      for (let i = 0; i < 2; i++) {
        hourObjects.splice(i, 5);
      }
    }
    // ループ後、配列に入ったオブジェクトをcanvasに描画
    hourObjects.forEach(hourObject => {
      mainCanvas.add(hourObject);
    });
    // 回転角度を保持する変数の値を初期値に戻す
    rotateDegrees = 30;
    // 重なり順を直す
    stackingOrder();
  });
}

// 数字の配置が選択されたらcanvasに描画 ----------------
hourLayoutInputs.forEach(hourLayoutInput => {
  hourLayoutInput.addEventListener('input', () => {
    // 変数に値を入れておく
    hourLayout = hourLayoutInput.value;
    // hourLayoutCircleRadius を計算
    // 文字盤半径から数字のフォントサイズの半分を引くと、ちょうど数字の外側が文字盤の円に触れる位置になる
    // そこから内側に少し調整した円の半径
    hourLayoutCircleRadius = dialObject.radius - hourFontSize / 2 - hourFontSize / 4;
    // レンジの入力可・不可の切り替え
    switchRangeDial();
    // 数字を描く関数呼び出し
    drawHour();
    // すでにバーorドットが描かれている場合は、再描画する
    // (barDotObjects.length !== 0) での条件分岐だと、
    // 前回全数字を選んでいた場合に barDotObjects.length は 0 だから バーorドットを描く関数が呼ばれない
    // なので barOrDot に値が入っているかどうかで条件分岐する
    if (barOrDot !== undefined) {
      drawBarDot();
    }
  });
});

// 数字のフォントが選択されたらcanvasに描画 ----------------
hourFontTypeInputs.forEach(hourFontTypeInput => {
  hourFontTypeInput.addEventListener('input', () => {
    // 変数に値(フォントファイルへのパス)を入れておく
    hourFontType = hourFontTypeInput.dataset.path;
    // 数字の配置がまだ選択されていない場合はここでリターン
    if (hourLayout === undefined) {
      alert('数字の配置を選択すると、数字が描画されます');
      return;
    }
    // 数字なしが選択されている場合はここでリターン
    if (hourLayout === 'no-hour') {
      alert('数字なしが選択されています。数字があるデザインを選択すると指定のフォントで描かれます。');
      return;
    }
    // 数字を描く関数呼び出し
    drawHour();
  });
});

//* main canvas 文字盤バー・ドット ----------------------------------------

// バーorドットを描く関数 ----------------
function drawBarDot() {
  //* まだ数字配置が選択されていないときはどう扱う?結果的に数字無しの扱いに今はなっているぽい
  // すでにオブジェクトが描かれていたらcanvasから削除し、配列も空にする
  barDotObjects.forEach(barDotObject => {
    mainCanvas.remove(barDotObject);
  });
  barDotObjects = [];
  // 計算に必要な数値を準備する ----
  // バーorドットを配置するための円の、円周上の点の初期位置(12時位置)
  // fabric.Point(x座標, y座標)
  barDotInitialPoint = new fabric.Point(mainCanvasCenterWidth, mainCanvasCenterHeight - barDotLayoutCircleRadius);
  // バーorドットオブジェクト生成
  for (let i = 0; i < 12; i++) {
    // barDotObject は、このループ内でしか使わない、個々のバーorドットオブジェクトの変数名
    // バーorドットが不要な位置を透明にsetするときに名前が必要なのでつけている
    // 実際に配列 barDotObjects に入るときは、この名前が使われるわけではないと思われる
    let barDotObject;
    // fabric.util.rotatePointメソッドを使用して、
    // 初期位置の点 barDotInitialPoint を、centerPoint を 中心に、指定の度数回転させた位置を取得
    // rotatedPoint の値はループのたびに rotateDegrees によって更新される
    // fabric.util.rotatePoint(回転前の元の座標, 回転の中心座標, 回転角度)
    // 取得したrotatedPoint は、プロパティにx座標とy座標を持つので、rotatedPoint.x のように使う
    const rotatedPoint = fabric.util.rotatePoint(barDotInitialPoint, centerPoint, fabric.util.degreesToRadians(rotateDegrees));
    // 全数字が選択されている場合はここでリターン
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
    // 配列に入れる
    barDotObjects.push(barDotObject);
    // 回転角度を更新
    rotateDegrees += 30;
  }
  // ループ後、選択されている数字の配置によって、該当する位置のバーorドットを配列から削除
  // 4ポイントのとき
  if (hourLayout === 'four-point-hour') {
    barDotObjects.splice(2, 1);
    barDotObjects.splice(4, 1);
    barDotObjects.splice(6, 1);
    barDotObjects.splice(8, 1);
  }
  // 2ポイントのとき
  if (hourLayout === 'two-point-hour') {
    barDotObjects.splice(5, 1);
    barDotObjects.splice(10, 1);
  }
  // ループ後、配列に入ったオブジェクトをcanvasに描画
  barDotObjects.forEach(barDotObject => {
    mainCanvas.add(barDotObject);
  });
  // 回転角度を保持する変数の値を初期値に戻す
  rotateDegrees = 30;
  // 重なり順を直す
  stackingOrder();
}

// バーorドットが選択されたらcanvasに描画 ----------------
barDotInputs.forEach(barDotInput => {
  barDotInput.addEventListener('input', () => {
    // 変数に値を入れておく
    barOrDot = barDotInput.value;
    // 計算に必要な数値を準備する ----
    // バーorドットを配置するための円の半径を計算
    // 呼び出し先の drawBarDot 内でこの値を計算してしまうと、レンジを変えても再計算されるため値が変わらない
    // そのため呼び出し元で計算する
    barDotLayoutCircleRadius = dialObject.radius - hourFontSize / 2 - hourFontSize / 4;
    // レンジの入力可・不可の切り替え
    switchRangeDial();
    // バーorドットを描く関数呼び出し
    drawBarDot();
  });
});

//* main canvas 数字とバーorドットの色 ----------------------------------------

// 数字色が選択されたら、色をつける ----------------
hourColorInputs.forEach(hourColorInput => {
  hourColorInput.addEventListener('input', () => {
    // 色が選択された時点で、(オブジェクトがまだなくても)変数に値を入れておく
    switch (hourColorInput.value) {
      case 'gold':
        hourColor = goldGradation;
        break;
      case 'silver':
        hourColor = silverGradation;
        break;
      case 'pink-gold':
        hourColor = pinkGoldGradation;
        break;
      case 'custom-color':
        hourColor = hourColorPicker.value;
        break;
      default:
        hourColor = hourColorInput.value;
    }
    // 数字オブジェクトとバーorドットオブジェクトどちらもまだない場合はここでリターン
    if (hourObjects.length === 0 && barDotObjects.length === 0) {
      alert('「数字の配置」や「バーorドット」を入力すると、選択した色で描かれます');
      return;
    }
    // 数字に色をつける
    applyColorToArrayObjects(hourObjects, hourColor);
    // バーorドットに色をつける
    applyColorToArrayObjects(barDotObjects, hourColor);
    mainCanvas.renderAll();
  });
});

//* main canvas 文字盤レンジ ----------------------------------------

// 数字のサイズを変えるレンジ ----------------
const hourFontSizeRange = document.getElementById('hour-font-size-range');
// 初期は入力不可
hourFontSizeRange.disabled = true;
// レンジが動かされたら数字のサイズを変える ----
hourFontSizeRange.addEventListener('input', () => {
  // hourFontSizeにレンジの値を代入した上で、
  // 数字をパス化したけど...fontSizeきいてる？→フォント読み込み時につかわれるからきいてる
  hourFontSize = parseInt(hourFontSizeRange.value);
  // 数字を描く関数呼び出し
  // 数字のサイズが変わると配置用円の半径も変わることになるが、
  // ここではそのままの位置で数字のサイズだけ変えたいので、配置用円の半径は変更しないことにする
  // drawHourだと処理が多いのでsetでfontSizeだけ変えたいところだけど、
  // fontSizeは、テキストからパスを生成するときに指定しているから効くのであって
  // setですでにパス化されているオブジェクトには効かない
  drawHour();
});

// 数字の位置を変えるレンジ ----------------
const hourLayoutCircleRadiusRange = document.getElementById('hour-layout-circle-radius-range');
// 初期は入力不可
hourLayoutCircleRadiusRange.disabled = true;
// レンジが動かされたら数字の位置を変える ----
hourLayoutCircleRadiusRange.addEventListener('input', () => {
  // 数字たちを配置する円の半径を、レンジの値に合わせて変える
  hourLayoutCircleRadius = dialObject.radius - hourFontSize / 2 + parseInt(hourLayoutCircleRadiusRange.value);
  // 数字を描く関数呼び出し
  // プロパティではないのでsetで描きなおすのは難しそう
  drawHour();
});

// バーの幅を変えるレンジ ----------------
const barWidthRange = document.getElementById('bar-width-range');
// 初期は入力不可
barWidthRange.disabled = true;
// レンジが動かされたらバーの幅を変える ----
barWidthRange.addEventListener('input', () => {
  barWidth = mmToPixel(parseFloat(barWidthRange.value));
  // 値をsetし直す
  barDotObjects.forEach(barDotObject => {
    barDotObject.set({
      width: barWidth,
    });
  });
  mainCanvas.renderAll();
});

// バーの長さを変えるレンジ ----------------
const barLengthRange = document.getElementById('bar-length-range');
// 初期は入力不可
barLengthRange.disabled = true;
// レンジが動かされたらバーの長さを変える ----
barLengthRange.addEventListener('input', () => {
  barLength = mmToPixel(parseFloat(barLengthRange.value));
  // 値をsetし直す
  barDotObjects.forEach(barDotObject => {
    barDotObject.set({
      height: barLength,
    });
  });
  mainCanvas.renderAll();
});

// ドットの大きさを変えるレンジ ----------------
const dotSizeRange = document.getElementById('dot-size-range');
// 初期は入力不可
dotSizeRange.disabled = true;
// レンジが動かされたらドットの大きさを変える ----
dotSizeRange.addEventListener('input', () => {
  dotRadius = mmToPixel(parseFloat(dotSizeRange.value));
  // 値をsetし直す
  barDotObjects.forEach(barDotObject => {
    barDotObject.set({
      radius: dotRadius,
    });
  });
  mainCanvas.renderAll();
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

// レンジの入力可・不可の切り替え ----------------
// 数字とバーorドット
// hourLayout の値によって分岐
function switchRangeDial() {
  // 全数字のとき ----
  if (hourLayout === 'all-hour') {
    // 数字
    hourFontSizeRange.disabled = false;
    hourLayoutCircleRadiusRange.disabled = false;
    // バードット
    barWidthRange.disabled = true;
    barLengthRange.disabled = true;
    dotSizeRange.disabled = true;
    barDotLayoutCircleRadiusRange.disabled = true;
    // 4ポイント or 2ポイントのとき ----
  } else if (hourLayout === 'four-point-hour' || hourLayout === 'two-point-hour') {
    // 数字
    hourFontSizeRange.disabled = false;
    hourLayoutCircleRadiusRange.disabled = false;
    // バードット
    switchRangeBarDot();
    // 数字無しのとき ----
  } else if (hourLayout === 'no-hour') {
    // 数字
    hourFontSizeRange.disabled = true;
    hourLayoutCircleRadiusRange.disabled = true;
    // バードット
    switchRangeBarDot();
    // hourLayout がまだ選ばれていないとき ----
  } else {
    switchRangeBarDot();
  }
}
// バーorドット
function switchRangeBarDot() {
  if (barOrDot === 'bar') {
    barWidthRange.disabled = false;
    barLengthRange.disabled = false;
    dotSizeRange.disabled = true;
    barDotLayoutCircleRadiusRange.disabled = false;
  } else if (barOrDot === 'dot') {
    barWidthRange.disabled = true;
    barLengthRange.disabled = true;
    dotSizeRange.disabled = false;
    barDotLayoutCircleRadiusRange.disabled = false;
  }
}

//* 針タブ -------------------------------------------------------------------------------------------

// 変数定義 ----------------------------------------

// オブジェクト
let hourHandCircleObject;
let minuteHandCircleObject;
let secondHandCircleObject;
let hourHandBodyObject;
let minuteHandBodyObject;
let secondHandBodyObject;

// サイズ・形状・色など
let handsColor = 'white';
let handsShape;
const defaultHandWidth = mmToPixel(1); // 用意したSVGの針太さ
const defaultHandLength = mmToPixel(10); // 用意したSVGの針長さ
let hourHandAngle = 300;
let minuteHandAngle = 60;
let secondHandAngle = 210;

let hourHandScaleY;
// 時針の長さを調整するための値
// この値を2にすると文字盤の半径のちょうど半分の長さになるが、それより少し長くしたいので1.8にしている
const hourHandScaleYAdjustValue = 1.8; // *要検討

let minuteSecondHandsScaleY;
// 分針秒針の長さを調整するための値
// 文字盤見切りにぴったりつく長さから、何mm短くするかを表す
const minuteSecondHandsScaleYAdjustValue = mmToPixel(3);

let hourHandScaleX = 1.2; // 用意したSVGの針太さは 1mm なので、1.2倍の1.2mmが初期値
let minuteHandScaleX = 1; // 用意したSVGの針太さは 1mm なので、そのまま1mmが初期値

//* main canvas 針 ----------------------------------------

// 針の中心円のクラス ----------------
class HandCircle extends fabric.Circle {
  constructor(options) {
    super(options);
    this.originX = 'center';
    this.originY = 'center';
    this.top = mainCanvasCenterHeight;
    this.left = mainCanvasCenterWidth;
    this.stroke = 'black';
    this.strokeWidth = .5;
    this.fill = handsColor;
  }
}

// 針本体のクラス ----------------
class HandBody {
  constructor(url) {
    this.url = url;
  }
  // 時針を描くメソッド ----
  drawHourHandBody() {
    // すでにオブジェクトが描かれていたらcanvasから削除
    mainCanvas.remove(hourHandBodyObject);
    // 時針本体オブジェクト生成
    fabric.loadSVGFromURL(this.url, (objects, options) => {
      hourHandBodyObject = fabric.util.groupSVGElements(objects, options);
      hourHandBodyObject.set({
        fill: handsColor,
        originX: 'center',
        originY: 'bottom',
        top: mainCanvasCenterHeight,
        left: mainCanvasCenterWidth,
        stroke: 'black',
        strokeWidth: .5,
        scaleX: hourHandScaleX, // 初期値は1.2倍
        scaleY: hourHandScaleY,
        angle: hourHandAngle,
        // 線幅を保つ
        strokeUniform: true,
      });
      // canvasに描画
      mainCanvas.add(hourHandBodyObject);
      // 重なり順を直す
      stackingOrder();
    });
  }
  // 分針を描くメソッド ----
  drawMinuteHandBody() {
    // すでにオブジェクトが描かれていたらcanvasから削除
    mainCanvas.remove(minuteHandBodyObject);
    // 分針本体オブジェクト生成
    fabric.loadSVGFromURL(this.url, (objects, options) => {
      minuteHandBodyObject = fabric.util.groupSVGElements(objects, options);
      minuteHandBodyObject.set({
        fill: handsColor,
        originX: 'center',
        originY: 'bottom',
        top: mainCanvasCenterHeight,
        left: mainCanvasCenterWidth,
        stroke: 'black',
        strokeWidth: .5,
        angle: minuteHandAngle,
        scaleX: minuteHandScaleX, // 初期値は1倍
        scaleY: minuteSecondHandsScaleY,
        // 線幅を保つ
        strokeUniform: true,
      });
      // canvasに描画
      mainCanvas.add(minuteHandBodyObject);
      // 重なり順を直す
      stackingOrder();
    });
  }
}

// 針たちを描く関数 ----------------
function drawHands() {
  // すでにオブジェクトが描かれていたら、針の中心円と秒針本体をcanvasから削除
  mainCanvas.remove(hourHandCircleObject, minuteHandCircleObject, secondHandCircleObject, secondHandBodyObject);
  // 針の中心円オブジェクト生成 ----
  hourHandCircleObject = new HandCircle({
    radius: mmToPixel(1.5),
  });
  minuteHandCircleObject = new HandCircle({
    radius: mmToPixel(1.4),
  });
  secondHandCircleObject = new HandCircle({
    radius: mmToPixel(1),
  });
  // 時針と分針のインスタンス生成 ----
  // hourHandBodyとhourHandBodyObjectは別物なので混乱しないように
  // hourHandBodyはインスタンスであり、fabricオブジェクトではない
  // hourHandBodyObjectがcanvasに描かれるfabricオブジェクト
  // 他のオブジェクトはインスタンス生成を{}外でしているが、
  // 針は、handsShapeをインスタンス生成時に読み込む方法にしたためイベント内で生成している
  const hourHandBody = new HandBody(`./assets/hand-${handsShape}.svg`);
  const minuteHandBody = new HandBody(`./assets/hand-${handsShape}.svg`);
  hourHandBody.drawHourHandBody();
  minuteHandBody.drawMinuteHandBody();
  // 秒針本体オブジェクト生成 ----
  secondHandBodyObject = new fabric.Rect({
    width: mmToPixel(.2),
    //レンジで値を変えるときに分針と同じ長さにするために、heightとscaleYで長さを指定している
    height: defaultHandLength,
    scaleY: minuteSecondHandsScaleY,
    fill: handsColor,
    originX: 'center',
    originY: 'bottom',
    top: mainCanvasCenterHeight,
    left: mainCanvasCenterWidth,
    stroke: 'black',
    strokeWidth: .5,
    angle: secondHandAngle,
  });
  // canvasに描画
  // 時針分針本体を描く処理の方が先に書かれてはいるが、非同期処理なので、
  // 下記のオブジェクトたちが先にcanvasに描かれることもある
  // 針オブジェクトたちがそろった状態で重なり順を直したいので、
  // 時針分針が後から描画された時のために、時針分針を描画するメソッド内でも stackingOrder を呼び出すし、
  // 下記のオブジェクトたちが後から描画された時のために、ここでも stackingOrder を呼び出す
  mainCanvas.add(hourHandCircleObject, minuteHandCircleObject, secondHandBodyObject, secondHandCircleObject);
  // 重なり順を直す
  stackingOrder();
}

// 針の形状が選択されたらcanvasに描画 ----------------
handsShapeInputs.forEach(handsShapeInput => {
  handsShapeInput.addEventListener('input', () => {
    // 変数に値を入れておく
    handsShape = handsShapeInput.value;
    // 針の長さを変えるレンジがまだ動かされていない場合は、初期値を変数に代入
    if (hourHandScaleY === undefined) {
      // 'dialObject.radius / defaultHandLength' は、文字盤見切りにぴったりつく長さになる倍率を表す
      // 2で割ると文字盤の半径の半分の長さになるが、それより少し長くしたいので初期値は1.8にしてある
      hourHandScaleY = dialObject.radius / defaultHandLength / hourHandScaleYAdjustValue;
    }
    if (minuteSecondHandsScaleY === undefined) {
      // 初期値は、文字盤見切りにぴったりつく長さから、初期値は3mm短くした長さ
      minuteSecondHandsScaleY = (dialObject.radius - minuteSecondHandsScaleYAdjustValue) / defaultHandLength;
    }
    // レンジを入力可にする
    hourMinuteHandsDirectionRange.disabled = false;
    secondHandDirectionRange.disabled = false;
    handsLengthRange.disabled = false;
    handsWidthRange.disabled = false;
    // 針たちを描く関数呼び出し
    drawHands();
  });
});

//* main canvas 針の色 ----------------------------------------

// 色が選択されたら、針に色をつける ----------------
// 色を変えたいオブジェクトをまとめるための配列を準備
let handsColorChangeLists;
handsColorInputs.forEach(handsColorInput => {
  handsColorInput.addEventListener('input', () => {
    // 色が選択された時点で、(オブジェクトがまだなくても)変数に値を入れておく
    switch (handsColorInput.value) {
      case 'gold':
        handsColor = goldGradation;
        break;
      case 'silver':
        handsColor = silverGradation;
        break;
      case 'pink-gold':
        handsColor = pinkGoldGradation;
        break;
      case 'custom-color':
        handsColor = handsColorPicker.value;
        break;
      default:
        handsColor = handsColorInput.value;
    }
    // 針オブジェクトがまだない場合はここでリターン
    if (hourHandBodyObject === undefined) {
      alert('「針の形」を選択すると、選択した色で描かれます');
      return;
    }
    // 色を変えたいオブジェクトをまとめるための配列に値を入れる
    handsColorChangeLists = [hourHandBodyObject, hourHandCircleObject, minuteHandBodyObject, minuteHandCircleObject, secondHandCircleObject, secondHandBodyObject];
    // 針に色をつける
    applyColorToArrayObjects(handsColorChangeLists, handsColor);
    mainCanvas.renderAll();
  });
});

//* main canvas 針レンジ ----------------------------------------

// 時針分針の向きを変えるレンジ ----------------
const hourMinuteHandsDirectionRange = document.getElementById('hour-minute-hands-direction-range');
// 初期は入力不可
hourMinuteHandsDirectionRange.disabled = true;
// レンジが動かされたら針の向きを変える ----
hourMinuteHandsDirectionRange.addEventListener('input', () => {
  // 角度を保持したいため変数に値を入れておく
  hourHandAngle = hourMinuteHandsDirectionRange.value / 12;
  minuteHandAngle = hourMinuteHandsDirectionRange.value;
  // rotate()で回転させようとすると、回転の軸がオブジェクトの中心点になってしまう
  // rotate()ではなくangleプロパティで指定したら、回転の軸を bottom にできた
  // setじゃなくてdrawHands呼び出しても良いが、こちらの方が処理が少なくて軽量な可能性がある
  hourHandBodyObject.set({
    angle: parseInt(hourHandAngle),
  });
  minuteHandBodyObject.set({
    angle: parseInt(minuteHandAngle),
  });
  mainCanvas.renderAll();
});

// 秒針の向きを変えるレンジ ----------------
const secondHandDirectionRange = document.getElementById('second-hand-direction-range');
// 初期は入力不可
secondHandDirectionRange.disabled = true;
// レンジが動かされたら針の向きを変える ----
secondHandDirectionRange.addEventListener('input', () => {
  secondHandAngle = secondHandDirectionRange.value;
  secondHandBodyObject.set({
    angle: parseInt(secondHandAngle),
  });
  mainCanvas.renderAll();
});

// 針の長さを変えるレンジ ----------------
const handsLengthRange = document.getElementById('hands-length-range');
// 初期は入力不可
handsLengthRange.disabled = true;
// レンジが動かされたら針の長さを変える ----
handsLengthRange.addEventListener('input', () => {
  // レンジの最大値を設定
  // 'dialObject.radius / defaultHandLength' は、文字盤見切りにぴったりつく長さになる倍率を表す
  // レンジの最大値は、文字盤見切りにぴったりつく長さから、2mm短くした長さ
  handsLengthRange.setAttribute('max', (dialObject.radius - mmToPixel(2)) / defaultHandLength);
  // 値を保持するため変数に値を入れておく
  //* ここで割る値はどうする？
  hourHandScaleY = parseFloat(handsLengthRange.value) / hourHandScaleYAdjustValue;
  minuteSecondHandsScaleY = parseFloat(handsLengthRange.value);
  // 針の長さを変える
  hourHandBodyObject.set({
    scaleY: hourHandScaleY,
  });
  minuteHandBodyObject.set({
    scaleY: minuteSecondHandsScaleY,
  });
  secondHandBodyObject.set({
    scaleY: minuteSecondHandsScaleY,
  });
  mainCanvas.renderAll();
});

// 針の太さを変えるレンジ ----------------
const handsWidthRange = document.getElementById('hands-width-range');
// 初期は入力不可
handsWidthRange.disabled = true;
// レンジが動かされたら針の太さを変える ----
handsWidthRange.addEventListener('input', () => {
  // 値を保持するため変数に値を入れておく
  hourHandScaleX = parseFloat(handsWidthRange.value) * 1.2;
  minuteHandScaleX = parseFloat(handsWidthRange.value);
  // 針の太さを変える
  hourHandBodyObject.set({
    scaleX: hourHandScaleX,
  });
  minuteHandBodyObject.set({
    scaleX: minuteHandScaleX,
  });
  mainCanvas.renderAll();
});

//* case info canvas ---------------------------------------------------------------------------------

// fabricインスタンス ----------------------------------------

const caseInfoCanvas = new fabric.StaticCanvas('case-info-canvas');

// 変数定義 ----------------------------------------

// オブジェクト
const infoLugObjects = [];
let infoCrownObject;
let infoColorChangeLists;

// サイズ・形状・色など
const caseInfoCanvasCenterHeight = 118;
const caseInfoCanvasHalfWidth = 130;
const caseInfoCanvasCaseRadius = 45;
const caseInfoCanvasCaseOpeningRadius = 39;
const caseInfoCanvasDialOpeningRadius = 36;
const caseInfoCanvasLugHalfDistance = 26;

// Node
const caseInfoComment = document.querySelector('.case-info-comment');

// case info canvas に時計の図を描画 ----------------------------------------

// 円のクラス ----------------------------------------
// infoCanvasの ケース・ケース見切・文字盤 に使用
class WatchCircleForInfo extends fabric.Circle {
  constructor(options) {
    super(options);
    this.originX = 'center';
    this.originY = 'center';
    this.left = caseInfoCanvasHalfWidth,
      this.top = caseInfoCanvasCenterHeight,
      this.stroke = 'black';
    this.strokeWidth = 1;
    this.fill = 'white';
  }
}

// info canvas ケース ----------------
const infoCaseObject = new WatchCircleForInfo({
  radius: caseInfoCanvasCaseRadius,
});
// info canvas 見切り ----------------
const infoCaseOpeningObject = new WatchCircleForInfo({
  radius: caseInfoCanvasCaseOpeningRadius,
});
// info canvas 文字盤 ----------------
const infoDialObject = new WatchCircleForInfo({
  radius: caseInfoCanvasDialOpeningRadius,
});
// canvasに描画
caseInfoCanvas.add(infoCaseObject, infoCaseOpeningObject, infoDialObject);

// info canvas ラグ ----------------
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
    if (i === 2 || i === 3) {
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
      { x: this.leftMost, y: caseInfoCanvasCenterHeight },
      { x: this.rightMost, y: caseInfoCanvasCenterHeight }], {
      stroke: 'red',
    });
    this.tipLeft = new fabric.Polyline([
      { x: this.leftMost + 16, y: caseInfoCanvasCenterHeight - 6 },
      { x: this.leftMost, y: caseInfoCanvasCenterHeight },
      { x: this.leftMost + 16, y: caseInfoCanvasCenterHeight + 6 }], {
      stroke: 'red',
      fill: 'transparent',
    });
    this.tipRight = new fabric.Polyline([
      { x: this.rightMost - 16, y: caseInfoCanvasCenterHeight - 6 },
      { x: this.rightMost, y: caseInfoCanvasCenterHeight },
      { x: this.rightMost - 16, y: caseInfoCanvasCenterHeight + 6 }], {
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
for (let i = 0; i < caseInfoCircleLists.length; i++) {
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
for (let i = 0; i < caseInfoCircleLists.length; i++) {
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
mainCanvas.on('mouse:down', function (options) {
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





//* テスト用 -------------------------------------------------------------------------

// const centerLine = new fabric.Polyline([
//   {x: 0, y: mainCanvasCenterHeight},
//   {x: 384, y: mainCanvasCenterHeight}], {
//   stroke: 'red',
// });
// mainCanvas.add(centerLine);


// let object;

const testButton1 = document.getElementById('button-for-test');
testButton1.addEventListener('click', () => {

  // ここから試しコードを書く ----------------------------

  console.log(upperStrapStitchObject);
  console.log(barDotObjects);


  // ここまで試しコードを書く ----------------------------

});

document.getElementById('button-for-test2').addEventListener('click', () => {




});

//* テスト用 -------------------------------------------------------------------------



//* export ---------------------------------------------------------------------------------------

export { mainCanvas };

