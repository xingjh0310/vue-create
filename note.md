## 编译环境搭建

1. 初始化package.json文件,配置rollup 打包工具编译文件

npm init -y 生成 package.json 文件

修改 package.json 文件 中启动命令 ==> "script":{"dev":"rollup -cw"}

npm install rollup typescript rollup-plugin-typescript2 @rollup/plugin-node-resolve rollup-plugin-serve -D

编译过程中可能会出现 common.js 之类的报错,可以修改 tsconfig.json 文件 中的 "module" 属性, 修改为 "ESNEXT"

新建 rollup.config.ts 文件

配置看文件代码