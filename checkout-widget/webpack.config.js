const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/sdk/PaymentGateway.js',
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'checkout.js',
    library: 'PaymentGateway',
    libraryTarget: 'umd'
  }
};
