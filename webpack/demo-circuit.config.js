const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');

const projectDir = path.resolve(__dirname+'/../')

module.exports = {
  context:  projectDir + '/docs/circuit',
  entry: projectDir + '/app/frontend/circuit/js/index.js',
  devtool: 'source-map',
  mode: 'development',
  output: {
  libraryTarget: 'umd', // make the bundle export
    path: projectDir + '/docs/circuit/js/webpack',
    filename: "bundle.js"
  },
  module: {
    rules: [
      {
        test: /(\.jsx|\.js)$/,
        loader: 'babel-loader',
        exclude: /(node_modules|bower_components)/
      },
      {
        test: /(\.jsx|\.js)$/,
        loader: 'eslint-loader',
        exclude: /node_modules/
      },
      {
        test: /\.less$/,
        use: [{
          loader: 'style-loader' // creates style nodes from JS strings
        }, {
          loader: 'css-loader' // translates CSS into CommonJS
        }, {
          loader: 'less-loader' // compiles Less to CSS
        }]
      },
      {
        test: /\.css$/,
        use: [ 'style-loader', 'css-loader' ]
      },
      {
        test: /\.(eot|woff|ttf|woff2|svg|png|gif)$/,
        loader: "file-loader" ,
        options: {
          publicPath: function(url) {
            return "js/webpack/"+url
          }
        }
      },
      {
        test: /\.exec\.js$/,
        use: [ 'script-loader' ]
      }
    ]
  },
  resolve: {
    modules: [ projectDir+'/node_modules', projectDir+'/src'],
      extensions: ['.json', '.js', '.css']
  },
  plugins: [
    new CopyWebpackPlugin([
      {
        context: projectDir+'/app/shapes/',
        from: '**/*',
        to : projectDir+"/docs/circuit/shapes"
      },
      {
        context: projectDir+'/app/frontend/circuit/',
        from: 'images/**/*',
        to : projectDir+"/docs/circuit/"
      },
      {
        context: projectDir+'/app/frontend/circuit/',
        from: 'index.html',
        to : projectDir+"/docs/circuit/"
      },
      {
        context: projectDir+'/app/frontend/circuit',
        from: 'lib/**/*',
        to : projectDir+"/docs/circuit/"
      }
    ], { debug: 'debug' })
  ]
};
