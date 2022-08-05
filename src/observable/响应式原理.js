// 一个基本的响应式原理的实现
// 首先, 学习响应式之前, 需要先熟悉两个概念
// 1. 副作用函数, 一个函数调用, 内部逻辑涉及到了全局变量的修改, 并且这个全局变量在另外一个函数内部使用,那么这个函数就叫做副作用函数
// 2. 响应式数据, 一个副作用函数内部, 当obj.text发生改变时, 希望effect 能够自动重新执行, 完成赋值操作, 那么这个obj 数据就是个响应式数据
// function effect(){document.body.innerText = obj.text}
// 实现思路 当一个副作用函数执行的时候, 内部如果有取值的操作, 先把当前对象存储到一个副作用函数的桶中,然后给当前 对象=>key=>effect
// 桶中存储的数据格式是: {target:{key:effect()}}
// set 设置的之后, 先给 target 修改新值, 然后 从桶中拿到对应的key下面的effect 函数, 统一执行


// 先创建一个存储副作用函数的桶
// WeakMap 的作用是, 当存储的是key 值不被使用的时候, 会被垃圾回收机制回收, 不能造成内存溢出
const bucket = new WeakMap()
let activeEffect
// 原始数据
const data = {text: 'hello word'}
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
}

// 函数触发

function trigger(target, key){
    const depsMap = bucket.get(target)
    if(!depsMap) return
    const effects = depsMap.get(key)
    console.log(effects)
    effects && effects.forEach(fn => { fn() });
}

// 创建一个副作用函数, 函数内部操作 响应式数据

function effect(fn){
    activeEffect = fn
    fn()
}

effect(
    ()=>{document.body.innerText = obj.text}
)

obj.text = '1111'

