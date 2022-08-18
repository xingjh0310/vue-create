// 前文介绍了 effect函数, 它用来注册副作用函数, 也可以传一些选项参数(调度器)来控制副作用函数执行的时机与方式, 还有副作用收集函数tarck, 和触发函数 trigger函数
// 综述所述, 我们就可以实现一个非常重要并且非常有特色的能力 -- 计算属性
// 1. 首先我们先来了解下 懒执行的 effect(副作用函数),即lazy的effect
// 例如: 
effect(()=>{
    // 这个函数会立即执行
    console.log(obj.foo)
})
// 但是有些场景下,我们并不希望立即执行,而是希望在需要执行的时候才去执行, 例如计算属性,这时我们可以通过在options中添加 lazy 属性来达到目的

effect(
    ()=>{
        console.log(obj.foo)
    },
    {
        lazy:true
    }
)
// lazy选项和之前介绍的 scheduler一样, 它通过options选项对象指定, 我们可以通过修改effect函数实现逻辑
// lazy和scheduler 调度器的区别再与, lazy是拦截执行,等待手动执行, scheduler是将effectFn 放在调度器中执行
// 当 options.lazy为true时,则不立即执行副作用函数

function effect(fn,options){
    const effectFn = ()=>{
        // 副作用清除,解决分支切换问题
        cleanup(effectFn)
        activeEffect = effectFn
        // effectStack 收集副作用函数,当函数执行之后,将堆栈中函数置顶, 然后重新给 activeEffect 赋值, 这样trigger函数执行的一直都是顶层的最新副作用, 解决副作用函数嵌套的问题
        effectStack.push(effectFn)
        fn()
        effectStack.pop()
        activeEffect = effectStack[effectStack.length - 1]
    }
    effectFn.options = options
    effectFn.deps = []
    // 只有非lazy的时候,才执行
    // ======================== 新增开始
    if(!options.lazy){
        effectFn()
    }
    return effectFn
    // ======================== 新增结束
}
// 通过 lazy 的判断,我们就实现了不让副作用函数立即执行的功能, effect函数手动调用的时候,就可以执行了
// 如果仅仅能够手动执行函数,好像没有什么意义, 那么能不能通过传递一个函数, 通过effect函数的调用,拿到传递函数的执行结果
// 例如
const effectFn = effect(
    ()=>{
        return obj.foo + obj.bar
    },
    {lazy:true}
)
const value = effectFn()

// 为了实现这个目标, 我们可以在做一次修改

function effect(fn,options){
    const effectFn = ()=>{
        // 副作用清除,解决分支切换问题
        cleanup(effectFn)
        activeEffect = effectFn
        // effectStack 收集副作用函数,当函数执行之后,将堆栈中函数置顶, 然后重新给 activeEffect 赋值, 这样trigger函数执行的一直都是顶层的最新副作用, 解决副作用函数嵌套的问题
        effectStack.push(effectFn)
        // ================ 新增开始
        const res = fn()
        // ================ 新增结束

        effectStack.pop()
        activeEffect = effectStack[effectStack.length - 1]

        // ================ 新增开始
        return res
        // ================ 新增结束

    }
    effectFn.options = options
    effectFn.deps = []
    if(!options.lazy){
        effectFn()
    }
    return effectFn
}
// 以上代码 通过定义 res 接收 fn的返回值, 通过effectFn的调用,将res返回出来 这样就可以拿到 函数的返回值

// 接下来 我们就可以基于 lazy的efect函数, 实现 computed 计算属性了
// 首先定义一个computed 函数, 接受一个getter函数作为参数, 我们把getter函数作为副作用函数
// computed 函数执行会返回一个对象,该对象value属性是一个访问器属性,只有当读取value的时候, 才会执行effectFn并将其结果作为返回值返回

function computed(getter){
    const effectFn = effect(getter,{
        lazy:true
    })

    const obj = {
        get value(){
            return effectFn
        }
    }
    return obj
}
// 我们可以使用computed来创建一个计算属性

const data = {foo:1, bar:2}

const obj = new Proxy(data, {/* ..... */})


const sumRes = computed(
    ()=>{ obj.foo + obj.bar},
    {lazy:true}
)

sumRes.value // 3

// 以上能够正确的工作, 但是现在实现的计算属性只做到了懒计算,没有实现计算属性的精髓- 缓存
// 假如我们多次访问 sumRes.value的时候, 会导致effeftFn 进行多次计算,即便 foo 和 bar 没有变化
// 为了解决这个问题,我们可以通过增加变量的方式, 来判断上一次是否已经读取过, 如果已经读取过, 就直接走缓存, 不重新执行effectFn 函数

function computed(getter){
    // 创建变量接收计算的值
    let value
    // 创建 dirty 标志, 用来标识, 是否需要变更计算值, 如果是true的时候 则需要计算, false 的时候. 直接输出 value
    let dirty = true

    const effectFn = effect(getter, {
        lazy:true
    })

    const obj = {
        get value(){
            if(dirty){
                value = effectFn()
                // 第一次读取之后, 将dirty设置为 false, 第二次访问的时候,直接 获取value, 不去执行effectFn()
                dirty = false
            }
            return value 
        }
    }
    return obj
}

// 到了现在已经实现了 计算属性的缓存, 是否还有问题呢?
// 目前看读取是没有问题了, 但是如果第一次读取了之后, foo或者bar的值修改了呢? effectFn不会重新执行,那输出的值一直都是旧的值
// 那怎么解决这个问题呢? 大致思路,是不是当我 foo或者bar修改的时候,将dirty重置为true 就行了呢? 
// 修改的时候会触发 trigger函数, 上节我们讲到, trigger函数触发执行的之后, 首先会判断是否存在调度器, 如果存在调度器的话就是执行调度内的内容

function computed(getter){
    // 创建变量接收计算的值
    let value
    // 创建 dirty 标志, 用来标识, 是否需要变更计算值, 如果是true的时候 则需要计算, false 的时候. 直接输出 value
    let dirty = true
    const effectFn = effect(getter, {
        lazy:true,
        // ===============新增开始
        scheduler(){
            dirty = true
        }
        // ===============新增结束
    })

    const obj = {
        get value(){
            if(dirty){
                value = effectFn()
                // 第一次读取之后, 将dirty设置为 false, 第二次访问的时候,直接 获取value, 不去执行effectFn()
                dirty = false
            }
            return value 
        }
    }
    return obj
}
// 结合之前讲的响应式原理, 我们来大致走一遍逻辑
// 1. obj读取value值的时候,会触发effectFn执行
// 2. getter执行的时候会触发响应式的收集 (getter ===> ()=>{obj.foo + obj.bar}),把getter当做副作用函数收集,包括配置项
// 3. 第一次值输入
// 4. 当obj对象修改值的之后, 首先会触发trigger函数之后,遇到调度器scheduler, 会被拦截执行, 这时候会把dirty修改为true
// 5. 修改之后的第二次读取, 这时候dirty 已经为true了, 会触发二次计算

// 到此,我们的计算属性已经趋于完美了, 但是还有没有bug了呢? 

// 首先想下使用场景, 一般计算属性都会在哪里使用呢? script用作数据读取, 还有一种是通过花括号绑定在模板中使用
// 如果在模板中使用的话, 那当计算属性中的发生改变的时候, 势必要重新渲染模板数据, 通过响应式原理的分析, 重新渲染模板数据的逻辑肯定是单独一个副作用函数去执行的
// 我们看这个例子
const sumRes1 = computed(()=>{obj.foo + obj.bar})
effect(()=>{
    console.log(sumRes1.value)
})
// 修改 foo 的值
obj++

// 这时候sumRes1的值肯定会发生变化, 但是 effect函数会重新执行吗? 答案是不会


// 这其实相当于一个副作用函数中去读取计算属性的值, 计算属性又相当于另外一个副作用函数的调用, 从本质上看这就是个典型的effect嵌套
// 计算属性的执行的副作用函数收集, 只会收集内部的effect作为依赖
// 把计算属性用作于另一个effect时, 计算属性属于内存effect, 内存的effect不会收集外层的effect, 所以当计算属性执行的时候, 并不会执行 外层的effect执行输出
// 解决思路: 是否可以在sumRes1.value执行的时候, 去手动触发 tarck(), 进行依赖的收集, 将()=>{console.log(sumRes1.value)},当成副作用函数收集在obj下某一个key的下面
// 当obj值发生改变的时候, 在手动通过trigger() 去触发函数的执行
// 代码如下
function computed(getter){
    // 创建变量接收计算的值
    let value
    // 创建 dirty 标志, 用来标识, 是否需要变更计算值, 如果是true的时候 则需要计算, false 的时候. 直接输出 value
    let dirty = true
    const effectFn = effect(getter, {
        lazy:true,
        
        scheduler(){
            dirty = true
            // ===============新增开始
            // 当计算属性依赖的响应式数据变化时, 手动调用 trigger() 触发响应
            // 按照之前的响应式原理分析, 这里的触发, 是会把之前绑定在 obj['value']下的 activeEffect 获取出来执行
            trigger(obj,'value')
            // ===============新增结束
        }
        
    })

    const obj = {
        get value(){
            if(dirty){
                value = effectFn()
                // 第一次读取之后, 将dirty设置为 false, 第二次访问的时候,直接 获取value, 不去执行effectFn()
                dirty = false
            }
            // ================= 新增开始
            // 首先读取的时候,先进行依赖收集
            // 按照之前的响应式原理分析, 这里的收集, 是当effect(()=>{console.log(sumRes1.value)}) 执行的时候
            // 会把()=>{console.log(sumRes1.value)}赋值给 activeEffect, 然后把activeEffect绑定给 obj['value'] = activeEffect
            tarck(obj,'value')
            // ================= 新增结束
            return value 
        }
    }
    return obj
}
// 大致联系 computed(obj)========> value =======> effectFn






