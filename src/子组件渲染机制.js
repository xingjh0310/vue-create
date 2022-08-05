// 渲染组件
// 实际组件的本质就是一组DOM的封装

const myComponent =  function(){
    return {
        tag:'div',
        props: {
            onClick:()=>alert('我是子组件')
        },
        children: 'click child'
    }
}

const vnode1 = {
   tag: myComponent
}

function rendererChild(vnode, container){
   if(typeof vnode.tag === 'string'){
       // 说明vnode 描述的是标签元素
       mountElement(vnode, container)
   }else if(typeof vnode.tag === 'function'){
       // 说明vnode 描述的是组件
       mountCompontent(vnode, container)
   }
}

function mountElement(vnode, container){
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

function mountCompontent(vnode, container) {
   const subtree = vnode.tab()
   //递归地调用 rendererChild 渲染 subtree
   rendererChild(subtree, container)
}

// 例如组件是对象呢? 

const myComponentObj = {
    rendere(){
        return {
            tag:'div',
            props: {
                onClick:()=>alert('我是子组件')
            },
            children: 'click child'
        }
    }
}


function rendererChildObj(vnode, container){
    if(typeof vnode.tag === 'string'){
        // 说明vnode 描述的是标签元素
        mountElement(vnode, container)
    }else if(typeof vnode.tag === 'object'){
        // 说明vnode 描述的是组件
        mountCompontentObj(vnode, container)
    }
 }

 function mountCompontentObj(){
    const subtree = vnode.tab.rendere()
    //递归地调用 rendererChild 渲染 subtree
    rendererChildObj(subtree, container)
 }

 // Vue 渲染真实Dom 是通过 编译器 + 渲染器完成的
 // 每一个 .vue文件就是一个组件
 // 其中 template 标签里的内容就是模板内容, 编译器会把模板内容编译成 渲染函数, 并添加到 script 标签块的组件对象上, 最终运行在浏览器的代码就是

 export default {
     data(){},
     methods:{},
     render(){
         return h('div',{onclick:handler},'click me')
     }
 }