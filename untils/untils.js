let handleError = null

export default {
 foo(fn){
    callwithErrorHandling(fn)
 },
 bar(fn){
    callwithErrorHandling(fn)
 },
 // 用户可以调用该函数注册统一的错误处理函数
 registerErroeHandler(fn){
    handleError = fn
 }
}

function callwithErrorHandling(fn){
    try {
        fn && fn()
    } catch (e) {
        handleError(e)
    }
}