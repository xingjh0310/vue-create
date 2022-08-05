// 框架设计-- 纯运行框架

// 提供一个 Render 函数, 并为该函数提供一个树形结构的数据对象, 任何Render函数会根据该对象传递地将数据渲染成DOM元素

const obj = {
    tag: 'div',
    children:[
        {tag:'span', children:'hello word(render)'}
    ]
}

function Render(obj, root) {
    const el = document.createElement(obj.tag)
    // 判断子元素是否是文本格式
    if(typeof obj.children === 'string'){
        const text = document.createTextNode(obj.children)
        el.appendChild(text)
        root.appendChild(el)
        return
    }
    obj.children && obj.children.forEach(child => {
        Render(child,el)
    });
    root.appendChild(el)
}

Render(obj, document.querySelector('.render'))

// 框架设计-- 运行时 + 编译时

// 有时候手写树形结构数据很麻烦,而且不直观,能不能支持用html标签的方式描述树形结构的属性对象呢? 
// 能不能引入编译的手段, 把html 标签编译成树形结构的数据对象, 然后直接调用Render函数呢?
// 比如

const html = `
    <div>
        <span>hello word (compiler)</span>
    </div>
`
// 调用 Compiler() 编译得到树形结构的数据对象

const obj1 = Compiler(html)

function Compiler(html){
    // 省略编译过程,此处只讲解三种框架的区别
    return {
        tag: 'div',
        children:[
            {tag:'span', children:'hello word (compiler)'}
        ]
    }
}

Render(obj1, document.querySelector('.compiler'))

// 上面代码其实是 运行时编译, 意思是代码运行的时候才开始编译,而这会产生一定的性能开销
// 因此也可以在构建的时候去编译, 运行的时候就无需编译了, 这样对性能是非常友好的

// 那能不能把 html 直接 编译为命令式代码的过程呢?

// 框架设计-- 纯编译框架

const html1 = `
    <div>
        <span>hello word</span>
    </div>
`
function Svelte(html1){
    const div = document.createElement('div')
    const span = document.createElement('span')
    span.innerText = 'hello word (svelte)'
    div.appendChild(span)
    document.querySelector('.svelte').appendChild(div)
}

Svelte()

// Vue.js 3 就是一个编译时 + 运行时的框架, 它在保持灵活性的基础上,还能够通过编译手段分析用户提供的内容,从而进一步提升更新性能
// Svelte.js 本身就是一个纯编译时框架, 但是他的真实性能可能达不到理论的高度

