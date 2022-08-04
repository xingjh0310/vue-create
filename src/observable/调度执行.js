// 可调度性是响应式系统非常重要的特型
// 什么是可调度型? 
// 所谓可调度, 就是当trigger触发执行的时候,我们有能力去决定副作用函数的执行的时机,次数以及方式
// 举个例子
// const data = {foo:1}
// const obj = new Proxy(data,{/*******/})
// effect(()=>{
//     console.log(obj.foo)
// })
// obj.foo ++
// console.log('结束了')

// 输出结果 1 2 结束了
// 现在假设需求有变, 输出顺序需要调整为: 1 '结束了' 2 
// 我们是不是可以设计一个调度器, 通过副作用函数传到 trigger 里面去, 去改变obj.foo ++ 的执行顺序呢?
// 首先 effect() 函数内可以多传一个 options 参数

const bucket = new WeakMap()
let activeEffect

const effectStack = []

// 原始数据
const data = { foo: 1}
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
}

// 函数触发

function trigger(target, key){
    const depsMap = bucket.get(target)
    if(!depsMap) return
    const effects = depsMap.get(key)
    // forEach 遍历Set集合时, 如果一个值已经被访问过了, 并且在执行副作用函数的时候被清除了并get的时候重新又添加到集合中了,
    // 这时的forEach 遍历还没有结束,那么该值就会被重新访问,造成死循环

    const effectsToRun = new Set()
    effects && effects.forEach(effectFn => {
        if(effectFn !== activeEffect){
            effectsToRun.add(effectFn)
        }
    });
    effectsToRun && effectsToRun.forEach(effectFn=>{
        // 如果当前存在调度器, 就通过调度器去执行
        if(effectFn.options.scheduler){
            effectFn.options.scheduler(effectFn)
            return
        }
        effectFn()
    })

    // const effectsToRun = new Set(effects)
    // effectsToRun.forEach(fn => { fn() });
}

// 创建一个副作用函数, 函数内部操作 响应式数据

function effect(fn, options = {}){
    // 新创建一个函数当做副作用函数
    const effectFn = ()=>{
        // 首次执行时 effectFn 对应的是const变量, 是个函数体, 可以看做是个变量值
        // set执行的时候, effectFn 可以抽象的理解为函数体, 不存在变量的含义, 副作用函数执行的是(()=>{})(),当存储起来的时候, effectFn变量实际是对应成函数体存储起来的
        // 所以能获取到 effectFn.deps
        cleanup(effectFn)
        activeEffect = effectFn
        effectStack.push(effectFn)
        fn()
        // 嵌套函数会执行两遍effect,相当于会执行两遍fn, 因为是嵌套关系, 所以内层effect(已收集了两个effectFn)执行完之后才会执行下面两行代码
        effectStack.pop()
        // 拿到最顶层的副作用函数去做依赖收集
        activeEffect = effectStack[effectStack.length -1]
    }
    // =================新增开始
    effectFn.options = options
    // =================新增结束
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

// effect 函数触发

effect(
    ()=>{
        console.log(obj.foo)
    },
    // 传入一个调度器, 将调度器放到一个宏任务中去执行, 改下执行顺序
    {
        scheduler(fn){
            setTimeout(fn)
        }
    }
)

obj.foo++

console.log('我变成第二了')



