var webpack = require('webpack');//引入webpack
var path = require('path');//引入nodejs路径模块，处理路径用的
var glob = require('glob');//glob，这个是一个全局的模块，动态配置多页面会用得着
var HtmlWebpackPlugin = require('html-webpack-plugin'); //这个是通过html模板生成html页面的插件
var MiniCssExtractPlugin = require("mini-css-extract-plugin");//分离css，webpack4推荐的分离css的插件
var TransferWebpackPlugin = require('transfer-webpack-plugin');//原封不动的把assets中的文件复制到dist文件夹中
var os = require('os'); //这个nodejs模块，会帮助我们获取本机ip
var portfinder = require('portfinder'); //这个帮助我们寻找可用的端口，如果默认端口被占用了的话
var fs = require('fs'); //处理文件用的
var ports = fs.readFileSync('./port.json', 'utf8');
ports = JSON.parse(ports);
portfinder.basePort = "8080";
portfinder.getPort(function(err, port) {
    ports.data.port = port;
    ports = JSON.stringify(ports,null,4);
    fs.writeFileSync('./port.json',ports);
});

///////////////////获取本机ip///////////////////////
function getIPAdress(){  
    var interfaces = os.networkInterfaces();  
    for(var devName in interfaces){
        var iface = interfaces[devName];  
        for(var i=0;i<iface.length;i++){  
            var alias = iface[i];  
            if(alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal){  
                return alias.address;  
            }  
        }  
    }  
} 
var host = getIPAdress();
//动态添加入口
function getEntry(){
    var entry = {};
    //读取src目录所有page入口
    glob.sync('./src/js/**/*.js').forEach(function(name){
        var start = name.indexOf('src/') + 4;
        var end = name.length - 3;
        var eArr = [];
        var n = name.slice(start,end);
        n= n.split('/')[1];
        eArr.push(name);
        eArr.push('babel-polyfill');
        entry[n] = eArr;
    })
    return entry;
}
//动态生成html
//获取html-webpack-plugin参数的方法
var getHtmlConfig = function(name,chunks){
    return {
        template:`./src/pages/${name}.html`,
        filename:`pages/${name}.html`,
        inject:true,
        hash:false,
        chunks:[name]
    }
}
module.exports = {
    entry:getEntry(),
    output:{
        path:path.resolve(__dirname,'dist'),
        filename:'js/[name]-bundle.js',
    },
    module:{
        rules:[
            {
                test:/\.js$/,
                exclude:/(node_modules)/,
                include: /src/,
                use:[
                    {
                        loader:'babel-loader',
                        options:{
                            presets:['@babel/preset-env',],
                            plugins:['@babel/transform-runtime']
                        }
                    }
                ]
            },
            {
                test:/\.css$/,
                //use:['style-loader','css-loader','postcss-loader']//css不分离写法
                //css分离写法
                use:[MiniCssExtractPlugin.loader,"css-loader","postcss-loader"]
            },
            {
                test:/\.scss$/,
                //use:['style-loader','css-loader','sass-loader','postcss-loader']//css不分离写法
                //css分离写法
                use:[MiniCssExtractPlugin.loader,"css-loader", "postcss-loader", "sass-loader"]
            },
            {
                test:/\.(png|jpg|gif|jpeg)$/,
                use:[
                    {
                        loader:'url-loader',
                        options:{
                            limit:5000
                        }
                    }
                ]
            }
        ]
    },
    mode:"development",
    performance:{
        hints:false
    },
    //插件
    plugins:[
        new MiniCssExtractPlugin({
            filename: "css/[name].css"
        }),
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            jquery: "jquery",
            "window.jQuery": "jquery"
        }),
        new TransferWebpackPlugin([
            {
                from: 'assets',
                to: 'assets'
            }
        ], path.resolve(__dirname,"src")),
        new webpack.HotModuleReplacementPlugin()
    ],
    devServer:{
        contentBase:path.resolve(__dirname,'dist'), //最好设置成绝对路径
        historyApiFallback: false,
        hot: true,
        inline: true,
        stats: 'errors-only',
        host: host,
        port: ports.data.port,
        overlay: true,
        open:true
    }
}
//配置页面
var entryObj = getEntry();
var htmlArray = [];
Object.keys(entryObj).forEach(function(element){
    htmlArray.push({
        _html:element,
        title:'',
        chunks:[element]
    })
})
//自动生成html模板
htmlArray.forEach(function(element){
    module.exports.plugins.push(new HtmlWebpackPlugin(getHtmlConfig(element._html,element.chunks)));
})

