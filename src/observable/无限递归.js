


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

    // ====================== 新增开始
    const effectsToRun = new Set()
    effects && effects.forEach(effectFn => {
        if(effectFn !== activeEffect){
            effectsToRun.add(effectFn)
        }
    });
    effectsToRun && effectsToRun.forEach(effectFn=>effectFn())
    // ====================== 新增结束

    // const effectsToRun = new Set(effects)
    // effectsToRun.forEach(fn => { fn() });
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
        effectStack.push(effectFn)
        // =================新增结束
        fn()
        // 嵌套函数会执行两遍effect,相当于会执行两遍fn, 因为是嵌套关系, 所以内层effect(已收集了两个effectFn)执行完之后才会执行下面两行代码
        effectStack.pop()
        // 拿到最顶层的副作用函数去做依赖收集
        activeEffect = effectStack[effectStack.length -1]
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

effect(()=>{obj.foo++})

// Uncaught RangeError: Maximum call stack size exceeded

// 无限递归很好理解, 副作用函数执行的时候会触发 foo的依赖收集, +1又赋值给foo, 又会触发set去触发, 这时候又把收集的依赖去执行
// 执行的中的时候,就要开始下一次的执行,这样就会导致无限的调用自己, 于是就产生了栈溢出
// 解决方式也很简单, trigger去触发的时候, 判断需要执行的副作用函数, 如果跟正在执行的相同的话,就不去触发执行
