// 初识渲染器
// 渲染器的作用就是把虚拟dom 渲染为真实的DOM
// 假设我们有如下虚拟DOM

const vnode = {
    tag: 'div', //标签名
    props: { // 用来描述 div 标签的属性,事件等内容
        onClick: ()=>alert('hello')
    },
    children:'click me' // 描述标签的子节点
}
// 设计一个渲染器

function renderer(vnode, container){
    // 创建父节点标签
    const el = document.createElement(vnode.tag)
    // 遍历 props, 绑定属性, 事件 添加到 dom 元素上

    for(const key in vnode.props){
        if(/^on/.test(key)){
            // 如果是 on 开头的话, 说明它是一个事件
            el.addEventListener(
                key.substr(2).toLocaleLowerCase(), // 事件名 onClick => click
                vnode.props[key] // 事件处理函数
            )
        }
    }
    // 处理 children

    if(typeof vnode.children === 'string'){
        const text = document.createTextNode(vnode.children)
        el.appendChild(text)
    }else if(Array.isArray(vnode.children)){
        vnode.children.forEach(child => renderer(child,el))
    }

    container.appendChild(el)
}

renderer(vnode, document.body)



