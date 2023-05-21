module.exports = {

  // エントリーポイント
  entry: "./src/js/index.js",

  // ファイルの出力設定
  output: {
    // 出力先のパスを指定
    path: `${__dirname}/dist`,
    // 出力後のファイル名
    filename: "bundle.js",
  },

  module: {
    rules: [
      // cssファイルの処理
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },

  // 開発モードでビルドする
  mode: "development",

  // ローカルサーバーの設定
  devServer: {
    static: `${__dirname}/dist`,
    open: true,
  },
  
};