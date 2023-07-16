'use strict';

import { mainCanvas } from './index.js';

// canvasの内容をSVGに変換してダウンロード ----------------
function downloadSVG() {
// document.getElementById('dl-btn').addEventListener('click', () => {
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
// });
}

export { downloadSVG };