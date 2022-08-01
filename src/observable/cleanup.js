// 分支切换 于 cleanup
// 分支的概念
// 一个副作用函数内部存在一个三元表达式,根据字段obj.ok值的不同会执行不同的代码分支, ok值发生改变时, 代码分支也会跟着变化, 这就是分支切换



const bucket = new WeakMap()
let activeEffect
// 原始数据
const data = {ok:true, text:'hello word'}
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
        fn()
    }
    effectFn.deps = []
    effectFn()
}

effect(()=>{
    document.querySelector('.text').innerText = obj.ok ? obj.text : ''
})

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

document.querySelector('.button').onclick = function(){
    obj.ok = false
}
// 当ok为false时, 执行obj.text 修改依然会触发副作用函数执行
// 虽然页面的值不需要变化
// 首先考虑出现这种问题的原因是什么? 
// 初始化 ok 为true 的时候, 有两个字段进行了 get 触发, 此时两个key值都绑定了副作用函数
// 当ok设置为false的之后, 修改text 依旧会触发自己本身绑定的副作用函数
// 解决方法, 每次副作用函数执行的时候, 先把两个key值绑定的函数清除, 然后会重新执行get获取重新绑定, 这样当ok为false的时候, text 就不会执行获取, 也就不会收集副作用函数
document.querySelector('.button1').onclick = function(){
    obj.text = '11111'
}
