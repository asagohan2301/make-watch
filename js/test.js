'use strict';

// import { crownObject } from './index.js';

function testBtn() {
  document.getElementById('test-btn').addEventListener('click', () => {
    console.log('ボタンを押しました');
  });
}

function testColorPicker() {
  const color = document.getElementById('test-color-picker');
  const div = document.getElementById('test-color-container');
  color.addEventListener('input', () => {
    div.style.backgroundColor = color.value;
    // console.log(div.style.color);
  });
}

export { testBtn, testColorPicker };