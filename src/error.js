// 错误处理机制, 注册统一的错误处理函数

import utils from '../untils/untils'

utils.registerErroeHandler((e)=>{
    console.log(e)
})

utils.foo(()=>{
    p = new Promise()

    p.resolver.then(()=>{
        console.log(111)
    })
   
})
utils.bar(()=>{
    p = new Promise()

    p.resolver.then(()=>{
        console.log(111)
    })
   
})
