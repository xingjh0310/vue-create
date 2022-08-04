// 前面我们看到通过调度器可以来实现副作用函数执行的顺序, 那我们是不是也可以控制执行次数呢?
// 例如
// const data = {foo:1}
// const obj = new Proxy(data,{/*******/})
// effect(()=>{
//     console.log(obj.foo)
// })
// obj.foo ++
// obj.foo ++
// 首先在副作用函数中打印foo的值, 然后两次自增, 没有调度器的情况下输出 1 2 3
// 如果我们只想关心最终结果 1-3, 那么执行三次打印操作就是多余了, 我们期望打印 1 3, 其中不包含 过度的状态, 怎么通过调度器是执行呢? 

// ==============新增开始
// 定义一个任务队列
const jobQueue = new Set()
// 使用promise.resolve() 创建一个promise 实例, 用它将一个任务添加到微任务队列
const p = Promise.resolve()
// 定义一个标识, 标识当前是否正在执行队列
let isFlushing = false

function flushJob(){
    // 如果队列正在属性, 则什么都不做
    if (isFlushing) return 
    // 设置为true 表示正在刷新
    isFlushing = true
    // 在微任务中刷新jobQueue队列
    p.then(()=>{
        console.log(jobQueue)
        jobQueue.forEach(job=> job())
    }).finally(()=>{
        // 结束后重置 isFlushing
        isFlushing = false
    })
}


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
// effect 函数执行的时候, 首先会输出1
// 通过++的第一次修改, 将副作用函数添加到jobQueue中, 然后执行flushJob 添加到异步队列中去, 这时候副作用函数不会先执行, 会继续先执行后面的 ++ 
// 第二次 ++ 的时候, obj.foo 已经变为了3,(这时候一次副作用函数都没有执行),然后继续执行 jobQueue.add(), 但是由于jobQueue 是个Set数据结构, 具有去重的功能, 最终jobQueue只会存储一个副作用函数, 即当前的副作用函数
// 然后第二次执行 flushJob, 但是由于上次flushJob 执行的时候,把isFlushing设置成了true, 只能等异步队列里面的函数执行完了之后, 设置为false了才能执行
// 所以第二次执行的时候,遇到return 直接拦截了
// 实际上flushJob在一个事件循环内, 只会执行一次, 即在微任务队列中执行一次
// 等所有同步任务执行完毕之后,此时就会把异步队列中的函数拿出来执行, 这时候jobQueue中只有一个副作用函数, 所以只会执行一次, 这时候执行的时候, foo 已经经历了两次递增
// 所以直接就会输出3, 省略了2的输出
// 那我们 执行 effect的时候, 最终结果就为 1 3 

// Vue中连续多次修改响应式数据但只会触发一次更新,也是通过一个更加完善的调度器实现的, 思路和上面介绍的相同

effect(
    ()=>{
        
        console.log(obj.foo)
    },
    {
        scheduler(fn){
            // 每次调度的时候, 将副作用函数添加到 jobQueue队列中
            jobQueue.add(fn)
            flushJob()
        }
    }
)

debugger

obj.foo++
obj.foo++
