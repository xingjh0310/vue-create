import ts from 'rollup-plugin-typescript2'; //解析ts
import { nodeResolve } from '@rollup/plugin-node-resolve'; //解析模块,引入文件时可以不用全路径
import serve from 'rollup-plugin-serve';
import path from 'path'

export default{
    input:'./src/observable/effectAndeffect.js',
    output:{
        file:path.resolve(__dirname,'dist/bundle.js'),
        sourceMap:true,
        format:'iife', //生成一个自执行函数
    },
    // 配置插件
    plugins:[
        nodeResolve({
            extensions:['.js','.ts']
        }),
        ts({
            tsconfig:path.resolve(__dirname,'tsconfig.json')
        }),
        serve({
            openPage:'public/observable/effectAndeffect.html',
            contentBase:'',
            port:3000
        })
    ]
}
