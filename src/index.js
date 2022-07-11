// 参考：https://mp.weixin.qq.com/s/qdJ0Xd8zTgtetFdlJL3P1g

/**
 * promise 有 3 个状态，分别是 pending, fulfilled 和 rejected
 * 
 * 在 pending 状态，promise 可以切换到 fulfilled 或 rejected。
 * 
 * 在 fulfilled 状态，不能迁移到其它状态，必须有个不可变的 value
 * 
 * 在 rejected 状态，不能迁移到其它状态，必须有个不可变的 reason
 */
const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

function Promise(f) {
  this.status = PENDING
  this.result = null
  this.callbacks = []

  const onFulfilled = value => transition(this, FULFILLED, value)
  const onRejected = reason => transition(this, REJECTED, reason)
  
  // 保证 resolve/reject 只有一次调用作用
  let ignore = false

  const resolve = value => {
    if (ignore) return

    ignore = true


    resolvePromise(this, value, onFulfilled, onRejected)
  }

  const reject = reason => {
    if (ignore) return

    ignore = true

    onRejected(result)
  }

  try {
    f(resolve, reject)
  } catch (error) {
    reject(error)
  }
}


/**
 * 
 * - 一个 Promise 构造函数，有 state 和 result 两个属性。
 * 
 * - 当 state 为 fulfilled 时，result 作为 value 看待。
 * 
 * - 当 state 为 rejected 时，result 作为 reason 看待。
 * 
 * - 一个 transition 状态迁移函数，它只会在 state 为 pending 时，进行状态迁移。
 * 
 */
function transition(promise, state, result) {
  if (promise.state !== PENDING) {
    return
  }

  promise.state = state
  promise.result = result
  setTimeout(() => {
    () => handleCallbacks(promise.callbacks, state, result)
  }, 0);
}


/**
 * 
 * - 每调用一次注册一组回调函数
 * 
 * - then 方法必须返回 promise
 */
Promise.prototype.then = function then(onFulfilled, onRejected) {
  return new Promise((resolve, reject) => {
    const callback = {onFulfilled, onRejected, resolve, reject};

    if (this.state === PENDING) {
      this.callbacks.push(callback)
    } else {
      setTimeout(() => handleCallback(callback, this.state, this.result), 0);
    }
  });
}

function handleCallback(callback, state, result) {
  const {onFulfilled, onRejected, resolve, reject} = callback

  try {
    if (state === FULFILLED) {
      isFunction(onFulfilled) ? resolve(onFulfilled(result)) : resolve(result)
    } else if (state === REJECTED) {
      isFunction(onRejected) ? reject(onRejected(result)) : reject(result)
    }
  } catch (error) {
    reject(error)
  }
}

/**
 * 
 * 第一步，如果 result 是当前 promise 本身，就抛出 TypeError 错误。
 * 
 * 第二步，如果 result 是另一个 promise，那么沿用它的 state 和 result 状态。
 * 
 * 第三步，如果 result 是一个 thenable 对象。先取 then 函数，再 call then 函数，重新进入 The Promise Resolution Procedure 过程。
 * 
 * 最后，如果不是上述情况，这个 result 成为当前 promise 的 result。
 * 
 */
function resolvePromise(promise, result, resolve, reject) {
  if (promise === result) {
    const reason =  new TypeError('Can not fufill promise with itself')
    return reject(reason)
  }

  if (isPromise(result)) {
    return promise.then(resolve, reject)
  }

  if (isThenable(result)) {
    try {
      const then = result.then
      if (isFunction(then)) {
        return new Promise(then.bind(result)).then(resolve, reject)
      }
    } catch (error) {
      return reject(error)
    }
  }

  resolve(result)
}

function handleCallbacks(callbacks, state, result) {
  while (callbacks.length) {
    handleCallback(callbacks.shift(), state, result)
  }
}