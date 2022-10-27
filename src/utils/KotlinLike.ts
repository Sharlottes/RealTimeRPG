export abstract class KotlinLike<T> {
	let<R>(callback: (x: T) => R) {
		return callback(this as unknown as T)
	}
	apply(callback: (x: T) => void) {
		callback(this as unknown as T)
		return this
	}
}
