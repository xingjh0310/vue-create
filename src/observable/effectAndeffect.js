// 嵌套的effect 与 effect栈
// 副作用的调用是会出现嵌套的情况的, 例如
// effect(function a(){effect(function b(){ /b函数的执行代码/ }) /a函数的执行代码/ })
// a函数内部嵌套了b函数, a函数的执行会导致b函数的执行, 这就是副作用函数的嵌套
// 场景: Vue中, A组件中加载了B组件
// const Bar = {
//     render(){}
// }
// // foo 组件渲染了bar组件
// const foo = {
//     render(){
//         return <Bar/>
//     }
// }
// // 相当于
// effect(()=>{
//     foo.render()
//     effect(()=>{
//         Bar.render()
        
//     })
// })
// 测试一下如果响应式不支持嵌套的话, 会有什么情况


const bucket = new WeakMap()
let activeEffect
// effect栈 ================= 新增开始

const effectStack = []

// effect栈 ================= 新增结束

// 原始数据
const data = { foo: true, bar: false}
const obj = new Proxy(data, {
    get(target, key){
      // 进行搜集的动作
      track(target, key)
      // 返回属性值
      return target[key]
    },
    set(target, key, newVal){
        // 设置属性值
        target[key] = newVal
        // 触发副作用执行
        trigger(target, key)
        //  Es6 语法中, set函数需要有返回值 true或者false , 代表赋值完成, 否则控制台报错, 但是不会影响 副作用函数执行
        return true

    }
})
// 收集函数
function track(target, key){
    // 响应式实现, 最重要的是必须有副作用函数, 否则无法执行, 首先判断是否存在副作用函数
    // 没有 activeEffect 直接return
    if(!activeEffect) return
    // 判断桶中是否已存在 当前target, 不存在的话, 创建一个新对象
    let depsMap = bucket.get(target)
    if(!depsMap){
        bucket.set(target,(depsMap = new Map()))
    }
    // 判断 当前target下是否已存在当前 key 值, 不存在的话, 创建一个 new Set() 数组
    let deps = depsMap.get(key)
    if(!deps){
        depsMap.set(key, (deps = new Set()))
    }
    deps.add(activeEffect)
    
    //deps 就是一个与当前副作用函数存在联系的依赖集合
    //每进行一个get取值 都会收集一遍key对应的对象, 下次set的时候, 执行副作用函数activeEffect 之前, 就可以把deps拿出来进行循环删除
    //这样每次set之后的get, 都可以重新收集依赖
    activeEffect.deps.push(deps)
    // console.log(activeEffect.deps)
}

// 函数触发

function trigger(target, key){
    const depsMap = bucket.get(target)
    if(!depsMap) return
    const effects = depsMap.get(key)
    // console.log('触发',effects)
    // forEach 遍历Set集合时, 如果一个值已经被访问过了, 并且在执行副作用函数的时候被清除了并get的时候重新又添加到集合中了,
    // 这时的forEach 遍历还没有结束,那么该值就会被重新访问,造成死循环
    const effectsToRun = new Set(effects)
    effectsToRun.forEach(fn => { fn() });

}

// 创建一个副作用函数, 函数内部操作 响应式数据

function effect(fn){
    // 新创建一个函数当做副作用函数
    const effectFn = ()=>{
        // 首次执行时 effectFn 对应的是const变量, 是个函数体, 可以看做是个变量值
        // set执行的时候, effectFn 可以抽象的理解为函数体, 不存在变量的含义, 副作用函数执行的是(()=>{})(),当存储起来的时候, effectFn变量实际是对应成函数体存储起来的
        // 所以能获取到 effectFn.deps
        cleanup(effectFn)
        activeEffect = effectFn
        // =================新增开始
        effectStack.push(effectFn)
        // =================新增结束
        fn()
        // =================新增开始
        // 嵌套函数会执行两遍effect,相当于会执行两遍fn, 因为是嵌套关系, 所以内层effect(已收集了两个effectFn)执行完之后才会执行下面两行代码
        effectStack.pop()
        // 拿到最顶层的副作用函数去做依赖收集
        activeEffect = effectStack[effectStack.length -1]
        // =================新增结束
    }
    effectFn.deps = []
    effectFn()
}

function cleanup(effectFn){
    // 遍历 effectFn.deps 数组
    for(let i=0; i<effectFn.deps.length; i++){
        // deps 是依赖集合
        const deps = effectFn.deps[i]
        // 将 effectFn 从依赖集合中删除
        deps.delete(effectFn)
    }
    effectFn.deps.length = 0
}

// 副作用函数的调用

let temp1, temp2

effect(function effectFn1(){
    console.log('effect1执行')

    effect(function effectFn2(){
        console.log('effect2执行')
        temp2 = obj.bar
    })
    temp1 = obj.foo
    
})
// 理想情况下的数据模型 data->foo->effect1  data->bar->effect1
// 我们希望当修改 foo 的时候, 触发了effect1的执行, 由于里面嵌套了effect2, 会简介的触发effect2执行, 修改data.bar的时候只会触发effect2的执行
// 实际情况呢? 
// 初始化的时候会输出 'effect1执行', 'effect2执行', 目前为止是正确的, 当我们点击按钮修改 foo 之后呢, 我们希望输出的是effect1执行, 但是确实输出的effect2执行
// 首先考虑出现这种问题的原因是什么? 
// 因为用的同一个变量 activeEffect, effect执行的时候, 会把effect1这个副作用函数赋值给activeEffect
// 执行effect1的时候 又会触发内层的effect函数, 这时候activeEffect 就会重新被覆盖成 effectFn2 函数
// 最后foo去读取的时候, 进行的依赖收集, 就是收集的effectFn2副作用函数, 所以触发的时候, 一直是触发的 effectFn2的函数执行
// 解决方法, 初始化的时候, 会收集effectFn1和effectFn2两个依赖, 单独设置个变量去存储起来, 当前副作用函数执行完, 就弹出去,并将activeEffect还原顶层的副作用函数
// 例如, 初始化的时候先收集了effectFn1, 后收集 effectFn2, 两个副作用函数执行了之后,把effectFn2踢出去, 然后把activeEffect指向effectFn1,然后绑定给key值,做依赖收集


document.querySelector('.button').onclick = function(){
    obj.foo = false
}
// 现在这里有个小问题, 内层副作用变量修改的时候, 会触发多次副作用的执行(循环执行的次数跟顶层副作用函数点击执行一致)
// 原因是因为我点击foo修改的时候, 其实bar 只做了依赖收集, 这时候, bar的依赖是不会触发cleanup的, 所以就相当于foo点了了几次修改, bar就收集了几次依赖
// 这样每次bar去点修改的时候, 都会执行多次, 由于副作用函数执行之后都会把activeEffect 清除,导致单独执行effectFn2的时候,activeEffect变成了undefinde
// set去循环执行副作用函数的时候,无法判断我当前的副作用函数是哪个... 无法拦截... 
document.querySelector('.button1').onclick = function(){
    obj.bar = false
}